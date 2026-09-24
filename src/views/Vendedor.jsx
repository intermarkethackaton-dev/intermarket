import React, { useState, useEffect } from "react";
import { Spinner, Button } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import ModalSuscripcionVendedor from "../components/vendedor/ModalSuscripcionVendedor";

const Vendedor = () => {
  const { user, changeRole } = useAuth();
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState([]);
  const [miPerfilId, setMiPerfilId] = useState(null);
  const [tiendas, setTiendas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [stats, setStats] = useState({ ventaMes: 0, pedidos: 0, productos: 0 });

  // Suscripción
  const [suscripcion, setSuscripcion] = useState(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const cargarDatos = async () => {
    if (!user) return;
    try {
      setCargando(true);

      const [perfilRes, subRes, tiendasRes] = await Promise.all([
        supabase
          .from("perfiles")
          .select("perfil_id, id_tienda, usuarios(username, email)")
          .eq("id_usuario", user.id)
          .maybeSingle(),
        supabase
          .from("suscripciones")
          .select("*")
          .eq("id_usuario", user.id)
          .eq("estado", "activo")
          .maybeSingle(),
        supabase
          .from("tiendas")
          .select("id_tienda, nombre_tienda, imagen_url")
          .eq("id_usuario", user.id)
          .order("creado_en", { ascending: true }),
      ]);

      const perfil = perfilRes.data;
      setSuscripcion(subRes.data);

      const listaTiendas = tiendasRes.data || [];
      setTiendas(listaTiendas);

      const nombre =
        perfil?.usuarios?.username ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Usuario";
      setNombreUsuario(nombre);

      if (listaTiendas.length === 0) {
        setPedidos([]);
        setCargando(false);
        return;
      }

      setMiPerfilId(perfil?.perfil_id || null);

      const idsTiendas = listaTiendas.map((t) => t.id_tienda);

      // Productos totales (todas las tiendas)
      const { count: numProductos } = await supabase
        .from("productos")
        .select("id_producto", { count: "exact", head: true })
        .in("id_tienda", idsTiendas);

      // Pedidos de todas las tiendas
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id_pedido,
          creado_en,
          precio_unitario,
          id_estado,
          id_producto,
          id_tienda,
          cantidad,
          talla_seleccionada,
          color_seleccionado,
          productos!inner (
            nombre_producto,
            imagen_url,
            id_tienda
          ),
          tiendas (
            id_tienda,
            nombre_tienda
          ),
          perfiles ( usuarios ( username ) )
        `)
        .in("id_tienda", idsTiendas)
        .order("creado_en", { ascending: false });

      if (error) throw error;

      const listaPedidos = data || [];
      setPedidos(listaPedidos);

      // Venta del mes (estados 2, 4 y 5)
      const ahora = new Date();
      const mesActual = ahora.getMonth();
      const anioActual = ahora.getFullYear();

      const ventaMes = listaPedidos
        .filter((p) => {
          const fecha = new Date(p.creado_en);
          const esMes =
            fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
          const esVendido =
            p.id_estado === 2 || p.id_estado === 4 || p.id_estado === 5;
          return esMes && esVendido;
        })
        .reduce((acc, p) => {
          return acc + Number(p.precio_unitario || 0) * Number(p.cantidad || 1);
        }, 0);

      setStats({
        ventaMes,
        pedidos: listaPedidos.length,
        productos: numProductos || 0,
      });
    } catch (err) {
      console.error("Error al cargar datos:", err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();

    if (user) {
      const channel = supabase
        .channel("schema-db-changes-vendedor")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedidos" },
          () => cargarDatos()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const terminarSuscripcion = async () => {
    if (!suscripcion) return;
    setCancelando(true);
    try {
      const { error: subError } = await supabase
        .from("suscripciones")
        .update({ estado: "cancelado" })
        .eq("id_suscripcion", suscripcion.id_suscripcion);
      if (subError) throw subError;

      const { error: roleError } = await supabase
        .from("usuarios")
        .update({ rol: "comprador" })
        .eq("id_usuario", user.id);
      if (roleError) throw roleError;

      changeRole("comprador");
      navigate("/seleccion-rol");
    } catch (err) {
      console.error("Error al cancelar suscripción:", err);
      alert("No se pudo cancelar la suscripción. Intenta de nuevo.");
    } finally {
      setCancelando(false);
      setShowSubModal(false);
    }
  };

  const cambiarEstadoPedido = async (id_pedido, nuevoEstadoId) => {
    try {
      const pedido = pedidos.find((p) => p.id_pedido === id_pedido);

      if (nuevoEstadoId === 2 && pedido && pedido.id_estado === 1) {
        const { data: producto } = await supabase
          .from("productos")
          .select("stock, nombre_producto")
          .eq("id_producto", pedido.id_producto)
          .single();

        if (producto && producto.stock !== null) {
          const cantidad = Number(pedido.cantidad || 1);
          const nuevoStock = Math.max(0, Number(producto.stock) - cantidad);

          await supabase
            .from("productos")
            .update({ stock: nuevoStock })
            .eq("id_producto", pedido.id_producto);

          if (nuevoStock <= 5 && miPerfilId) {
            await supabase.from("notificaciones").insert([
              {
                perfil_id: miPerfilId,
                titulo: "⚠️ ¡Stock Bajo!",
                mensaje: `El producto "${producto.nombre_producto}" tiene solo ${nuevoStock} unidades disponibles.`,
              },
            ]);
          }
        }
      }

      const { error } = await supabase
        .from("pedidos")
        .update({ id_estado: nuevoEstadoId })
        .eq("id_pedido", id_pedido);

      if (error) throw error;
      cargarDatos();
    } catch (error) {
      console.error("Error en cambiarEstadoPedido:", error);
      alert("Error al actualizar pedido");
    }
  };

  const getImagenProducto = (pedido) => {
    const img = pedido.productos?.imagen_url;
    if (Array.isArray(img) && img.length > 0) return img[0];
    if (typeof img === "string" && img) return img;
    return null;
  };

  const getEstadoTexto = (id_estado) => {
    switch (id_estado) {
      case 1: return "Pendiente";
      case 2: return "Pagado";
      case 3: return "Cancelado";
      case 4: return "Entregado";
      case 5: return "En camino";
      default: return "Desconocido";
    }
  };

  const getEstadoColor = (id_estado) => {
    switch (id_estado) {
      case 1: return "#f59e0b";
      case 2: return "#22c55e";
      case 3: return "#ef4444";
      case 4: return "#3b82f6";
      case 5: return "#8b5cf6";
      default: return "#94a3b8";
    }
  };

  if (cargando) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "60vh", backgroundColor: "#f0f7fa" }}
      >
        <Spinner animation="border" style={{ color: "#0d5c63" }} />
      </div>
    );
  }

  if (tiendas.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "#f0f7fa",
          minHeight: "100vh",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 20,
            padding: "40px 24px",
            maxWidth: 360,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: "#e8f4f8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <i className="bi bi-shop" style={{ fontSize: "1.8rem", color: "#0d5c63" }} />
          </div>
          <h3 style={{ fontWeight: 700, color: "#0f172a", fontSize: "1.2rem" }}>
            Aún no tienes una tienda
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            Configura tu tienda para empezar a vender.
          </p>
          <button
            onClick={() => navigate("/tiendas")}
            style={{
              backgroundColor: "#0d5c63",
              color: "white",
              border: "none",
              borderRadius: 50,
              padding: "12px 28px",
              fontWeight: 600,
              marginTop: 8,
            }}
          >
            Configurar mi Tienda
          </button>
        </div>
      </div>
    );
  }

  const pedidosRecientes = pedidos.slice(0, 5);

  return (
    <div
      style={{
        backgroundColor: "#f0f7fa",
        minHeight: "100vh",
        paddingBottom: "100px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ========== SALUDO + PLAN ========== */}
      <div className="px-4 pt-4 pb-2 d-flex justify-content-between align-items-start">
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "#0d5c63",
            margin: 0,
          }}
        >
          ¡Hola! {nombreUsuario}
        </h1>

        {suscripcion && (
          <button
            onClick={() => setShowSubModal(true)}
            style={{
              backgroundColor: "#e8f4f8",
              color: "#0d5c63",
              border: "none",
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: "0.8rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <i className="bi bi-gem" />
            Mi Plan
          </button>
        )}
      </div>

      {/* ========== STATS ========== */}
      <div className="px-4 mt-3">
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 18,
            padding: "18px 12px",
            display: "flex",
            justifyContent: "space-around",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "1.15rem", color: "#0f172a" }}>
              C${" "}
              {stats.ventaMes.toLocaleString("es-NI", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
              Venta del mes
            </div>
          </div>

          <div style={{ width: 1, backgroundColor: "#e2e8f0" }} />

          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "1.15rem", color: "#0f172a" }}>
              {stats.pedidos}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
              Pedidos
            </div>
          </div>

          <div style={{ width: 1, backgroundColor: "#e2e8f0" }} />

          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "1.15rem", color: "#0f172a" }}>
              {stats.productos}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
              Productos
            </div>
          </div>
        </div>
      </div>

      {/* ========== BOTONES ESTADÍSTICAS / MENSAJES ========== */}
      <div className="px-4 mt-3 d-flex gap-2">
        <button
          onClick={() => navigate("/dasboard-admin")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: "white",
            border: "none",
            borderRadius: 14,
            padding: "12px 16px",
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "#0d5c63",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          <i className="bi bi-bar-chart-line" style={{ fontSize: "1.1rem" }} />
          Estadisticas
        </button>

        <button
          onClick={() => navigate("/mensajes")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: "white",
            border: "none",
            borderRadius: 14,
            padding: "12px 16px",
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "#0d5c63",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          <i className="bi bi-chat-dots" style={{ fontSize: "1.1rem" }} />
          Mensajes
        </button>
      </div>

      {/* ========== PEDIDOS RECIENTES ========== */}
      <div className="px-4 mt-4">
        <h6
          style={{
            fontWeight: 600,
            color: "#64748b",
            fontSize: "0.9rem",
            marginBottom: 12,
          }}
        >
          Pedidos recientes
        </h6>

        {pedidosRecientes.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: "32px 20px",
              textAlign: "center",
            }}
          >
            <i className="bi bi-box-seam" style={{ fontSize: "2rem", color: "#cbd5e1" }} />
            <p style={{ color: "#94a3b8", marginTop: 8, marginBottom: 0, fontSize: "0.9rem" }}>
              Aún no tienes pedidos
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {pedidosRecientes.map((pedido) => {
              const img = getImagenProducto(pedido);
              const total =
                Number(pedido.precio_unitario || 0) * Number(pedido.cantidad || 1);
              const idCorto = String(pedido.id_pedido).replace(/-/g, "").slice(0, 4);
              const nombreTienda = pedido.tiendas?.nombre_tienda;

              return (
                <div
                  key={pedido.id_pedido}
                  style={{
                    backgroundColor: "white",
                    borderRadius: 16,
                    padding: "12px 14px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    {/* Imagen */}
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        backgroundColor: "#f1f5f9",
                        overflow: "hidden",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <i className="bi bi-image" style={{ fontSize: "1.4rem", color: "#cbd5e1" }} />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          color: "#0f172a",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {pedido.productos?.nombre_producto || "Producto"}
                      </div>

                      {/* Tienda solo si tiene más de 1 */}
                      {tiendas.length > 1 && nombreTienda && (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "#0d5c63",
                            fontWeight: 600,
                            marginTop: 2,
                          }}
                        >
                          <i className="bi bi-shop me-1"></i>
                          {nombreTienda}
                        </div>
                      )}

                      <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 2 }}>
                        Pedido #{idCorto}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: getEstadoColor(pedido.id_estado),
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        {getEstadoTexto(pedido.id_estado)}
                      </div>
                    </div>

                    {/* Precio */}
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: "#0d5c63",
                        flexShrink: 0,
                      }}
                    >
                      C${" "}
                      {total.toLocaleString("es-NI", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  {/* Acciones rápidas de estado (solo si está pendiente) */}
                  {pedido.id_estado === 1 && (
                    <div className="d-flex gap-2 mt-2 pt-2" style={{ borderTop: "1px solid #f1f5f9" }}>
                      <button
                        onClick={() => cambiarEstadoPedido(pedido.id_pedido, 2)}
                        style={{
                          flex: 1,
                          border: "none",
                          borderRadius: 10,
                          padding: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          backgroundColor: "#dcfce7",
                          color: "#16a34a",
                        }}
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => cambiarEstadoPedido(pedido.id_pedido, 3)}
                        style={{
                          flex: 1,
                          border: "none",
                          borderRadius: 10,
                          padding: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                        }}
                      >
                        Rechazar
                      </button>
                    </div>
                  )}

                  {pedido.id_estado === 2 && (
                    <div className="mt-2 pt-2" style={{ borderTop: "1px solid #f1f5f9" }}>
                      <button
                        onClick={() => cambiarEstadoPedido(pedido.id_pedido, 4)}
                        style={{
                          width: "100%",
                          border: "none",
                          borderRadius: 10,
                          padding: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          backgroundColor: "#dbeafe",
                          color: "#2563eb",
                        }}
                      >
                        Marcar como entregado
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pedidos.length > 5 && (
          <button
            onClick={() => navigate("/pedidos-vendedor")}
            style={{
              width: "100%",
              marginTop: 12,
              border: "none",
              backgroundColor: "transparent",
              color: "#0d5c63",
              fontWeight: 600,
              fontSize: "0.9rem",
              padding: "10px",
            }}
          >
            Ver todos los pedidos ({pedidos.length})
          </button>
        )}
      </div>

      {/* Modal suscripción */}
      <ModalSuscripcionVendedor
        show={showSubModal}
        onHide={() => setShowSubModal(false)}
        suscripcion={suscripcion}
        cancelando={cancelando}
        onTerminar={terminarSuscripcion}
      />
    </div>
  );
};

export default Vendedor;