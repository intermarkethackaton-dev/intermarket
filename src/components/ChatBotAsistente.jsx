import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";
import { preguntarGemini } from "../services/geminiService";

/* ===========================================================
   CACHE DEL CHAT
=========================================================== */
const CHAT_CACHE_KEY = "intermarket_chat_cache_v2";
const MAX_CACHE_MESSAGES = 50;

const guardarChatCache = (mensajes) => {
  try {
    const ultimos = mensajes.slice(-MAX_CACHE_MESSAGES);
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(ultimos));
  } catch (e) {
    console.error("Error guardando cache:", e);
  }
};

const cargarChatCache = () => {
  try {
    const cache = localStorage.getItem(CHAT_CACHE_KEY);
    return cache ? JSON.parse(cache) : [];
  } catch {
    return [];
  }
};

const eliminarChatCache = () => {
  localStorage.removeItem(CHAT_CACHE_KEY);
};

/* ===========================================================
   MANUAL COMPLETO INTERMARKET (ULTRA ACCESIBLE Y SENCILLO)
=========================================================== */
const MANUAL_INTERMARKET = `
Eres el asistente virtual oficial de InterMarket.
InterMarket es una tienda en línea de Nicaragua donde las personas compran y venden productos.

REGLAS DE COMUNICACIÓN OBLIGATORIAS:
1. Usa un lenguaje EXTREMADAMENTE SENCILLO, claro y directo.
2. Habla como si le explicaras a un usuario que no sabe nada de tecnología o que se confunde rápido.
3. No uses palabras técnicas ni difíciles (evita términos como "plataforma", "suscripción", "categorías", "interfaz", etc.).
4. Responde con frases muy cortas y claras.
5. Si explicas un proceso, usa listas numeradas simples (1, 2, 3...).
6. Sé super amable, paciente y servicial.
7. Nunca inventes productos, precios, colores ni tiendas.
8. Si no encuentras un producto, di simplemente: "No encontré ese producto en la tienda".
9. No uses formato Markdown (nada de asteriscos ni negritas). Responde solo en texto plano.
10. Da respuestas directas de no más de 3 o 4 líneas cuando sea posible.
`.trim();

/* ===========================================================
   SUGERENCIAS SIMPLIFICADAS
=========================================================== */
const sugerencias = [
  "¿Qué venden más?",
  "Mejores tiendas",
  "¿Cómo compro?",
  "Ver ofertas",
  "Buscar ropa",
];

