// src/utils/planes.js
// Definición centralizada de los planes de suscripción.
// Si cambias límites o precios, hazlo AQUÍ y todo se actualiza.

export const PLANES = {
  plan_gratuito: {
    id: "plan_gratuito",
    nombre: "Prueba Gratuita",
    precio: 0,
    duracion: "14 días",
    tipo: "prueba",
    esGratuito: true,
    limite_tiendas: 1,
    limite_productos: 50,
    popular: false,
    color: "#8B5CF6",
    caracteristicas: [
      "Eliminación de fondo con IA",
      "1 tienda",
      "50 productos por tienda",
      "Soporte técnico",
      "Estadísticas",
    ],
  },
  plan_bronce: {
    id: "plan_bronce",
    nombre: "Plan Bronce",
    precio: 9.99,
    duracion: "Mensual",
    tipo: "paga",
    esGratuito: false,
    limite_tiendas: 3,
    limite_productos: 100,
    popular: false,
    color: "#CD7F32",
    caracteristicas: [
      "Eliminación de fondo con IA",
      "3 tiendas",
      "100 productos por tienda",
      "Soporte técnico",
      "Estadísticas",
    ],
  },
  plan_plata: {
    id: "plan_plata",
    nombre: "Plan Plata",
    precio: 24.99,
    duracion: "Trimestral",
    tipo: "paga",
    esGratuito: false,
    limite_tiendas: 5,
    limite_productos: 250,
    popular: true,
    color: "#94A3B8",
    caracteristicas: [
      "Eliminación de fondo con IA",
      "5 tiendas",
      "250 productos por tienda",
      "Destacados en catálogo",
      "Soporte técnico",
      "Estadísticas",
    ],
  },
  plan_oro: {
    id: "plan_oro",
    nombre: "Plan Oro",
    precio: 79.99,
    duracion: "Anual",
    tipo: "paga",
    esGratuito: false,
    limite_tiendas: 8,
    limite_productos: 999999,
    popular: false,
    color: "#F59E0B",
    caracteristicas: [
      "Eliminación de fondo con IA",
      "8 tiendas",
      "Productos ilimitados por tienda",
      "Destacados en catálogo",
      "Soporte técnico",
      "Estadísticas",
      "Reportes exportables",
    ],
  },
};

// Lista ordenada para renderizar
export const LISTA_PLANES = [
  PLANES.plan_gratuito,
  PLANES.plan_bronce,
  PLANES.plan_plata,
  PLANES.plan_oro,
];

// Buscar plan por nombre (como se guarda en BD)
export function obtenerPlanPorNombre(nombre) {
  if (!nombre) return null;
  return Object.values(PLANES).find((p) => p.nombre === nombre) || null;
}

// Verifica si el vendedor puede crear otra tienda
export function puedeCrearTienda(suscripcion, tiendasActuales) {
  if (!suscripcion) return false;
  const limite = suscripcion.limite_tiendas ?? 0;
  return tiendasActuales < limite;
}

// Verifica si el vendedor puede crear otro producto en esta tienda
export function puedeCrearProducto(suscripcion, productosEnEstaTienda) {
  if (!suscripcion) return false;
  const limite = suscripcion.limite_productos ?? 0;
  return productosEnEstaTienda < limite;
}