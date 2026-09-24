// src/services/pedidosService.js
// Todas las queries de pedidos para comprador y vendedor.

import { supabase } from "../database/supabaseconfig";

/**
 * Obtiene el perfil_id e id_tienda del usuario actual.
 */
export async function obtenerMiPerfilCompleto(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("perfiles")
    .select("perfil_id, id_tienda, id_usuario")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Obtiene TODAS las tiendas del vendedor (auth.users.id).
 * Un vendedor puede tener varias tiendas.
 */
export async function obtenerTiendasDelVendedor(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("tiendas")
    .select("id_tienda, nombre_tienda, imagen_url, creado_en")
    .eq("id_usuario", userId)
    .order("creado_en", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * PEDIDOS DEL COMPRADOR
 * Agrupa por venta_id para mostrar una tarjeta por compra.
 */
export async function obtenerPedidosComprador(perfilId) {
  if (!perfilId) return [];

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      id_pedido,
      venta_id,
      id_estado_pedido,
      id_producto,
      id_tienda,
      cantidad,
      precio_unitario,
      talla_seleccionada,
      color_seleccionado,
      creado_en,
      numero_guia,
      dias_estimados,
      horas_estimadas,
      fecha_estimada_entrega,
      fecha_enviado,
      fecha_entregado,
      actualizado_en,
      productos (
        nombre_producto,
        imagen_url
      ),
      tiendas (
        nombre_tienda,
        imagen_url
      )
    `)
    .eq("perfil_id", perfilId)
    .order("creado_en", { ascending: false });

  if (error) throw error;

  return agruparPorVenta(data || []);
}

/**
 * Agrupa pedidos por venta_id.
 */
function agruparPorVenta(pedidos) {
  const mapa = new Map();

  pedidos.forEach((p) => {
    const key = p.venta_id || p.id_pedido;
    if (!mapa.has(key)) {
      mapa.set(key, {
        venta_id: key,
        creado_en: p.creado_en,
        items: [],
        estadoGlobal: p.id_estado_pedido,
        estimado: {
          numero_guia: p.numero_guia,
          dias_estimados: p.dias_estimados,
          horas_estimadas: p.horas_estimadas,
          fecha_estimada_entrega: p.fecha_estimada_entrega,
          fecha_enviado: p.fecha_enviado,
          fecha_entregado: p.fecha_entregado,
          id_estado_pedido: p.id_estado_pedido,
        },
        tienda: p.tiendas,
      });
    }

    const grupo = mapa.get(key);
    grupo.items.push(p);

    if (!grupo.estimado.fecha_estimada_entrega && p.fecha_estimada_entrega) {
      grupo.estimado = {
        numero_guia: p.numero_guia,
        dias_estimados: p.dias_estimados,
        horas_estimadas: p.horas_estimadas,
        fecha_estimada_entrega: p.fecha_estimada_entrega,
        fecha_enviado: p.fecha_enviado,
        fecha_entregado: p.fecha_entregado,
        id_estado_pedido: p.id_estado_pedido,
      };
    }

    const estadosActivos = grupo.items
      .map((i) => i.id_estado_pedido)
      .filter((e) => e !== 3);

    if (estadosActivos.length === 0) {
      grupo.estadoGlobal = 3;
    } else if (estadosActivos.every((e) => e === 4)) {
      grupo.estadoGlobal = 4;
    } else {
      grupo.estadoGlobal = Math.min(...estadosActivos);
    }
  });

  return Array.from(mapa.values()).sort(
    (a, b) => new Date(b.creado_en) - new Date(a.creado_en)
  );
}

/**
 * PEDIDOS DEL VENDEDOR
 * Recibe un array de IDs de tiendas (el vendedor puede tener varias).
 * Si se pasa un array vacío, devuelve [].
 */
export async function obtenerPedidosVendedor(idsTiendas) {
  if (!Array.isArray(idsTiendas) || idsTiendas.length === 0) return [];

  const { data, error } = await supabase
    .from("pedidos")
    .select(`
      id_pedido,
      venta_id,
      id_estado_pedido,
      id_producto,
      id_tienda,
      cantidad,
      precio_unitario,
      talla_seleccionada,
      color_seleccionado,
      creado_en,
      numero_guia,
      dias_estimados,
      horas_estimadas,
      fecha_estimada_entrega,
      fecha_enviado,
      fecha_entregado,
      actualizado_en,
      productos (
        nombre_producto,
        imagen_url
      ),
      tiendas (
        id_tienda,
        nombre_tienda
      ),
      perfiles (
        perfil_id,
        usuarios (
          username,
          email
        )
      )
    `)
    .in("id_tienda", idsTiendas)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Actualiza el estado de un pedido.
 */
export async function actualizarEstadoPedido(idPedido, nuevoEstado) {
  const payload = { id_estado_pedido: nuevoEstado };

  if (nuevoEstado === 5) {
    payload.fecha_enviado = new Date().toISOString();
  }
  if (nuevoEstado === 4) {
    payload.fecha_entregado = new Date().toISOString();
  }

  const { error } = await supabase
    .from("pedidos")
    .update(payload)
    .eq("id_pedido", idPedido);

  if (error) throw error;
}

/**
 * Guarda el estimado de envío que pone el vendedor manualmente.
 */
export async function guardarEstimadoEnvio(idPedido, {
  dias,
  horas,
  numeroGuia,
}) {
  const ahora = new Date();
  const ms =
    (Number(dias) || 0) * 24 * 60 * 60 * 1000 +
    (Number(horas) || 0) * 60 * 60 * 1000;

  const fechaEstimada = new Date(ahora.getTime() + ms).toISOString();

  const { error } = await supabase
    .from("pedidos")
    .update({
      dias_estimados: Number(dias) || 0,
      horas_estimadas: Number(horas) || 0,
      numero_guia: numeroGuia || null,
      fecha_estimada_entrega: fechaEstimada,
      id_estado_pedido: 5,
      fecha_enviado: ahora.toISOString(),
    })
    .eq("id_pedido", idPedido);

  if (error) throw error;
}

/**
 * Marca varios pedidos de la misma venta como aceptados.
 */
export async function aceptarPedidosDeVenta(ventaId) {
  const { error } = await supabase
    .from("pedidos")
    .update({ id_estado_pedido: 2 })
    .eq("venta_id", ventaId)
    .eq("id_estado_pedido", 1);

  if (error) throw error;
}

/**
 * Cuenta pedidos por estado.
 */
export function contarPorEstado(pedidos) {
  return {
    todos: pedidos.length,
    pendientes: pedidos.filter((p) => p.id_estado_pedido === 1).length,
    aceptados: pedidos.filter((p) => p.id_estado_pedido === 2).length,
    enCamino: pedidos.filter((p) => p.id_estado_pedido === 5).length,
    entregados: pedidos.filter((p) => p.id_estado_pedido === 4).length,
    cancelados: pedidos.filter((p) => p.id_estado_pedido === 3).length,
  };
}