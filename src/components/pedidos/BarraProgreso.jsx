// src/components/pedidos/BarraProgreso.jsx
import React, { useEffect, useState } from "react";
import { calcularProgreso, formatearPorcentaje } from "../../utils/seguimiento";

const BarraProgreso = ({ pedido }) => {
  const [progreso, setProgreso] = useState(0);
  const objetivo = calcularProgreso(pedido);

  useEffect(() => {
    // Animación suave desde el valor anterior
    const inicio = progreso;
    const duracion = 800;
    const t0 = performance.now();

    const animar = (t) => {
      const p = Math.min(1, (t - t0) / duracion);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgreso(inicio + (objetivo - inicio) * eased);
      if (p < 1) requestAnimationFrame(animar);
    };

    requestAnimationFrame(animar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivo]);

  // Ancho visual: mínimo 2% para que siempre se vea un pedacito aunque
  // el % real sea 0.02% (así el usuario ve que la barra arrancó).
  const anchoVisual = Math.max(2, progreso);

  return (
    <div className="bp-wrapper">
      <div className="bp-track">
        <div
          className="bp-fill"
          style={{ width: `${anchoVisual}%` }}
          role="progressbar"
          aria-valuenow={progreso}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="bp-shimmer"></span>
        </div>
      </div>
      <span className="bp-pct">{formatearPorcentaje(progreso)}</span>
    </div>
  );
};

export default BarraProgreso;