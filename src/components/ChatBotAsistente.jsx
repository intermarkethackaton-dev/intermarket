import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";

const sugerencias = [
  "Productos más vendidos",
  "Tiendas mejor valoradas",
  "¿Cómo compro?",
  "Ver ofertas",
  "Categorías disponibles",
];

// El chat solo muestra texto plano, así que quitamos cualquier símbolo
// de Markdown que Gemini pueda colar (**negrita**, *cursiva*, etc.)
const limpiarMarkdown = (texto) =>
  String(texto || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "");

const ChatBotAsistente = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([
    {
      id: 1,
      de: "bot",
      texto:
        "¡Hola! Soy el asistente de InterMarket 👋\nPuedo ayudarte con productos, tiendas, ofertas y cómo comprar.",
    },
  ]);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);
  const finRef = useRef(null);
  // Guardamos siempre la última lista de mensajes en un ref, para poder
  // armar el historial que se envía a la IA sin depender de closures viejos.
  const mensajesRef = useRef(mensajes);
  useEffect(() => {
    mensajesRef.current = mensajes;
  }, [mensajes]);

  // Solo compradores / visitantes (no vendedor ni admin en panel)
  const rutasOcultas = ["/login", "/registro", "/seleccion-rol", "/suscripcion"];
  const path = (location.pathname || "").toLowerCase().replace(/\/$/, "") || "/";
  const ocultar =
    rutasOcultas.includes(path) ||
    role === "vendedor" ||
    role === "admin";

  useEffect(() => {
    if (finRef.current) {
      finRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes, pensando, abierto]);

  if (ocultar) return null;

  const agregarBot = (texto) => {
    setMensajes((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), de: "bot", texto: limpiarMarkdown(texto) },
    ]);
  };

  const agregarUsuario = (texto) => {
    setMensajes((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), de: "user", texto },
    ]);
  };

  // ---------- Consultas a Supabase ----------
  const productosMasVendidos = async () => {
    // "Más vendido" = más unidades compradas según pedidos reales
    const { data: pedidos, error } = await supabase
      .from("pedidos")
      .select("id_producto, cantidad");

    const conteo = {};
    if (!error) {
      (pedidos || []).forEach((p) => {
        if (!p.id_producto) return;
        conteo[p.id_producto] = (conteo[p.id_producto] || 0) + (Number(p.cantidad) || 0);
      });
    }

    const idsOrdenados = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    if (idsOrdenados.length === 0) {
      // Fallback: últimos productos con stock (aún no hay pedidos registrados)
      const { data } = await supabase
        .from("productos")
        .select("nombre_producto, precio_venta, stock, tiendas(nombre_tienda)")
        .gt("stock", 0)
        .order("creado_en", { ascending: false })
        .limit(5);

      if (!data?.length) return "Aún no hay suficientes datos de ventas.";

      return (
        "Todavía no hay pedidos registrados, pero estos son productos destacados del catálogo:\n\n" +
        data
          .map(
            (p, i) =>
              `${i + 1}. ${p.nombre_producto} — C$${Number(p.precio_venta || 0).toFixed(2)} (${p.tiendas?.nombre_tienda || "Tienda"})`
          )
          .join("\n")
      );
    }

    const { data: productos } = await supabase
      .from("productos")
      .select("id_producto, nombre_producto, precio_venta, tiendas(nombre_tienda)")
      .in("id_producto", idsOrdenados);

    const mapa = Object.fromEntries(
      (productos || []).map((p) => [p.id_producto, p])
    );

    return (
      "🔥 Productos más comprados:\n\n" +
      idsOrdenados
        .map((id, i) => {
          const p = mapa[id];
          if (!p) return null;
          return `${i + 1}. ${p.nombre_producto} — C$${Number(p.precio_venta || 0).toFixed(2)} · ${p.tiendas?.nombre_tienda || "Tienda"} · ${conteo[id]} unidades vendidas`;
        })
        .filter(Boolean)
        .join("\n")
    );
  };

  const tiendasMejorValoradas = async () => {
    const { data } = await supabase
      .from("calificaciones_tiendas")
      .select("tienda_id, puntuacion");

    if (!data?.length) {
      const { data: tiendas } = await supabase
        .from("tiendas")
        .select("nombre_tienda")
        .order("creado_en", { ascending: false })
        .limit(5);

      if (!tiendas?.length) return "Todavía no hay tiendas registradas.";

      return (
        "Tiendas recientes en InterMarket:\n\n" +
        tiendas.map((t, i) => `${i + 1}. ${t.nombre_tienda}`).join("\n")
      );
    }

    const porTienda = {};
    data.forEach((c) => {
      if (!c.tienda_id) return;
      if (!porTienda[c.tienda_id]) porTienda[c.tienda_id] = [];
      porTienda[c.tienda_id].push(Number(c.puntuacion) || 0);
    });

    const ranking = Object.entries(porTienda)
      .map(([id, arr]) => ({
        id,
        promedio: arr.reduce((a, b) => a + b, 0) / arr.length,
        total: arr.length,
      }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 5);

    const ids = ranking.map((r) => r.id);
    const { data: tiendas } = await supabase
      .from("tiendas")
      .select("id_tienda, nombre_tienda")
      .in("id_tienda", ids);

    const nombres = Object.fromEntries(
      (tiendas || []).map((t) => [t.id_tienda, t.nombre_tienda])
    );

    return (
      "⭐ Tiendas con mejor promedio:\n\n" +
      ranking
        .map(
          (r, i) =>
            `${i + 1}. ${nombres[r.id] || "Tienda"} — ${r.promedio.toFixed(1)}/5 (${r.total} opiniones)`
        )
        .join("\n")
    );
  };

  const listarCategorias = async () => {
    const { data } = await supabase
      .from("categorias")
      .select("nombre_categoria")
      .order("nombre_categoria");

    if (!data?.length) return "No hay categorías todavía.";

    return (
      "📂 Categorías disponibles:\n\n" +
      data.map((c) => `• ${c.nombre_categoria}`).join("\n") +
      "\n\nPuedes filtrarlas en el Catálogo."
    );
  };

  const contarOfertas = async () => {
    const { data, count } = await supabase
      .from("productos")
      .select("nombre_producto, precio_venta, precio_original", {
        count: "exact",
      })
      .not("precio_original", "is", null)
      .gt("precio_original", 0)
      .limit(5);

    const total = count ?? data?.length ?? 0;
    if (!total) return "Ahora mismo no hay ofertas activas. ¡Vuelve pronto!";

    const lista = (data || [])
      .map(
        (p) =>
          `• ${p.nombre_producto}: C$${Number(p.precio_venta).toFixed(2)} (antes C$${Number(p.precio_original).toFixed(2)})`
      )
      .join("\n");

    return `🏷️ Hay ${total} productos en oferta.\n\nAlgunos:\n${lista}\n\nVe al Catálogo y toca “Ver ofertas”.`;
  };

  // ---------- Fallback inteligente vía Gemini (Edge Function) ----------
  // La API key de Gemini vive solo en el servidor (secreto de la Edge
  // Function), nunca en el bundle del cliente.
 const preguntarIA = async (pregunta) => {
  try {
    const historialReciente = mensajesRef.current
      .slice(-6)
      .map(({ de, texto }) => ({ de, texto }));

    const { data, error } = await supabase.functions.invoke("chat-assistant", {
      body: {
        pregunta,
        historial: historialReciente,
      },
    });

    // Mostrar el error completo en la consola
    if (error) {
      console.error("ERROR EDGE FUNCTION:", error);

      // supabase.functions.invoke() no expone el JSON que devolvimos desde
      // el servidor en `error`; hay que leerlo de error.context (la
      // respuesta HTTP real) para obtener nuestro mensaje amigable.
      let detalle = null;
      try {
        if (error?.context && typeof error.context.json === "function") {
          detalle = await error.context.json();
        }
      } catch (_) {
        // Si no se puede leer el cuerpo, seguimos con el mensaje genérico
      }

      throw new Error(
        detalle?.error ||
          "No pude comunicarme con el asistente. Intenta de nuevo en unos segundos."
      );
    }

    console.log("RESPUESTA EDGE FUNCTION:", data);

    if (data?.error) {
      console.error("ERROR SERVIDOR:", data.error);
      throw new Error(data.error);
    }

    return data.respuesta;
  } catch (err) {
    console.error("ERROR COMPLETO:", err);
    return err.message || "No pude procesar tu pregunta en este momento. Intenta de nuevo en unos segundos.";
  }
};

  const responder = async (textoUsuario) => {
    const t = textoUsuario.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

    // Navegación rápida
    if (/(catalogo|productos|comprar|tienda virtual)/.test(t) && /(ir|abrir|ver|donde)/.test(t)) {
      navigate("/catalogo");
      return "Te llevo al catálogo 🛍️";
    }
    if (/oferta|descuento|rebaja/.test(t)) {
      navigate("/catalogo");
      return await contarOfertas();
    }
    if (/perfil|mi cuenta/.test(t)) {
      if (!user) return "Inicia sesión para ver tu perfil.";
      navigate("/perfil");
      return "Abriendo tu perfil…";
    }
    if (/mensaje|chat con vendedor|contactar/.test(t)) {
      navigate("/mensajes");
      return "Ahí puedes escribir a los vendedores.";
    }

    // Datos
    if (/mas vendido|popular|top producto|mejor producto|productos mas/.test(t)) {
      return await productosMasVendidos();
    }
    if (/mejor tienda|tienda.*valor|promedio|reputacion|ranking tienda|tiendas con mejor/.test(t)) {
      return await tiendasMejorValoradas();
    }
    if (/categoria|categorias/.test(t)) {
      return await listarCategorias();
    }
    if (/como compro|como comprar|pasos|carrito|pagar/.test(t)) {
      return (
        "🛒 Cómo comprar en InterMarket:\n\n" +
        "1. Entra al Catálogo\n" +
        "2. Elige un producto y revisa tallas/colores\n" +
        "3. Añádelo al carrito\n" +
        "4. Confirma el pedido desde el carrito\n\n" +
        "También puedes escanear el QR de un producto para abrirlo directo."
      );
    }
    if (/vendedor|vender|abrir tienda/.test(t)) {
      return (
        "Si quieres vender, ve a Suscripción y activa el plan (el primer mes puede ser gratis). " +
        "Luego crea tu tienda en “Mis Tiendas” y publica productos."
      );
    }
    if (/hola|buenas|hey|ayuda|help/.test(t)) {
      return (
        "¡Hola! Puedo decirte:\n" +
        "• Productos más populares\n" +
        "• Tiendas mejor valoradas\n" +
        "• Ofertas y categorías\n" +
        "• Cómo comprar\n\n" +
        "Escribe tu pregunta o toca una sugerencia."
      );
    }

    // Cualquier otra pregunta: la responde Gemini con contexto real
    // de la plataforma, en vez de un mensaje fijo de "no entendí".
    return await preguntarIA(textoUsuario);
  };

  const enviar = async (textoLibre) => {
    const texto = (textoLibre ?? entrada).trim();
    if (!texto || pensando) return;

    setEntrada("");
    agregarUsuario(texto);
    setPensando(true);

    try {
      const respuesta = await responder(texto);
      agregarBot(respuesta);
    } catch (err) {
      console.error(err);
      agregarBot("Hubo un problema al consultar los datos. Intenta de nuevo.");
    } finally {
      setPensando(false);
    }
  };

  return (
    <>
      {/* Burbuja flotante */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Asistente InterMarket"
        style={{
          position: "fixed",
          bottom: 88,
          right: 20,
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #0d5c63, #14b8a6)",
          color: "#fff",
          boxShadow: "0 6px 20px rgba(13, 92, 99, 0.4)",
          zIndex: 1050,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
        }}
      >
        <i className={`bi ${abierto ? "bi-x-lg" : "bi-robot"}`} />
      </button>

      {/* Panel */}
      {abierto && (
        <div
          style={{
            position: "fixed",
            bottom: 156,
            right: 16,
            width: "min(360px, calc(100vw - 32px))",
            height: 460,
            maxHeight: "70vh",
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
            zIndex: 1050,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #0d5c63, #14919b)",
              color: "#fff",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="bi bi-robot" />
            </div>
            <div className="flex-grow-1">
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                Asistente InterMarket
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.85 }}>
                Productos · Tiendas · Ayuda
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              background: "#f0f7fa",
            }}
          >
            {mensajes.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: m.de === "user" ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "10px 12px",
                    borderRadius: m.de === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: m.de === "user" ? "#0d5c63" : "#fff",
                    color: m.de === "user" ? "#fff" : "#0f172a",
                    fontSize: "0.88rem",
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  {m.texto}
                </div>
              </div>
            ))}

            {pensando && (
              <div className="d-flex align-items-center gap-2 text-muted small mb-2">
                <Spinner animation="border" size="sm" style={{ color: "#0d5c63" }} />
                Buscando información…
              </div>
            )}
            <div ref={finRef} />
          </div>

          {/* Sugerencias */}
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              padding: "8px 10px",
              borderTop: "1px solid #e2e8f0",
              background: "#fff",
            }}
          >
            {sugerencias.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                disabled={pensando}
                style={{
                  flex: "0 0 auto",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  borderRadius: 20,
                  padding: "5px 10px",
                  fontSize: "0.72rem",
                  color: "#0d5c63",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
            style={{
              display: "flex",
              gap: 8,
              padding: "10px 12px",
              borderTop: "1px solid #e2e8f0",
              background: "#fff",
            }}
          >
            <input
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Escribe tu pregunta…"
              disabled={pensando}
              style={{
                flex: 1,
                border: "1px solid #e2e8f0",
                borderRadius: 24,
                padding: "10px 14px",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={pensando || !entrada.trim()}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "none",
                background: "#0d5c63",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="bi bi-send-fill" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatBotAsistente;