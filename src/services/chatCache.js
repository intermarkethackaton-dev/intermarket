// src/services/chatCache.js

const CHAT_CACHE_KEY = "intermarket_chat_cache_v2";
const MAX_MESSAGES = 50;

// Guardar historial
export const guardarChatCache = (mensajes) => {
  try {
    const historial = mensajes.slice(-MAX_MESSAGES);
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(historial));
  } catch (error) {
    console.error("Error guardando historial:", error);
  }
};

// Cargar historial
export const cargarChatCache = () => {
  try {
    const historial = localStorage.getItem(CHAT_CACHE_KEY);
    return historial ? JSON.parse(historial) : [];
  } catch (error) {
    console.error("Error leyendo historial:", error);
    return [];
  }
};

// Eliminar historial
export const eliminarChatCache = () => {
  try {
    localStorage.removeItem(CHAT_CACHE_KEY);
  } catch (error) {
    console.error("Error eliminando historial:", error);
  }
};

// Agregar un mensaje al historial
export const agregarMensajeCache = (mensaje) => {
  const historial = cargarChatCache();
  historial.push(mensaje);
  guardarChatCache(historial);
};

// Obtener últimos mensajes
export const obtenerUltimosMensajes = (cantidad = 12) => {
  const historial = cargarChatCache();
  return historial.slice(-cantidad);
};

// Nuevo chat
export const reiniciarChatCache = () => {
  guardarChatCache([]);
};