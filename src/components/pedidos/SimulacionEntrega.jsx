// src/components/pedidos/SimulacionEntrega.jsx
import React, { useEffect, useState } from "react";
import BarraProgreso from "./BarraProgreso";
import {
  tiempoRestante,
  tiempoTranscurrido,
  formatearFecha,
  ESTADOS_PEDIDO,
} from "../../utils/seguimiento";

const SimulacionEntrega = ({ pedido }) => {
  const [, forceTick] = useState(0);

  // Refresca cada 15 segundos para que la barra se mueva más seguido
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (!pedido) return null;

  const estado = pedido.id_estado_pedido ?? pedido.id_estado;
  const { fecha_estimada_entrega, numero_guia, fecha_enviado } = pedido;

  // Estados que aún no tienen estimado
  if (
    estado === ESTADOS_PEDIDO.PENDIENTE ||
    estado === ESTADOS_PEDIDO.CANCELADO
  ) {
    return null;
  }

  // Aceptado pero sin estimado todavía
  if (estado === ESTADOS_PEDIDO.ACEPTADO && !fecha_estimada_entrega) {
    return (
      <div className="se-card se-esperando">
        <div className="se-icono">
          <i className="bi bi-hourglass-split"></i>
        </div>
        <div className="se-contenido">
          <strong>Esperando estimado de envío</strong>
          <p>El vendedor confirmará en breve cuánto tardará.</p>
        </div>
      </div>
    );
  }

  // Entregado
  if (estado === ESTADOS_PEDIDO.ENTREGADO) {
    return (
      <div className="se-card se-entregado">
        <div className="se-icono">
          <i className="bi bi-check2-circle"></i>
        </div>
        <div className="se-contenido">
          <strong>¡Pedido entregado!</strong>
          <p>
            {pedido.fecha_entregado
              ? `Recibido el ${formatearFecha(pedido.fecha_entregado)}`
              : "Gracias por tu compra."}
          </p>
          {numero_guia && (
            <span className="se-guia">
              <i className="bi bi-upc-scan"></i> {numero_guia}
            </span>
          )}
        </div>
      </div>
    );
  }

  // En camino (o aceptado con estimado)
  const tiempo = tiempoRestante(pedido);
  const transcurrido = tiempoTranscurrido(pedido);
  const esVencido = tiempo?.vencido;

  return (
    <div className={`se-card ${esVencido ? "se-vencido" : "se-en-camino"}`}>
      <div className="se-header">
        <div className="se-icono">
          <i className="bi bi-truck"></i>
        </div>
        <div className="se-contenido">
          {esVencido ? (
            <>
              <strong>Llegada estimada superada</strong>
              <p>Tu pedido está por llegar. Sentimos la demora.</p>
            </>
          ) : (
            <>
              <strong>Tu pedido llegará en</strong>
              <p className="se-tiempo">{tiempo?.texto || "—"}</p>
              {transcurrido && (
                <p className="se-transcurrido">
                  <i className="bi bi-clock-history"></i>
                  En camino desde hace {transcurrido}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <BarraProgreso pedido={pedido} />

      <div className="se-meta">
        {fecha_estimada_entrega && (
          <span className="se-meta-item">
            <i className="bi bi-calendar-event"></i>
            Est: {formatearFecha(fecha_estimada_entrega)}
          </span>
        )}
        {fecha_enviado && (
          <span className="se-meta-item">
            <i className="bi bi-box-arrow-up"></i>
            Enviado: {formatearFecha(fecha_enviado)}
          </span>
        )}
      </div>

      {numero_guia && (
        <div className="se-guia">
          <i className="bi bi-upc-scan"></i>
          Guía: <strong>{numero_guia}</strong>
        </div>
      )}
    </div>
  );
};

export default SimulacionEntrega;