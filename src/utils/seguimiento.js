// src/utils/seguimiento.js
// Utilidades para calcular progreso, tiempo restante y estados del pedido.

export const ESTADOS_PEDIDO = {
  PENDIENTE: 1,
  ACEPTADO: 2,
  CANCELADO: 3,
  ENTREGADO: 4,
  EN_CAMINO: 5,
};

export const NOMBRE_ESTADO = {
  1: "Pendiente",
  2: "Aceptado",
  3: "Cancelado",
  4: "Entregado",
  5: "En camino",
};

export const COLOR_ESTADO = {
  1: "#f59e0b", // ámbar
  2: "#22c55e", // verde
  3: "#ef4444", // rojo
  4: "#10454F", // teal (tu color primario)
  5: "#3b82f6", // azul
};

export const ICONO_ESTADO = {
  1: "bi-hourglass-split",
  2: "bi-check-circle",
  3: "bi-x-circle",
  4: "bi-box-seam-fill",
  5: "bi-truck",
};

// Etapas visuales del timeline (excluye cancelado)
export const ETAPAS_TIMELINE = [
  { id: 1, nombre: "Pendiente", icono: "bi-hourglass-split" },
  { id: 2, nombre: "Aceptado", icono: "bi-check-circle" },
  { id: 5, nombre: "En camino", icono: "bi-truck" },
  { id: 4, nombre: "Entregado", icono: "bi-box-seam-fill" },
];

/**
 * Helper interno: obtiene el id del estado tanto si viene como
 * id_estado_pedido (columna nueva) o id_estado (columna vieja).
 */
function obtenerIdEstado(pedido) {
  if (!pedido) return null;
  return pedido.id_estado_pedido ?? pedido.id_estado ?? null;
}

/**
 * Devuelve el índice (0-3) de la etapa actual en el timeline.
 */
export function indiceEtapaActual(idEstado) {
  if (idEstado === ESTADOS_PEDIDO.CANCELADO) return -1;
  const idx = ETAPAS_TIMELINE.findIndex((e) => e.id === idEstado);
  return idx === -1 ? 0 : idx;
}

/**
 * Calcula el progreso (0 a 100) entre el momento de envío y la entrega estimada.
 * El progreso es LITERAL al tiempo transcurrido, SIN redondear.
 */
export function calcularProgreso(pedido) {
  if (!pedido) return 0;

  const estado = obtenerIdEstado(pedido);

  // Entregado → 100%
  if (estado === ESTADOS_PEDIDO.ENTREGADO) return 100;

  // Cancelado → 0%
  if (estado === ESTADOS_PEDIDO.CANCELADO) return 0;

  // Pendiente o Aceptado (sin estimado aún) → 0%
  if (
    estado === ESTADOS_PEDIDO.PENDIENTE ||
    estado === ESTADOS_PEDIDO.ACEPTADO
  ) {
    return 0;
  }

  // En camino pero sin fechas → 0%
  if (!pedido.fecha_enviado || !pedido.fecha_estimada_entrega) {
    return 0;
  }

  const ahora = Date.now();
  const inicio = new Date(pedido.fecha_enviado).getTime();
  const fin = new Date(pedido.fecha_estimada_entrega).getTime();

  // Fechas inválidas → 0%
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) {
    return 0;
  }

  // Aún no ha pasado tiempo desde el envío → 0%
  if (ahora <= inicio) return 0;

  // Ya pasó la fecha estimada pero no está entregado → 99%
  if (ahora >= fin) return 99;

  // Cálculo real, sin redondear
  const transcurrido = ahora - inicio;
  const total = fin - inicio;
  const porcentaje = (transcurrido / total) * 100;

  return Math.min(99, Math.max(0, porcentaje));
}

/**
 * Formatea el porcentaje con decimales inteligentes:
 *  - < 1%   → 2 decimales (ej: "0.02%")
 *  - < 10%  → 1 decimal   (ej: "3.4%")
 *  - resto  → 0 decimales (ej: "58%")
 */
export function formatearPorcentaje(valor) {
  const n = Number(valor) || 0;
  if (n < 1) return `${n.toFixed(2)}%`;
  if (n < 10) return `${n.toFixed(1)}%`;
  return `${Math.round(n)}%`;
}

