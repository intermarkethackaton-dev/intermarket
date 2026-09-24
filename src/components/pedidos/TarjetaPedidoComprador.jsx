// src/components/pedidos/TarjetaPedidoComprador.jsx
import React, { useState } from "react";
import TimelinePedido from "./TimelinePedido";
import SimulacionEntrega from "./SimulacionEntrega";
import {
  idCorto,
  formatearMonto,
  formatearFechaCorta,
  NOMBRE_ESTADO,
  COLOR_ESTADO,
} from "../../utils/seguimiento";

const TarjetaPedidoComprador = ({ grupo }) => {
  const [expandida, setExpandida] = useState(false);

  const total = grupo.items.reduce(
    (acc, item) =>
      acc + Number(item.precio_unitario || 0) * Number(item.cantidad || 1),
    0
  );

  const cantidadTotal = grupo.items.reduce(
    (acc, item) => acc + Number(item.cantidad || 1),
    0
  );

  const primerProducto = grupo.items[0]?.productos;
  const imagen = primerProducto?.imagen_url?.[0];
  const nombreTienda = grupo.tienda?.nombre_tienda || "Tienda";

  const estimadoPedido = {
    ...grupo.estimado,
    id_estado: grupo.estadoGlobal,
  };

  return (
    <div className="tpc-card">
      {/* HEADER */}
      <div className="tpc-header">
        <div className="tpc-header-top">
          <div className="tpc-id">
            <i className="bi bi-receipt"></i>
            <span>Pedido #{idCorto(grupo.venta_id)}</span>
          </div>
          <span
            className="tpc-estado-badge"
            style={{
              backgroundColor: `${COLOR_ESTADO[grupo.estadoGlobal]}20`,
              color: COLOR_ESTADO[grupo.estadoGlobal],
            }}
          >
            {NOMBRE_ESTADO[grupo.estadoGlobal]}
          </span>
        </div>

        <div className="tpc-meta">
          <span>
            <i className="bi bi-calendar3"></i>
            {formatearFechaCorta(grupo.creado_en)}
          </span>
          <span>
            <i className="bi bi-bag"></i>
            {cantidadTotal} {cantidadTotal === 1 ? "artículo" : "artículos"}
          </span>
          <span>
            <i className="bi bi-shop"></i>
            {nombreTienda}
          </span>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="tpc-timeline-wrap">
        <TimelinePedido idEstado={grupo.estadoGlobal} />
      </div>

      {/* SIMULACIÓN */}
      <SimulacionEntrega pedido={estimadoPedido} />

      {/* PRODUCTOS (colapsable) */}
      <button
        type="button"
        className="tpc-toggle"
        onClick={() => setExpandida((v) => !v)}
        aria-expanded={expandida}
      >
        <span>
          <i className="bi bi-box-seam"></i>
          {expandida ? "Ocultar productos" : "Ver productos"}
        </span>
        <i className={`bi bi-chevron-${expandida ? "up" : "down"}`}></i>
      </button>

      {expandida && (
        <div className="tpc-items">
          {grupo.items.map((item) => {
            const img = item.productos?.imagen_url?.[0];
            const subtotal =
              Number(item.precio_unitario || 0) * Number(item.cantidad || 1);

            return (
              <div key={item.id_pedido} className="tpc-item">
                <div className="tpc-item-img">
                  {img ? (
                    <img src={img} alt="" />
                  ) : (
                    <i className="bi bi-image"></i>
                  )}
                </div>
                <div className="tpc-item-info">
                  <strong>{item.productos?.nombre_producto || "Producto"}</strong>
                  <div className="tpc-item-variantes">
                    {item.talla_seleccionada && (
                      <span>Talla: {item.talla_seleccionada}</span>
                    )}
                    {item.color_seleccionado && (
                      <span>Color: {item.color_seleccionado}</span>
                    )}
                    <span>x{item.cantidad}</span>
                  </div>
                </div>
                <div className="tpc-item-precio">{formatearMonto(subtotal)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER */}
      <div className="tpc-footer">
        <span className="tpc-footer-label">Total de la compra</span>
        <span className="tpc-footer-total">{formatearMonto(total)}</span>
      </div>

      {/* Imagen miniatura si no se expande */}
      {!expandida && imagen && (
        <div className="tpc-mini-imgs">
          {grupo.items.slice(0, 3).map((item) => {
            const img = item.productos?.imagen_url?.[0];
            return img ? (
              <img
                key={item.id_pedido}
                src={img}
                alt=""
                className="tpc-mini-img"
              />
            ) : null;
          })}
          {grupo.items.length > 3 && (
            <div className="tpc-mini-mas">+{grupo.items.length - 3}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TarjetaPedidoComprador;