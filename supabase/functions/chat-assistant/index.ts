// supabase/functions/chat-assistant/index.ts

import { createClient } from "npm:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL =
  Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MANUAL_APP = `
Eres el asistente virtual oficial de InterMarket.

InterMarket es un marketplace de Nicaragua donde compradores y vendedores
compran y venden productos dentro de una sola plataforma.

FUNCIONES DE INTERMARKET

• Comprar productos por categorías.
• Buscar productos, tiendas y categorías.
• Agregar productos al carrito.
• Ver ofertas y descuentos.
• Realizar pedidos.
• Hablar con vendedores mediante mensajes.
• Registrarse como comprador o vendedor.
• Crear tiendas mediante una suscripción.

REGLAS IMPORTANTES

1. Siempre responde en español.
2. Sé amable, natural y profesional.
3. Si la pregunta es sobre InterMarket, responde usando esta información.
4. Si la pregunta es sobre productos, tiendas, categorías o ventas, usa la base de datos proporcionada.
5. Si no existe un dato, dilo honestamente. No inventes productos, tiendas, precios ni cifras de ventas.
6. Puedes responder cualquier pregunta del usuario relacionada con la aplicación.
7. Cuando te pregunten por "el producto más vendido/comprado" o "la tienda con más ventas", usa
   exclusivamente la sección "PRODUCTOS MÁS COMPRADOS" o "TIENDAS CON MÁS VENTAS" del contexto,
   que refleja pedidos reales. Si esas secciones están vacías, dilo honestamente.
8. FORMATO DE RESPUESTA: nunca uses Markdown (nada de **negrita**, *cursiva*, guiones bajos,
   almohadillas # ni backticks). El chat solo muestra texto plano. Para listas usa un guion "-"
   al inicio de cada línea, y separa ideas con saltos de línea normales.
9. Cuando te pregunten dónde queda una tienda, cómo llegar, la dirección o la calificación de una
   tienda, usa los datos de "Dirección", "Ubicación en el mapa" y "Calificación" de esa tienda en
   el contexto. Si hay un enlace de "Ubicación en el mapa", compártelo tal cual (es un link real de
   Google Maps). Si no hay dirección registrada, dilo honestamente en vez de inventar una.
`.trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY no configurada.");
    }

    const { pregunta, historial = [] } = await req.json();

    if (!pregunta) {
      return new Response(
        JSON.stringify({
          error: "Debes enviar una pregunta.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ============================
    // CONSULTAR BASE DE DATOS
    // ============================

    const [productosRes, tiendasRes, categoriasRes, pedidosRes, calificacionesRes] = await Promise.all([
      supabase
        .from("productos")
        .select(`
          id_producto,
          nombre_producto,
          descripcion,
          precio_venta,
          precio_original,
          stock,
          id_tienda,
          categoria_id,
          tallas,
          colores
        `)
        .limit(50),

      supabase
        .from("tiendas")
        .select(`
          id_tienda,
          nombre_tienda,
          direccion,
          latitud,
          longitud
        `)
        .limit(50),

      supabase
        .from("categorias")
        .select("id_categoria, nombre_categoria")
        .limit(50),

      // Pedidos reales, para calcular productos/tiendas más comprados
      supabase
        .from("pedidos")
        .select("id_producto, id_tienda, cantidad, precio_unitario")
        .limit(2000),

      // Calificaciones de tiendas, para mostrar reputación al comprador
      supabase
        .from("calificaciones_tiendas")
        .select("tienda_id, puntuacion")
        .limit(2000),
    ]);

    if (productosRes.error) throw productosRes.error;
    if (tiendasRes.error) throw tiendasRes.error;
    if (categoriasRes.error) throw categoriasRes.error;
    if (pedidosRes.error) throw pedidosRes.error;
    if (calificacionesRes.error) throw calificacionesRes.error;

    const productos = productosRes.data || [];
    const tiendas = tiendasRes.data || [];
    const categorias = categoriasRes.data || [];
    const pedidos = pedidosRes.data || [];
    const calificaciones = calificacionesRes.data || [];

    // Relacionar tienda_id con nombre
    const mapaTiendas = {};

    tiendas.forEach((t) => {
      mapaTiendas[t.id_tienda] = t.nombre_tienda;
    });

    const mapaProductos = {};
    productos.forEach((p) => {
      mapaProductos[p.id_producto] = p.nombre_producto;
    });

    const mapaCategorias = {};
    categorias.forEach((c) => {
      mapaCategorias[c.id_categoria] = c.nombre_categoria;
    });

    // Calificación promedio por tienda
    const calificacionesPorTienda = {};
    calificaciones.forEach((c) => {
      if (!c.tienda_id) return;
      if (!calificacionesPorTienda[c.tienda_id]) calificacionesPorTienda[c.tienda_id] = [];
      calificacionesPorTienda[c.tienda_id].push(Number(c.puntuacion) || 0);
    });

    const promedioTienda = (idTienda) => {
      const arr = calificacionesPorTienda[idTienda];
      if (!arr || !arr.length) return null;
      const promedio = arr.reduce((a, b) => a + b, 0) / arr.length;
      return { promedio: promedio.toFixed(1), total: arr.length };
    };

    // ============================
    // VENTAS REALES (a partir de pedidos)
    // ============================

    const unidadesPorProducto = {};
    const ingresosPorTienda = {};

    pedidos.forEach((ped) => {
      const cantidad = Number(ped.cantidad) || 0;
      const monto = cantidad * (Number(ped.precio_unitario) || 0);

      if (ped.id_producto) {
        unidadesPorProducto[ped.id_producto] =
          (unidadesPorProducto[ped.id_producto] || 0) + cantidad;
      }
      if (ped.id_tienda) {
        ingresosPorTienda[ped.id_tienda] =
          (ingresosPorTienda[ped.id_tienda] || 0) + monto;
      }
    });

    const topProductos = Object.entries(unidadesPorProducto)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, unidades]) => ({
        nombre: mapaProductos[id] || "Producto no disponible",
        unidades,
      }));

    const topTiendas = Object.entries(ingresosPorTienda)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, ingresos]) => ({
        nombre: mapaTiendas[id] || "Tienda no disponible",
        ingresos,
      }));

    const contextoBD = `
PRODUCTOS DISPONIBLES

${productos
  .map(
    (p) => `• ${p.nombre_producto}