/* ===========================================================
   LIMPIAR RESPUESTAS GEMINI
=========================================================== */
const limpiarMarkdown = (texto) =>
  String(texto || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/* ===========================================================
   COMPONENTE PRINCIPAL
=========================================================== */
const ChatBotAsistente = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();
  const finRef = useRef(null);

  const [abierto, setAbierto] = useState(false);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);

  const mensajeBienvenida = useMemo(
    () => ({
      id: 1,
      de: "bot",
      texto:
        "¡Hola! Te doy la bienvenida a InterMarket.\n\nPuedo ayudarte a buscar ropa, zapatos, ver ofertas o explicarte cómo comprar fácil. ¿Qué estás buscando hoy?",
      fecha: new Date().toISOString(),
    }),
    []
  );

  const [mensajes, setMensajes] = useState([mensajeBienvenida]);
  const mensajesRef = useRef(mensajes);

  useEffect(() => {
    mensajesRef.current = mensajes;
  }, [mensajes]);

  /* ===========================================================
     CARGAR HISTORIAL DESDE CACHE
  =========================================================== */
  useEffect(() => {
    const historial = cargarChatCache();
    if (historial.length > 0) {
      setMensajes(historial);
    }
  }, []);

  /* ===========================================================
     GUARDAR CACHE AUTOMÁTICO
  =========================================================== */
  useEffect(() => {
    guardarChatCache(mensajes);
  }, [mensajes]);

  /* ===========================================================
     SCROLL AUTOMÁTICO
  =========================================================== */
  useEffect(() => {
    if (finRef.current) {
      finRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [mensajes, pensando, abierto]);

  /* ===========================================================
     OCULTAR CHAT EN CIERTAS RUTAS
  =========================================================== */
  const rutasOcultas = [
    "/login",
    "/registro",
    "/seleccion-rol",
    "/suscripcion",
  ];

  const path =
    (location.pathname || "").toLowerCase().replace(/\/$/, "") || "/";

  const ocultar =
    rutasOcultas.includes(path) ||
    role === "admin" ||
    role === "vendedor";

  if (ocultar) return null;

  /* ===========================================================
     FUNCIONES DE MENSAJES
  =========================================================== */
  const agregarUsuario = (texto) => {
    const mensaje = {
      id: Date.now() + Math.random(),
      de: "user",
      texto,
      fecha: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, mensaje]);
  };

  const agregarBot = (texto) => {
    const mensaje = {
      id: Date.now() + Math.random(),
      de: "bot",
      texto: limpiarMarkdown(texto),
      fecha: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, mensaje]);
  };

  /* ===========================================================
     NUEVO CHAT
  =========================================================== */
  const nuevoChat = () => {
    eliminarChatCache();
    setMensajes([mensajeBienvenida]);
    setEntrada("");
  };

  /* ===========================================================
     ELIMINAR HISTORIAL
  =========================================================== */
  const eliminarHistorial = () => {
    const confirmar = window.confirm(
      "¿Quieres borrar todo lo que hemos hablado?"
    );
    if (!confirmar) return;
    eliminarChatCache();
    setMensajes([mensajeBienvenida]);
  };

  /* ===========================================================
     CONSULTAS SUPABASE
  =========================================================== */
  const obtenerProductos = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select(`
        *,
        tiendas(id_tienda,nombre_tienda,direccion,latitud,longitud),
        categorias(id_categoria,nombre_categoria)
      `);
    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  };

  const obtenerCategorias = async () => {
    const { data } = await supabase
      .from("categorias")
      .select("*")
      .order("nombre_categoria");
    return data || [];
  };

  const obtenerTiendas = async () => {
    const { data } = await supabase
      .from("tiendas")
      .select("*");
    return data || [];
  };

  const obtenerPedidos = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id_producto,id_tienda,cantidad,precio_unitario");
    return data || [];
  };

  const obtenerCalificaciones = async () => {
    const { data } = await supabase
      .from("calificaciones_tiendas")
      .select("tienda_id,puntuacion");
    return data || [];
  };

  /* ===========================================================
     PRODUCTOS MÁS VENDIDOS (LENGUAJE SENCILLO)
  =========================================================== */
  const productosMasVendidos = async () => {
    const pedidos = await obtenerPedidos();
    const productos = await obtenerProductos();
    if (!pedidos.length)
      return "Todavía no hay productos comprados en la tienda.";

    const contador = {};
    pedidos.forEach((p) => {
      contador[p.id_producto] =
        (contador[p.id_producto] || 0) + Number(p.cantidad || 0);
    });

    const ranking = Object.entries(contador)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let respuesta = "Lo que más compra la gente:\n\n";
    ranking.forEach(([id, cantidad], index) => {
      const producto = productos.find((p) => p.id_producto === id);
      if (!producto) return;
      respuesta += `${index + 1}. ${producto.nombre_producto}
Precio: C$${producto.precio_venta}
Vendido: ${cantidad} veces
De la tienda: ${producto.tiendas?.nombre_tienda || "General"}
\n`;
    });
    return respuesta;
  };

  /* ===========================================================
     TIENDAS MEJOR VALORADAS (LENGUAJE SENCILLO)
  =========================================================== */
  const tiendasMejorValoradas = async () => {
    const tiendas = await obtenerTiendas();
    const calificaciones = await obtenerCalificaciones();
    if (!calificaciones.length)
      return "Todavía no hay tiendas calificadas por los clientes.";

    const mapa = {};
    calificaciones.forEach((c) => {
      if (!mapa[c.tienda_id]) mapa[c.tienda_id] = [];
      mapa[c.tienda_id].push(Number(c.puntuacion));
    });

    const ranking = Object.entries(mapa)
      .map(([id, arr]) => ({
        id,
        promedio:
          arr.reduce((a, b) => a + b, 0) / arr.length,
        opiniones: arr.length,
      }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 5);

    let texto = "Las mejores tiendas según la gente:\n\n";
    ranking.forEach((t, index) => {
      const tienda = tiendas.find((x) => x.id_tienda === t.id);
      texto += `${index + 1}. ${tienda?.nombre_tienda || "Tienda"}
Puntaje: ${t.promedio.toFixed(1)} de 5 estrellas
\n`;
    });
    return texto;
  };

  /* ===========================================================
     LISTAR CATEGORÍAS
  =========================================================== */
  const listarCategorias = async () => {
    const categorias = await obtenerCategorias();
    if (!categorias.length)
      return "No hay tipos de productos guardados en este momento.";

    return (
      "Tenemos de todo un poco:\n\n" +
      categorias
        .map((c) => `- ${c.nombre_categoria}`)
        .join("\n")
    );
  };

  /* ===========================================================
     OFERTAS
  =========================================================== */
  const obtenerOfertas = async () => {
    const productos = await obtenerProductos();
    const ofertas = productos.filter(
      (p) =>
        p.precio_original &&
        Number(p.precio_original) >
          Number(p.precio_venta)
    );

    if (!ofertas.length)
      return "Por ahora no tenemos ofertas con descuento en la tienda.";

    let texto = "Productos en rebaja hoy:\n\n";
    ofertas.slice(0, 5).forEach((p) => {
      texto += `• ${p.nombre_producto}
Antes: C$${p.precio_original}
Ahora: C$${p.precio_venta}
Tienda: ${p.tiendas?.nombre_tienda || "General"}
\n`;
    });
    return texto;
  };

  /* ===========================================================
     BUSCADOR INTELIGENTE LOCAL (ESTRICTO)
  =========================================================== */
  const buscarProducto = async (pregunta) => {
    const productos = await obtenerProductos();
    const texto = pregunta
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    const ignorar = [
      "en", "que", "donde", "encuentro", "buscar", "busca",
      "hay", "quiero", "una", "un", "el", "la", "los", "las",
      "de", "para", "con", "color", "talla"
    ];

    const palabras = texto
      .split(/\s+/)
      .filter((p) => p.length > 1 && !ignorar.includes(p));

    if (!palabras.length) {
      return "Por favor dime qué producto buscas (ejemplo: camisa, zapatos, reloj).";
    }

    const encontrados = productos.filter((producto) => {
      const nombre = (producto.nombre_producto || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      const descripcion = (producto.descripcion || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      const categoria = (
        producto.categorias?.nombre_categoria || ""
      )
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      const tienda = (producto.tiendas?.nombre_tienda || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
      const tallas = (producto.tallas || []).map((t) =>
        t.toLowerCase()
      );
      const colores = (producto.colores || []).map((c) =>
        c.toLowerCase()
      );

      return palabras.every((palabra) => {
        return (
          nombre.includes(palabra) ||
          descripcion.includes(palabra) ||
          categoria.includes(palabra) ||
          tienda.includes(palabra) ||
          tallas.some((t) => t.includes(palabra)) ||
          colores.some((c) => c.includes(palabra))
        );
      });
    });

    if (!encontrados.length) {
      return "No encontré ningún producto que coincida con lo que buscas.";
    }

    let respuesta = `Encontré esto para ti:\n\n`;
    encontrados.slice(0, 5).forEach((p) => {
      respuesta += `• ${p.nombre_producto}
Precio: C$${p.precio_venta}
Quedan: ${p.stock} disponibles
Tienda: ${p.tiendas?.nombre_tienda || "General"}
\n`;
    });
    return respuesta;
  };

  /* ===========================================================
     CREAR CONTEXTO PARA GEMINI
  =========================================================== */
  const construirContexto = async () => {
    const productos = await obtenerProductos();
    const categorias = await obtenerCategorias();
    const tiendas = await obtenerTiendas();
    const pedidos = await obtenerPedidos();
    const calificaciones = await obtenerCalificaciones();

    let contexto = "PRODUCTOS DISPONIBLES:\n";
    productos.forEach((p) => {
      contexto += `
Producto: ${p.nombre_producto}
Precio: C$${p.precio_venta}
Stock: ${p.stock}
Categoría: ${p.categorias?.nombre_categoria || "Sin categoría"}
Tienda: ${p.tiendas?.nombre_tienda || "Sin tienda"}
Tallas: ${p.tallas?.join(", ") || "No aplica"}
Colores: ${p.colores?.join(", ") || "No aplica"}
Descripción: ${p.descripcion || "Sin descripción"}
`;
    });

    contexto += "\nCATEGORÍAS:\n";
    categorias.forEach((c) => {
      contexto += `- ${c.nombre_categoria}\n`;
    });

    contexto += "\nTIENDAS:\n";
    tiendas.forEach((t) => {
      contexto += `
${t.nombre_tienda}
Dirección: ${t.direccion || "No especificada"}
`;
    });

    return contexto;
  };

  /* ===========================================================
     CONVERTIR HISTORIAL AL FORMATO DE GEMINI
  =========================================================== */
  const construirHistorialGemini = (preguntaActual) => {
    const historial = mensajesRef.current
      .slice(-12)
      .map((m) => ({
        role: m.de === "user" ? "user" : "model",
        parts: [{ text: m.texto }],
      }));

    historial.push({
      role: "user",
      parts: [{ text: preguntaActual }],
    });

    return historial;
  };

  /* ===========================================================
     CONSULTAR GEMINI IA
  =========================================================== */
  const consultarGeminiIA = async (pregunta) => {
    try {
      const contextoBD = await construirContexto();
      const contents = construirHistorialGemini(pregunta);
      const systemInstruction = `${MANUAL_INTERMARKET}\n\nINFORMACIÓN EN TIEMPO REAL DE LA TIENDA:\n${contextoBD}`;

      const respuestaTexto = await preguntarGemini(contents, systemInstruction);

      return limpiarMarkdown(
        respuestaTexto || "No pude encontrar la respuesta."
      );
    } catch (error) {
      console.error("Gemini Error:", error);
      if (error.message?.includes("UNAVAILABLE")) {
        return "Estoy algo ocupado. Por favor, intenta de nuevo en un segundo.";
      }
      return "No pude conectarme para responderte. Intenta de nuevo.";
    }
  };

  /* ===========================================================
     RESPUESTAS RÁPIDAS DEL CHAT (SÚPER DIRECTAS)
  =========================================================== */
  const responder = async (textoUsuario) => {
    const texto = textoUsuario
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    /* ---------- Navegación ---------- */
    if (
      /(catalogo|productos)/.test(texto) &&
      /(ir|abrir|ver|mostrar)/.test(texto)
    ) {
      navigate("/catalogo");
      return "Listo, te llevo a ver todos los productos.";
    }

    if (
      /(perfil|mi cuenta)/.test(texto) &&
      user
    ) {
      navigate("/perfil");
      return "Te llevo a tu perfil.";
    }

    if (
      /(mensajes|chat vendedor|contactar vendedor)/.test(texto)
    ) {
      navigate("/mensajes");
      return "Te llevo a tus mensajes con los vendedores.";
    }

    /* ---------- Productos más vendidos ---------- */
    if (
      /(mas vendido|productos mas vendidos|producto popular|top producto)/.test(
        texto
      )
    ) {
      return await productosMasVendidos();
    }

    /* ---------- Tiendas mejor valoradas ---------- */
    if (
      /(mejor tienda|mejor valorada|ranking tiendas|tiendas mejor valoradas)/.test(
        texto
      )
    ) {
      return await tiendasMejorValoradas();
    }

    /* ---------- Categorías ---------- */
    if (
      /(categorias|categoria disponible)/.test(texto)
    ) {
      return await listarCategorias();
    }

    /* ---------- Ofertas ---------- */
    if (
      /(oferta|descuento|rebaja|promocion)/.test(texto)
    ) {
      return await obtenerOfertas();
    }

    /* ---------- Cómo comprar ---------- */
    if (
      /(como compro|como comprar|carrito|pagar|pedido)/.test(
        texto
      )
    ) {
      return `Comprar es facilísimo:
1. Toca el producto que te guste.
2. Elige tu talla o color.
3. Toca el botón azul "Agregar al carrito".
4. Entra al carrito y toca "Comprar".
5. ¡Listo! Espera a que el vendedor se contacte contigo.`;
    }

    /* ---------- Cómo vender ---------- */
    if (
      /(vender|abrir tienda|crear tienda|suscripcion)/.test(texto)
    ) {
      return `Para vender tus productos:
1. Registra tu cuenta como vendedor.
2. Entra a "Mis Tiendas" y crea tu tienda.
3. Sube las fotos y precios de lo que quieres vender.`;
    }

    /* ---------- Saludos ---------- */
    if (
      /^(hola|buenas|hello|hey|ayuda)$/.test(texto.trim())
    ) {
      return `¡Hola! Con gusto te ayudo. Puedes preguntarme cosas sencillas como:
- ¿Qué ropa o zapatos hay?
- ¿Cuáles son las ofertas de hoy?
- ¿Cómo se compra un producto?`;
    }

    /* ---------- Filtros o colores -> Gemini IA ---------- */
    if (/(color|talla|blanco|negro|rojo|azul|verde|talla s|talla m|talla l)/.test(texto)) {
      return await consultarGeminiIA(textoUsuario);
    }

    /* ---------- Búsqueda local básica ---------- */
    if (
      /(camisa|blusa|pantalon|zapato|zapatilla|tenis|gorra|bolso|short|chaqueta|calcetin|cadena|diadema)/.test(
        texto
      )
    ) {
      return await buscarProducto(textoUsuario);
    }

    /* ---------- Todo lo demás -> Gemini ---------- */
    return await consultarGeminiIA(textoUsuario);
  };

  /* ===========================================================
     ENVIAR MENSAJE
  =========================================================== */
  const enviar = async (mensajeLibre) => {
    const texto = (mensajeLibre ?? entrada).trim();
    if (!texto || pensando) return;

    setEntrada("");
    agregarUsuario(texto);
    setPensando(true);

    try {
      const respuesta = await responder(texto);
      agregarBot(respuesta);
    } catch (error) {
      console.error(error);
      agregarBot(
        "Tive un pequeño problema para responder. Por favor prueba a preguntarme de nuevo."
      );
    } finally {
      setPensando(false);
    }
  };

  /* ===========================================================
     ENTER PARA ENVIAR
  =========================================================== */
  const manejarEnter = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  /* ===========================================================
     INTERFAZ DEL CHATBOT
  =========================================================== */
  return (
    <>
      {/* BOTÓN FLOTANTE */}
      <button
        type="button"
        aria-label="Asistente InterMarket"
        onClick={() => setAbierto(!abierto)}
        style={{
          position: "fixed",
          bottom: "90px",
          right: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg,#0d5c63,#14b8a6)",
          color: "#fff",
          boxShadow: "0 8px 25px rgba(0,0,0,.25)",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "26px",
        }}
      >
        <i className={`bi ${abierto ? "bi-x-lg" : "bi-robot"}`} />
      </button>

      {/* VENTANA DEL CHAT */}
      {abierto && (
        <div
          style={{
            position: "fixed",
            bottom: "160px",
            right: "20px",
            width: "360px",
            maxWidth: "95vw",
            height: "560px",
            background: "#ffffff",
            borderRadius: "22px",
            overflow: "hidden",
            boxShadow: "0 15px 45px rgba(0,0,0,.25)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
          }}
        >
          {/* ================= HEADER ================= */}
          <div
            style={{
              background: "linear-gradient(135deg,#0d5c63,#14919b)",
              color: "#fff",
              padding: "15px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,.15)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "22px",
                }}
              >
                <i className="bi bi-robot"></i>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "15px",
                  }}
                >
                  Asistente InterMarket
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    opacity: ".85",
                  }}
                >
                  Ayuda fácil • Productos y ofertas
                </div>
              </div>
              <button
                onClick={() => setAbierto(false)}
                style={{
                  background: "transparent",
                  color: "#fff",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* BOTONES SUPERIORES */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "15px",
              }}
            >
              <button
                onClick={nuevoChat}
                style={{
                  flex: 1,
                  border: "none",
                  background: "rgba(255,255,255,.18)",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                <i className="bi bi-chat-dots me-2"></i>
                Nueva pregunta
              </button>
              <button
                onClick={eliminarHistorial}
                style={{
                  flex: 1,
                  border: "none",
                  background: "rgba(220,38,38,.85)",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                <i className="bi bi-trash3 me-2"></i>
                Borrar chat
              </button>
            </div>
          </div>

          {/* ================= MENSAJES ================= */}
          <div
            style={{
              flex: 1,
              background: "#f4f8fb",
              overflowY: "auto",
              padding: "14px",
            }}
          >
            {mensajes.map((mensaje) => (
              <div
                key={mensaje.id}
                style={{
                  display: "flex",
                  justifyContent:
                    mensaje.de === "user"
                      ? "flex-end"
                      : "flex-start",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    background:
                      mensaje.de === "user"
                        ? "#0d5c63"
                        : "#ffffff",
                    color:
                      mensaje.de === "user"
                        ? "#fff"
                        : "#0f172a",
                    padding: "11px 13px",
                    borderRadius:
                      mensaje.de === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.45",
                    fontSize: "14px",
                    boxShadow: "0 2px 8px rgba(0,0,0,.05)",
                  }}
                >
                  {mensaje.texto}
                </div>
              </div>
            ))}

            {pensando && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#0d5c63",
                  fontSize: "13px",
                  marginBottom: "10px",
                }}
              >
                <Spinner animation="border" size="sm" />
                Buscando...
              </div>
            )}
            <div ref={finRef}></div>
          </div>

          {/* ================= SUGERENCIAS ================= */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              padding: "10px",
              background: "#ffffff",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            {sugerencias.map((sugerencia) => (
              <button
                key={sugerencia}
                type="button"
                disabled={pensando}
                onClick={() => enviar(sugerencia)}
                style={{
                  flex: "0 0 auto",
                  border: "1px solid #0d9488",
                  background: "#ecfeff",
                  color: "#0d5c63",
                  borderRadius: "20px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {sugerencia}
              </button>
            ))}
          </div>

          {/* ================= INPUT ================= */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px",
              borderTop: "1px solid #e2e8f0",
              background: "#ffffff",
            }}
          >
            <textarea
              rows={1}
              value={entrada}
              disabled={pensando}
              onKeyDown={manejarEnter}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Escribe tu pregunta aquí..."
              style={{
                flex: 1,
                resize: "none",
                border: "1px solid #cbd5e1",
                borderRadius: "18px",
                padding: "10px 14px",
                outline: "none",
                fontSize: "14px",
                maxHeight: "90px",
                overflowY: "auto",
              }}
            />
            <button
              type="submit"
              disabled={pensando || !entrada.trim()}
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                border: "none",
                background: pensando ? "#94a3b8" : "#0d5c63",
                color: "#ffffff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: pensando ? "not-allowed" : "pointer",
                transition: ".2s",
                fontSize: "18px",
              }}
            >
              {pensando ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <i className="bi bi-send-fill"></i>
              )}
            </button>
          </form>

          {/* ================= FOOTER ================= */}
          <div
            style={{
              padding: "8px 12px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              fontSize: "11px",
              color: "#64748b",
              textAlign: "center",
            }}
          >
            Asistente sencillo de InterMarket
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBotAsistente;