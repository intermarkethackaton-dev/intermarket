// src/components/pedidos/TimelinePedido.jsx
import React from "react";
import { ETAPAS_TIMELINE, indiceEtapaActual, ESTADOS_PEDIDO } from "../../utils/seguimiento";

const TimelinePedido = ({ idEstado }) => {
  if (idEstado === ESTADOS_PEDIDO.CANCELADO) {
    return (
      <div className="tl-cancelado">
        <i className="bi bi-x-circle-fill"></i>
        <span>Pedido cancelado</span>
      </div>
    );
  }

  const actual = indiceEtapaActual(idEstado);

  return (
    <div className="tl-wrapper">
      {ETAPAS_TIMELINE.map((etapa, idx) => {
        const completada = idx < actual;
        const activa = idx === actual;
        const futura = idx > actual;

        return (
          <React.Fragment key={etapa.id}>
            <div className={`tl-paso ${completada ? "ok" : ""} ${activa ? "activo" : ""} ${futura ? "futuro" : ""}`}>
              <div className="tl-punto">
                {completada ? (
                  <i className="bi bi-check-lg"></i>
                ) : (
                  <i className={`bi ${etapa.icono}`}></i>
                )}
                {activa && <span className="tl-pulso"></span>}
              </div>
              <span className="tl-label">{etapa.nombre}</span>
            </div>

            {idx < ETAPAS_TIMELINE.length - 1 && (
              <div className={`tl-linea ${idx < actual ? "ok" : ""}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default TimelinePedido;