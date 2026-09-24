// src/views/PedidosVendedor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../database/supabaseconfig";
import {
  obtenerTiendasDelVendedor,
  obtenerPedidosVendedor,
  actualizarEstadoPedido,
  contarPorEstado,
} from "../services/pedidosService";
import TarjetaPedidoVendedor from "../components/vendedor/TarjetaPedidoVendedor";
import ModalEstimadoEnvio from "../components/vendedor/ModalEstimadoEnvio";


const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "pendientes", label: "Pendientes", estado: 1 },
  { id: "aceptados", label: "Aceptados", estado: 2 },
  { id: "enCamino", label: "En camino", estado: 5 },
  { id: "entregados", label: "Entregados", estado: 4 },
];

const PedidosVendedor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [pedidos, setPedidos] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [tiendaFiltro, setTiendaFiltro] = useState("todas");
  const [pedidoEstimado, setPedidoEstimado] = useState(null);

  const cargar = async () => {
    if (!user?.id) return;
    try {
      setCargando(true);

      const misTiendas = await obtenerTiendasDelVendedor(user.id);
      setTiendas(misTiendas);

      if (misTiendas.length === 0) {
        setPedidos([]);
        return;
      }

      const idsTiendas = misTiendas.map((t) => t.id_tienda);
      const data = await obtenerPedidosVendedor(idsTiendas);
      setPedidos(data);
    } catch (err) {
      console.error("Error cargando pedidos vendedor:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();

    const channel = supabase
      .channel("pedidos-vendedor-view")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => cargar()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Stats aplican sobre TODOS los pedidos (sin filtro de tienda)
  const stats = useMemo(() => contarPorEstado(pedidos), [pedidos]);

  // Pedidos filtrados por tienda + estado
  const pedidosFiltrados = useMemo(() => {
    let lista = pedidos;

    // Filtro por tienda
    if (tiendaFiltro !== "todas") {
      lista = lista.filter((p) => p.id_tienda === tiendaFiltro);
    }

    // Filtro por estado (COLUMNA NUEVA)
    if (filtro !== "todos") {
      const f = FILTROS.find((x) => x.id === filtro);
      if (f?.estado) {
        lista = lista.filter((p) => p.id_estado_pedido === f.estado);
      }
    }

    return lista;
  }, [pedidos, filtro, tiendaFiltro]);

  const conteosPorTienda = useMemo(() => {
    const mapa = {};
    tiendas.forEach((t) => {
      mapa[t.id_tienda] = pedidos.filter((p) => p.id_tienda === t.id_tienda).length;
    });
    return mapa;
  }, [pedidos, tiendas]);

  const handleAceptar = async (pedido) => {
    try {
      await actualizarEstadoPedido(pedido.id_pedido, 2);
      cargar();
    } catch (err) {
      console.error(err);
      alert("No se pudo aceptar el pedido.");
    }
  };

  const handleRechazar = async (pedido) => {
    if (!window.confirm("¿Seguro que deseas rechazar este pedido?")) return;
    try {
      await actualizarEstadoPedido(pedido.id_pedido, 3);
      cargar();
    } catch (err) {
      console.error(err);
      alert("No se pudo rechazar el pedido.");
    }
  };

  const handleMarcarEntregado = async (pedido) => {
    try {
      await actualizarEstadoPedido(pedido.id_pedido, 4);
      cargar();
    } catch (err) {
      console.error(err);
      alert("No se pudo marcar como entregado.");
    }
  };

  if (cargando) {
    return (
      <div className="mp-page">
        <div className="mp-loading">
          <Spinner animation="border" style={{ color: "#10454F" }} />
          <span>Cargando pedidos...</span>
        </div>
      </div>
    );
  }

  if (tiendas.length === 0) {
    return (
      <div className="mp-page">
        <div className="mp-empty">
          <i className="bi bi-shop"></i>
          <h3>Aún no tienes tiendas</h3>
          <p>Configura tu primera tienda para empezar a recibir pedidos.</p>
          <button
            type="button"
            className="mp-btn"
            onClick={() => navigate("/tiendas")}
          >
            Configurar mi Tienda
          </button>
        </div>
      </div>
    );
  }

  const mostrarBadgeTienda = tiendaFiltro === "todas" && tiendas.length > 1;

  return (
    <div className="mp-page">
      <div className="mp-container">
        {/* HEADER */}
        <div className="mp-header">
          <button
            type="button"
            className="mp-back"
            onClick={() => navigate("/vendedor")}
            aria-label="Volver"
          >
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h1>Pedidos de mis tiendas</h1>
            <p>Gestiona y da seguimiento a cada pedido</p>
          </div>
        </div>

        {/* STATS RÁPIDAS (globales) */}
        <div className="mp-stats">
          <div className="mp-stat">
            <strong>{stats.pendientes}</strong>
            <span>Pendientes</span>
          </div>
          <div className="mp-stat">
            <strong>{stats.aceptados}</strong>
            <span>Aceptados</span>
          </div>
          <div className="mp-stat">
            <strong>{stats.enCamino}</strong>
            <span>En camino</span>
          </div>
          <div className="mp-stat">
            <strong>{stats.entregados}</strong>
            <span>Entregados</span>
          </div>
        </div>

        {/* PESTAÑAS POR TIENDA */}
        {tiendas.length > 1 && (
          <div className="mp-tiendas-tabs">
            <button
              type="button"
              className={`mp-tienda-tab ${tiendaFiltro === "todas" ? "activo" : ""}`}
              onClick={() => setTiendaFiltro("todas")}
            >
              <i className="bi bi-shop-window"></i>
              <span>Todas</span>
              <small>{pedidos.length}</small>
            </button>

            {tiendas.map((t) => (
              <button
                key={t.id_tienda}
                type="button"
                className={`mp-tienda-tab ${
                  tiendaFiltro === t.id_tienda ? "activo" : ""
                }`}
                onClick={() => setTiendaFiltro(t.id_tienda)}
              >
                <i className="bi bi-shop"></i>
                <span>{t.nombre_tienda}</span>
                <small>{conteosPorTienda[t.id_tienda] || 0}</small>
              </button>
            ))}
          </div>
        )}

        {/* FILTROS DE ESTADO */}
        <div className="mp-filtros">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`mp-filtro ${filtro === f.id ? "activo" : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* LISTA */}
        {pedidosFiltrados.length === 0 ? (
          <div className="mp-empty">
            <i className="bi bi-inbox"></i>
            <h3>No hay pedidos aquí</h3>
            <p>
              {tiendaFiltro === "todas"
                ? "Cuando recibas pedidos en esta categoría los verás aquí."
                : "Esta tienda no tiene pedidos con este filtro."}
            </p>
          </div>
        ) : (
          <div className="mp-lista">
            {pedidosFiltrados.map((p) => (
              <TarjetaPedidoVendedor
                key={p.id_pedido}
                pedido={p}
                mostrarTienda={mostrarBadgeTienda}
                onAceptar={handleAceptar}
                onRechazar={handleRechazar}
                onPonerEstimado={(pedido) => setPedidoEstimado(pedido)}
                onMarcarEntregado={handleMarcarEntregado}
              />
            ))}
          </div>
        )}
      </div>

      <ModalEstimadoEnvio
        mostrar={!!pedidoEstimado}
        onHide={() => setPedidoEstimado(null)}
        pedido={pedidoEstimado}
        onGuardado={cargar}
      />
    </div>
  );
};

export default PedidosVendedor;