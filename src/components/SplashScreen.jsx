import { useEffect, useState } from "react";

import icono from "../assets/intermarket_icono.png";
import eslogan from "../assets/intermarket_eslogan.png";

const WORD = "InterMarket";
const TEAL_LETTERS = 5; // letras de "Inter" -> teal, el resto ("Market") -> coral

function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 80),    // Logo entra
      setTimeout(() => setPhase(2), 420),   // Brillo + órbitas neón (juntas)
      setTimeout(() => setPhase(3), 750),   // Letras del nombre suben
      setTimeout(() => setPhase(4), 1050),  // Eslogan aparece
      setTimeout(() => setPhase(5), 1300),  // Empieza el empalme con el fondo real
      setTimeout(() => onFinish(), 1800),   // Entrar a la app (~1.8s total)
    ];

    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <section className={`splash-screen phase-${phase}`}>

      {/* Todo el contenido oscuro vive aquí para poder desvanecerlo junto */}
      <div className="splash-content">

        {/* Fondo */}
        <div className="splash-bg"></div>
        <div className="splash-noise"></div>

        {/* Halos */}
        <div className="halo halo-left"></div>
        <div className="halo halo-right"></div>

        {/* Partículas */}
        <div className="particles">
          {Array.from({ length: 40 }).map((_, i) => (
            <span key={i} style={{ "--i": i }}></span>
          ))}
        </div>

        {/* Logo */}
        <div className={`logo-wrapper ${phase >= 2 ? "glow" : ""}`}>

          <div className="energy-line"></div>
          <div className="energy-circle"></div>

          {/* Puntos neón orbitando mientras el logo se ilumina */}
          <div className="orbit orbit1"></div>
          <div className="orbit orbit2"></div>
          <div className="orbit orbit3"></div>
          <div className="orbit orbit4"></div>

          <img
            src={icono}
            alt="InterMarket"
            className="icon-logo"
          />

        </div>

        {/* Nombre — letra por letra, deslizándose hacia arriba */}
        <div className={`logo-text ${phase >= 3 ? "show" : ""}`}>
          {WORD.split("").map((letter, i) => (
            <span
              key={i}
              className="letter"
              style={{
                "--i": i,
                color: i < TEAL_LETTERS ? "var(--im-teal)" : "var(--im-coral)",
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Eslogan */}
        <img
          src={eslogan}
          alt="Conecta Intercambia Crece"
          className={`logo-slogan ${phase >= 4 ? "show" : ""}`}
        />

      </div>

      {/* Capa de empalme: se disuelve hacia los colores del fondo real
          (teal -> coral claro) justo antes de que el splash desaparezca */}
      <div className="exit-wash"></div>

    </section>
  );
}

export default SplashScreen;