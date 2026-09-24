// src/views/MisPedidos.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../database/supabaseconfig";
import {
  obtenerMiPerfilCompleto,
  obtenerPedidosComprador,
} from "../services/pedidosService";
import TarjetaPedidoComprador from "../components/pedidos/TarjetaPedidoComprador";


const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "pendientes", label: "Pendientes", estado: 1 },
  { id: "activos", label: "En camino", estado: 5 },
  { id: "entregados", label: "Entregados", estado: 4 },
];

const MisPedidos = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [grupos, setGrupos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [error, setError] = useState(null);

  const cargar = async () => {
    if (!user?.id) return;
    try {
      setCargando(true);
      setError(null);

      const perfil = await obtenerMiPerfilCompleto(user.id);
      if (!perfil?.perfil_id) {
        setGrupos([]);
        return;
      }

      const data = await obtenerPedidosComprador(perfil.perfil_id);
      setGrupos(data);
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      setError("No pudimos cargar tus pedidos. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();

    // Realtime: escuchar cambios en pedidos
    const channel = supabase
      .channel("mis-pedidos-comprador")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => cargar()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const gruposFiltrados = useMemo(() => {
    if (filtro === "todos") return grupos;
    const f = FILTROS.find((x) => x.id === filtro);
    if (!f?.estado) return grupos;
    return grupos.filter((g) => g.estadoGlobal === f.estado);
  }, [grupos, filtro]);

  return (
    <div className="mp-page">
      <div className="mp-container">
        {/* HEADER */}
        <div className="mp-header">
          <button
            type="button"
            className="mp-back"
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h1>Mis Pedidos</h1>
            <p>Sigue el estado de tus compras en tiempo real</p>
          </div>
        </div>

        {/* FILTROS */}
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

        {/* CONTENIDO */}
        {cargando ? (
          <div className="mp-loading">
            <Spinner animation="border" style={{ color: "#10454F" }} />
            <span>Cargando pedidos...</span>
          </div>
        ) : error ? (
          <div className="mp-empty">
            <i className="bi bi-exclamation-triangle"></i>
            <h3>Algo salió mal</h3>
            <p>{error}</p>
            <button type="button" className="mp-btn" onClick={cargar}>
              Reintentar
            </button>
          </div>
        ) : gruposFiltrados.length === 0 ? (
          <div className="mp-empty">
            <i className="bi bi-bag-x"></i>
            <h3>No tienes pedidos aquí</h3>
            <p>
              {filtro === "todos"
                ? "Cuando hagas tu primera compra aparecerá en esta sección."
                : "Prueba con otro filtro para ver más pedidos."}
            </p>
            {filtro === "todos" && (
              <button
                type="button"
                className="mp-btn"
                onClick={() => navigate("/catalogo")}
              >
                Explorar catálogo
              </button>
            )}
          </div>
        ) : (
          <div className="mp-lista">
            {gruposFiltrados.map((grupo) => (
              <TarjetaPedidoComprador key={grupo.venta_id} grupo={grupo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MisPedidos;