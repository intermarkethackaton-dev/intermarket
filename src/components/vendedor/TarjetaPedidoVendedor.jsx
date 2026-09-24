// src/components/vendedor/TarjetaPedidoVendedor.jsx
import React from "react";
import {
  idCorto,
  formatearMonto,
  formatearFecha,
  NOMBRE_ESTADO,
  COLOR_ESTADO,
  ESTADOS_PEDIDO,
} from "../../utils/seguimiento";

const TarjetaPedidoVendedor = ({
  pedido,
  mostrarTienda = false,
  onAceptar,
  onRechazar,
  onPonerEstimado,
  onMarcarEntregado,
}) => {
  const img = pedido.productos?.imagen_url?.[0];
  const total =
    Number(pedido.precio_unitario || 0) * Number(pedido.cantidad || 1);
  const comprador = pedido.perfiles?.usuarios?.username || "Comprador";
  const nombreTienda = pedido.tiendas?.nombre_tienda;

  return (
    <div className="tpv-card">
      {/* HEADER */}
      <div className="tpv-header">
        <div className="tpv-img">
          {img ? <img src={img} alt="" /> : <i className="bi bi-image"></i>}
        </div>
        <div className="tpv-info">
          <div className="tpv-info-top">
            <strong>{pedido.productos?.nombre_producto || "Producto"}</strong>
            <span
              className="tpv-estado"
              style={{
                backgroundColor: `${COLOR_ESTADO[pedido.id_estado_pedido]}20`,
                color: COLOR_ESTADO[pedido.id_estado_pedido],
              }}
            >
              {NOMBRE_ESTADO[pedido.id_estado_pedido]}
            </span>
          </div>

          {/* BADGE DE TIENDA (solo cuando se ven todas) */}
          {mostrarTienda && nombreTienda && (
            <div className="tpv-tienda-badge">
              <i className="bi bi-shop"></i>
              {nombreTienda}
            </div>
          )}

          <div className="tpv-meta">
            <span>
              <i className="bi bi-person"></i> {comprador}
            </span>
            <span>
              <i className="bi bi-receipt"></i> #{idCorto(pedido.id_pedido)}
            </span>
            <span>
              <i className="bi bi-calendar3"></i> {formatearFecha(pedido.creado_en)}
            </span>
          </div>
          <div className="tpv-variantes">
            {pedido.talla_seleccionada && <span>Talla: {pedido.talla_seleccionada}</span>}
            {pedido.color_seleccionado && <span>Color: {pedido.color_seleccionado}</span>}
            <span>x{pedido.cantidad}</span>
          </div>
        </div>
        <div className="tpv-total">{formatearMonto(total)}</div>
      </div>

      {/* INFO ESTIMADO (si ya está en camino) */}
      {pedido.id_estado_pedido === ESTADOS_PEDIDO.EN_CAMINO &&
        pedido.fecha_estimada_entrega && (
          <div className="tpv-estimado">
            <i className="bi bi-truck"></i>
            <div>
              <strong>
                Est: {pedido.dias_estimados || 0}d {pedido.horas_estimadas || 0}h
              </strong>
              <span>
                Entrega: {formatearFecha(pedido.fecha_estimada_entrega)}
              </span>
              {pedido.numero_guia && (
                <span className="tpv-guia">
                  <i className="bi bi-upc-scan"></i> {pedido.numero_guia}
                </span>
              )}
            </div>
          </div>
        )}

      {/* ACCIONES */}
      <div className="tpv-actions">
        {pedido.id_estado_pedido === ESTADOS_PEDIDO.PENDIENTE && (
          <>
            <button
              type="button"
              className="tpv-btn tpv-btn-aceptar"
              onClick={() => onAceptar?.(pedido)}
            >
              <i className="bi bi-check-lg"></i> Aceptar
            </button>
            <button
              type="button"
              className="tpv-btn tpv-btn-rechazar"
              onClick={() => onRechazar?.(pedido)}
            >
              <i className="bi bi-x-lg"></i> Rechazar
            </button>
          </>
        )}

        {pedido.id_estado_pedido === ESTADOS_PEDIDO.ACEPTADO && (
          <button
            type="button"
            className="tpv-btn tpv-btn-estimado"
            onClick={() => onPonerEstimado?.(pedido)}
          >
            <i className="bi bi-truck"></i> Poner estimado de envío
          </button>
        )}

        {pedido.id_estado_pedido === ESTADOS_PEDIDO.EN_CAMINO && (
          <>
            <button
              type="button"
              className="tpv-btn tpv-btn-entregar"
              onClick={() => onMarcarEntregado?.(pedido)}
            >
              <i className="bi bi-box-seam-fill"></i> Marcar como entregado
            </button>
            <button
              type="button"
              className="tpv-btn tpv-btn-editar-estimado"
              onClick={() => onPonerEstimado?.(pedido)}
            >
              <i className="bi bi-pencil"></i> Editar estimado
            </button>
          </>
        )}

        {pedido.id_estado_pedido === ESTADOS_PEDIDO.CANCELADO && (
          <div className="tpv-cancelado">
            <i className="bi bi-x-circle"></i> Pedido cancelado
          </div>
        )}

        {pedido.id_estado_pedido === ESTADOS_PEDIDO.ENTREGADO && (
          <div className="tpv-entregado">
            <i className="bi bi-check-circle"></i> Pedido entregado
          </div>
        )}
      </div>
    </div>
  );
};

export default TarjetaPedidoVendedor;