Precio: C$${p.precio_venta}
Precio anterior: ${
      p.precio_original ? `C$${p.precio_original}` : "Sin oferta"
    }
Stock: ${p.stock}
Categoría: ${mapaCategorias[p.categoria_id] || "Sin categoría"}
Tallas disponibles: ${p.tallas?.length ? p.tallas.join(", ") : "No aplica"}
Colores disponibles: ${p.colores?.length ? p.colores.join(", ") : "No aplica"}
Tienda: ${mapaTiendas[p.id_tienda] || "No disponible"}
Descripción: ${p.descripcion || "Sin descripción"}`
  )
  .join("\n\n")}

TIENDAS REGISTRADAS

${tiendas
  .map((t) => {
    const cal = promedioTienda(t.id_tienda);
    const mapsLink =
      t.latitud && t.longitud
        ? `https://www.google.com/maps?q=${t.latitud},${t.longitud}`
        : null;
    return `• ${t.nombre_tienda}
Dirección: ${t.direccion || "No especificada"}${
      mapsLink ? `\nUbicación en el mapa: ${mapsLink}` : ""
    }
Calificación: ${cal ? `${cal.promedio}/5 (${cal.total} opiniones)` : "Sin calificaciones todavía"}`;
  })
  .join("\n\n")}

CATEGORÍAS DISPONIBLES

${categorias.map((c) => `• ${c.nombre_categoria}`).join("\n")}

PRODUCTOS MÁS COMPRADOS (según pedidos reales registrados, de mayor a menor)

${
  topProductos.length
    ? topProductos
        .map((p, i) => `${i + 1}. ${p.nombre} — ${p.unidades} unidades vendidas`)
        .join("\n")
    : "Todavía no hay pedidos registrados en la plataforma."
}

TIENDAS CON MÁS VENTAS (según pedidos reales registrados, de mayor a menor)

${
  topTiendas.length
    ? topTiendas
        .map((t, i) => `${i + 1}. ${t.nombre} — C$${t.ingresos.toFixed(2)} en ventas`)
        .join("\n")
    : "Todavía no hay pedidos registrados en la plataforma."
}
`.trim();

    // ============================
    // HISTORIAL DEL CHAT
    // ============================

    const contents = historial.map((m) => ({
      role: m.de === "user" ? "user" : "model",
      parts: [{ text: m.texto }],
    }));

    contents.push({
      role: "user",
      parts: [{ text: pregunta }],
    });

    // ============================
    // LLAMADA A GEMINI (con reintentos si hay límite de peticiones)
    // ============================

    const llamarGemini = async () => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const body = JSON.stringify({
        system_instruction: {
          parts: [{ text: `${MANUAL_APP}\n\n${contextoBD}` }],
        },
        contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 700,
        },
      });

      const intentos = 3;
      const esperasMs = [800, 1800, 3500]; // backoff progresivo

      let ultimaRespuesta = null;
      let ultimoJson = null;

      for (let i = 0; i < intentos; i++) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        const json = await res.json();

        if (res.ok) {
          return { res, json };
        }

        ultimaRespuesta = res;
        ultimoJson = json;

        // Solo reintentamos si es un error transitorio (límite de peticiones,
        // servidor ocupado). Otros errores (clave inválida, mal request) no
        // mejoran reintentando.
        const reintentable = res.status === 429 || res.status >= 500;
        const esUltimoIntento = i === intentos - 1;

        if (!reintentable || esUltimoIntento) break;

        await new Promise((r) => setTimeout(r, esperasMs[i]));
      }

      return { res: ultimaRespuesta, json: ultimoJson };
    };

    const { res: geminiRes, json: geminiData } = await llamarGemini();

    if (!geminiRes.ok) {
      console.error(geminiData);

      const limiteAlcanzado = geminiRes.status === 429;

      return new Response(
        JSON.stringify({
          error: limiteAlcanzado
            ? "El asistente está recibiendo muchas preguntas en este momento. Intenta de nuevo en unos segundos."
            : "Gemini no respondió correctamente.",
          detalle: geminiData,
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const respuesta =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join("") ||
      "No encontré una respuesta.";

    return new Response(
      JSON.stringify({ respuesta }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
 } catch (error) {
  console.error("====== CHAT ASSISTANT ERROR ======");
  console.error(error);

  return new Response(
    JSON.stringify({
      error: error.message,
      stack: error.stack,
    }),
    {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}
});