/**
 * Devuelve texto tipo "2 días y 4 horas" del tiempo restante.
 */
export function tiempoRestante(pedido) {
  if (!pedido?.fecha_estimada_entrega) return null;

  const estado = obtenerIdEstado(pedido);

  if (estado === ESTADOS_PEDIDO.ENTREGADO) {
    return { texto: "Entregado", vencido: false, completado: true };
  }

  const ahora = Date.now();
  const fin = new Date(pedido.fecha_estimada_entrega).getTime();
  const diff = fin - ahora;

  if (diff <= 0) {
    return {
      texto: "Llegada estimada superada",
      vencido: true,
      completado: false,
    };
  }

  const totalMin = Math.floor(diff / 60000);
  const dias = Math.floor(totalMin / (60 * 24));
  const horas = Math.floor((totalMin % (60 * 24)) / 60);
  const minutos = totalMin % 60;

  let texto = "";
  if (dias > 0) {
    texto = `${dias} día${dias !== 1 ? "s" : ""}`;
    if (horas > 0) texto += ` y ${horas} hora${horas !== 1 ? "s" : ""}`;
  } else if (horas > 0) {
    texto = `${horas} hora${horas !== 1 ? "s" : ""}`;
    if (minutos > 0) texto += ` y ${minutos} min`;
  } else {
    texto = `${minutos} minuto${minutos !== 1 ? "s" : ""}`;
  }

  return { texto, vencido: false, completado: false };
}

/**
 * Devuelve el tiempo transcurrido desde el envío en formato legible.
 */
export function tiempoTranscurrido(pedido) {
  if (!pedido?.fecha_enviado) return null;

  const ahora = Date.now();
  const inicio = new Date(pedido.fecha_enviado).getTime();
  const diff = ahora - inicio;

  if (diff < 0) return "recién enviado";

  const totalMin = Math.floor(diff / 60000);
  const dias = Math.floor(totalMin / (60 * 24));
  const horas = Math.floor((totalMin % (60 * 24)) / 60);
  const minutos = totalMin % 60;

  if (dias > 0) {
    return `${dias} día${dias !== 1 ? "s" : ""}${
      horas > 0 ? ` y ${horas} h` : ""
    }`;
  }
  if (horas > 0) {
    return `${horas} hora${horas !== 1 ? "s" : ""}${
      minutos > 0 ? ` y ${minutos} min` : ""
    }`;
  }
  if (minutos > 0) {
    return `${minutos} minuto${minutos !== 1 ? "s" : ""}`;
  }
  return "menos de 1 minuto";
}

/**
 * Formatea una fecha como "25 sep · 3:00 pm".
 */
export function formatearFecha(fechaISO) {
  if (!fechaISO) return "—";
  const fecha = new Date(fechaISO);
  if (isNaN(fecha.getTime())) return "—";

  const dia = fecha.getDate();
  const mes = fecha
    .toLocaleString("es-NI", { month: "short" })
    .replace(".", "");
  const hora = fecha
    .toLocaleString("es-NI", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();

  return `${dia} ${mes} · ${hora}`;
}

/**
 * Formatea una fecha corta tipo "25 sep".
 */
export function formatearFechaCorta(fechaISO) {
  if (!fechaISO) return "—";
  const fecha = new Date(fechaISO);
  if (isNaN(fecha.getTime())) return "—";

  const dia = fecha.getDate();
  const mes = fecha
    .toLocaleString("es-NI", { month: "short" })
    .replace(".", "");
  return `${dia} ${mes}`;
}

/**
 * Genera un ID corto visible a partir del uuid del pedido.
 */
export function idCorto(uuid) {
  if (!uuid) return "—";
  return String(uuid).replace(/-/g, "").slice(0, 4).toUpperCase();
}

/**
 * Formatea montos en córdobas.
 */
export function formatearMonto(monto) {
  const num = Number(monto || 0);
  return `C$ ${num.toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calcula la fecha estimada de entrega a partir de días y horas.
 */
export function calcularFechaEstimada(dias = 0, horas = 0, desde = new Date()) {
  const base = new Date(desde).getTime();
  const ms =
    (Number(dias) || 0) * 24 * 60 * 60 * 1000 +
    (Number(horas) || 0) * 60 * 60 * 1000;
  return new Date(base + ms).toISOString();
}