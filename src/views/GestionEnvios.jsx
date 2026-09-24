import React, { useEffect, useState } from 'react';
import { Container, Table, Button, Badge, Card, Row, Col, Spinner, Alert, Modal } from 'react-bootstrap';
import { supabase } from '../database/supabaseconfig';
import { useAuth } from '../context/AuthContext';

const GestionEnvios = () => {
    const { user } = useAuth();
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [miTiendaId, setMiTiendaId] = useState(null);
    const [miPerfilId, setMiPerfilId] = useState(null);

    // Estado para el modal de detalle
    const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

    useEffect(() => {
        const obtenerMiTienda = async () => {
            if (!user) return;
            const { data: perfilData } = await supabase
                .from('perfiles')
                .select('perfil_id, id_tienda')
                .eq('id_usuario', user.id)
                .single();
            
            if (perfilData?.id_tienda) {
                setMiTiendaId(perfilData.id_tienda);
                setMiPerfilId(perfilData.perfil_id);
            }
        };
        obtenerMiTienda();
    }, [user]);

    const cargarPedidos = async () => {
        try {
            setCargando(true);
            if (!miTiendaId) return;

            const { data, error } = await supabase
                .from('pedidos')
                .select(`
                    *,
                    productos!inner(nombre_producto, imagen_url, id_tienda),
                    perfiles(usuarios(username, email)),
                    ventas(id_direccion, direcciones(*))
                `)
                .eq('productos.id_tienda', miTiendaId)
                .order('creado_en', { ascending: false });

            if (error) throw error;
            
            // Filtrar solo los que realmente pertenecen a la tienda (por si el join no lo hace estricto)
            const pedidosTienda = data.filter(p => p.productos !== null);
            setPedidos(pedidosTienda);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (miTiendaId) {
            cargarPedidos();

            // Suscripción en tiempo real
            const channel = supabase.channel('cambios_pedidos')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
                    cargarPedidos();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [miTiendaId]);

    const actualizarEstado = async (idPedido, nuevoEstado) => {
        try {
            // 1. Actualizar primero el estado del pedido en Supabase
            // ⚠️ CAMBIO: id_estado → id_estado_pedido
            const { error: errorEstado } = await supabase
                .from('pedidos')
                .update({ id_estado_pedido: nuevoEstado })
                .eq('id_pedido', idPedido);

            if (errorEstado) throw errorEstado;

            // 2. Si el nuevo estado es 2 (Aceptado), procedemos al stock
            if (nuevoEstado === 2 && pedidoSeleccionado) {
                const prodId = pedidoSeleccionado.id_producto;
                
                if (prodId) {
                    // Consultar stock actual directamente de la base de datos
                    const { data: producto } = await supabase
                        .from('productos')
                        .select('stock, nombre_producto')
                        .eq('id_producto', prodId)
                        .single();

                    if (producto) {
                        const cantidad = Number(pedidoSeleccionado.cantidad || 1);
                        const stockActual = Number(producto.stock || 0);
                        const nuevoStock = Math.max(0, stockActual - cantidad);

                        // Actualizar el stock
                        const { error: errStock } = await supabase
                            .from('productos')
                            .update({ stock: nuevoStock })
                            .eq('id_producto', prodId);
                        
                        if (!errStock) {
                            alert(`✅ ¡Pedido Aceptado! Stock de "${producto.nombre_producto}" actualizado a ${nuevoStock}`);
                            
                            // --- Alerta de Stock Bajo ---
                            if (nuevoStock <= 5 && miPerfilId) {
                                // ⚠️ CAMBIO: usuario_id → perfil_id (la columna real es perfil_id)
                                await supabase.from('notificaciones').insert([{
                                    perfil_id: miPerfilId,
                                    titulo: '⚠️ ¡Stock Bajo!',
                                    mensaje: `Atención: El producto "${producto.nombre_producto}" se está agotando. Quedan ${nuevoStock} unidades.`
                                }]);
                            }
                        } else {
                            console.error("Error stock:", errStock);
                        }
                    }
                }
            }

            // 3. Notificaciones y refrescar
            if (pedidoSeleccionado) {
                const msj = nuevoEstado === 2 ? 'Tu pedido ha sido aceptado.' : 
                            nuevoEstado === 4 ? 'Tu pedido ha sido entregado.' : 'Tu pedido ha sido cancelado.';
                
                // ⚠️ CAMBIO: usuario_id → perfil_id
                await supabase.from('notificaciones').insert([{
                    perfil_id: pedidoSeleccionado.perfil_id,
                    titulo: 'Actualización de Envío',
                    mensaje: msj
                }]);
            }

            setMostrarModalDetalle(false);
            cargarPedidos();
            
            if (nuevoEstado !== 2) {
                alert("Estado actualizado correctamente.");
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const getEstadoTexto = (id) => {
        switch(id) {
            case 1: return 'Pendiente';
            case 2: return 'Aceptado';
            case 3: return 'Cancelado';
            case 4: return 'Entregado';
            case 5: return 'En camino';
            default: return 'Desconocido';
        }
    };

    const getBadgeColor = (id) => {
        switch(id) {
            case 1: return 'warning';
            case 2: return 'success';
            case 3: return 'danger';
            case 4: return 'primary';
            case 5: return 'info';
            default: return 'secondary';
        }
    };

    const abrirDetalle = (pedido) => {
        setPedidoSeleccionado(pedido);
        setMostrarModalDetalle(true);
    };

    if (cargando) return <Container className="text-center py-5"><Spinner animation="border" variant="primary" /></Container>;

    return (
        <Container className="py-5">
            <header className="mb-5 d-flex justify-content-between align-items-center">
                <div>
                    <h2 className="fw-bold text-dark">Gestión de Envíos</h2>
                    <p className="text-muted">Administra los pedidos y entregas de tu tienda</p>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded-4">
                    <i className="bi bi-truck fs-3 text-primary"></i>
                </div>
            </header>

            {error && <Alert variant="danger">{error}</Alert>}

            {pedidos.length === 0 ? (
                <Card className="border-0 shadow-sm rounded-4 p-5 text-center bg-light">
                    <div className="mb-3">
                        <i className="bi bi-inbox fs-1 text-muted"></i>
                    </div>
                    <h4 className="fw-bold">No hay pedidos pendientes</h4>
                    <p className="text-muted">Cuando un cliente compre tus productos, aparecerán aquí.</p>
                </Card>
            ) : (
                <div className="table-responsive shadow-sm rounded-4 bg-white p-4">
                    <Table hover borderless className="align-middle">
                        <thead className="bg-light text-muted">
                            <tr>
                                <th className="ps-4">Producto</th>
                                <th>Cliente</th>
                                <th>Fecha</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th className="text-center pe-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pedidos.map((pedido) => (
                                <tr key={pedido.id_pedido} className="border-bottom border-light">
                                    <td className="ps-4">
                                        <div className="d-flex align-items-center">
                                            <img 
                                                src={pedido.productos?.imagen_url?.[0]} 
                                                className="rounded-3 me-3" 
                                                style={{ width: '45px', height: '45px', objectFit: 'cover' }}
                                                alt=""
                                            />
                                            <span className="fw-bold">{pedido.productos?.nombre_producto}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex flex-column">
                                            <span>{pedido.ventas?.direcciones?.nombre} {pedido.ventas?.direcciones?.apellido}</span>
                                            <small className="text-muted">@{pedido.perfiles?.usuarios?.username}</small>
                                        </div>
                                    </td>
                                    <td>{new Date(pedido.creado_en).toLocaleDateString()}</td>
                                    <td className="fw-bold text-dark">C${Number(pedido.precio_unitario).toFixed(2)}</td>
                                    <td>
                                        <Badge bg={getBadgeColor(pedido.id_estado_pedido)} className="px-3 py-2 rounded-pill shadow-sm">
                                            {getEstadoTexto(pedido.id_estado_pedido)}
                                        </Badge>
                                    </td>
                                    <td className="text-center pe-4">
                                        <div className="d-flex justify-content-center gap-2">
                                            <Button 
                                                variant="outline-primary" 
                                                size="sm" 
                                                className="rounded-pill px-3"
                                                onClick={() => abrirDetalle(pedido)}
                                            >
                                                <i className="bi bi-eye me-1"></i> Detalles
                                            </Button>
                                            {pedido.id_estado_pedido === 5 && (
                                                <Button 
                                                    variant="success" 
                                                    size="sm" 
                                                    className="rounded-pill px-3 shadow-sm"
                                                    onClick={() => actualizarEstado(pedido.id_pedido, 4)}
                                                >
                                                    <i className="bi bi-check2-circle me-1"></i> Entregar
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}

            {/* MODAL DETALLE MEJORADO */}
            <Modal show={mostrarModalDetalle} onHide={() => setMostrarModalDetalle(false)} centered size="lg">
                <Modal.Header closeButton className="border-0 p-4">
                <Modal.Title className="fw-bold">
                    <i className="bi bi-box-seam me-2 text-primary"></i>
                    Detalles del Envío
                </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4 pt-0">
                {pedidoSeleccionado && (
                    <Row className="g-4">
                    <Col md={6}>
                        <div className="mb-4">
                        <h6 className="text-muted fw-bold text-uppercase small mb-3">Información del Cliente</h6>
                        <div className="bg-light p-3 rounded-4">
                            <div className="d-flex align-items-center mb-2">
                                <div className="bg-white p-2 rounded-circle me-3 shadow-sm">
                                <i className="bi bi-person text-primary"></i>
                                </div>
                                <div>
                                <div className="fw-bold">{pedidoSeleccionado.ventas?.direcciones?.nombre} {pedidoSeleccionado.ventas?.direcciones?.apellido}</div>
                                <small className="text-muted">@{pedidoSeleccionado.perfiles?.usuarios?.username}</small>
                                </div>
                            </div>
                            <p className="mb-1 small"><i className="bi bi-envelope me-2 text-muted"></i>{pedidoSeleccionado.perfiles?.usuarios?.email}</p>
                            <p className="mb-0 small"><i className="bi bi-telephone me-2 text-muted"></i>{pedidoSeleccionado.ventas?.direcciones?.numero_telefono}</p>
                        </div>
                        </div>

                        <div>
                        <h6 className="text-muted fw-bold text-uppercase small mb-3">Dirección de Entrega</h6>
                        <div className="p-3 border rounded-4 bg-white shadow-sm">
                            <p className="mb-2"><strong>Calle:</strong> {pedidoSeleccionado.ventas?.direcciones?.nombre_calle}</p>
                            <p className="mb-2"><strong>C. Postal:</strong> <Badge bg="secondary" className="rounded-pill">{pedidoSeleccionado.ventas?.direcciones?.codigo_postal || 'N/A'}</Badge></p>
                            {pedidoSeleccionado.ventas?.direcciones?.descripcion && (
                                <div className="mt-2 pt-2 border-top">
                                <small className="text-muted d-block mb-1">Referencias:</small>
                                <div className="p-2 bg-light rounded small italic">
                                    {pedidoSeleccionado.ventas?.direcciones?.descripcion}
                                </div>
                                </div>
                            )}
                        </div>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="mb-4">
                        <h6 className="text-muted fw-bold text-uppercase small mb-3">Producto Vendido</h6>
                        <div className="d-flex align-items-center p-3 border rounded-4 bg-white shadow-sm">
                            <img 
                                src={pedidoSeleccionado.productos?.imagen_url?.[0]} 
                                className="rounded-3 me-3 shadow-sm" 
                                style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                                alt=""
                            />
                            <div>
                                <div className="fw-bold">{pedidoSeleccionado.productos?.nombre_producto}</div>
                                <div className="text-primary fw-bold" style={{ fontSize: '1.2rem' }}>C${Number(pedidoSeleccionado.precio_unitario).toFixed(2)}</div>
                                <Badge bg="light" text="dark" className="border mt-1">Pedido #{pedidoSeleccionado.id_pedido.slice(0,8)}</Badge>
                            </div>
                        </div>
                        </div>

                        <div>
                        <h6 className="text-muted fw-bold text-uppercase small mb-3">Acciones de Logística</h6>
                        <div className="d-grid gap-2">
                            {pedidoSeleccionado.id_estado_pedido === 1 && (
                                <Button variant="primary" size="lg" className="rounded-pill shadow-sm py-3" onClick={() => actualizarEstado(pedidoSeleccionado.id_pedido, 2)}>
                                    <i className="bi bi-box-seam me-2"></i> Aceptar y Preparar
                                </Button>
                            )}
                            {pedidoSeleccionado.id_estado_pedido === 5 && (
                                <Button variant="success" size="lg" className="rounded-pill shadow-sm py-3" onClick={() => actualizarEstado(pedidoSeleccionado.id_pedido, 4)}>
                                    <i className="bi bi-check2-circle me-2"></i> Confirmar Entrega
                                </Button>
                            )}
                            <div className="d-flex gap-2 mt-2">
                                {pedidoSeleccionado.id_estado_pedido !== 4 && pedidoSeleccionado.id_estado_pedido !== 3 && (
                                    <Button variant="outline-danger" className="rounded-pill flex-grow-1" onClick={() => actualizarEstado(pedidoSeleccionado.id_pedido, 3)}>
                                        <i className="bi bi-x-circle me-1"></i> Cancelar
                                    </Button>
                                )}
                                <Button variant="outline-secondary" className="rounded-pill flex-grow-1" onClick={() => window.print()}>
                                    <i className="bi bi-printer me-1"></i> Imprimir
                                </Button>
                            </div>
                        </div>
                        </div>
                    </Col>
                    </Row>
                )}
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default GestionEnvios;