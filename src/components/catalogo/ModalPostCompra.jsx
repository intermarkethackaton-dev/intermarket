import React from 'react';
import { Modal, Button, ListGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const ModalPostCompra = ({ mostrar, setMostrar, items, alCalificar }) => {

    const navigate = useNavigate();

    // Filtramos para evitar productos duplicados si compraron más de 1 unidad del mismo
    const itemsUnicos = items ? items.filter((v, i, a) => a.findIndex(t => (t.id_producto === v.id_producto)) === i) : [];

    return (
        <Modal show={mostrar} onHide={() => setMostrar(false)} centered>
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold text-success">
                    <i className="bi bi-check-circle-fill me-2"></i>¡Compra Exitosa!
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center pt-2">
                <p className="mb-4">Tu pedido ha sido enviado a los vendedores correspondientes.</p>
                
                {itemsUnicos.length > 0 && (
                    <>
                        <h6 className="fw-bold mb-3">¿Deseas calificar los productos que acabas de adquirir?</h6>
                        <ListGroup variant="flush" className="text-start">
                            {itemsUnicos.map(item => (
                                <ListGroup.Item key={item.id_producto} className="d-flex justify-content-between align-items-center px-0 py-3">
                                    <div className="d-flex align-items-center">
                                        {item.imagen_url && item.imagen_url.length > 0 ? (
                                            <img 
                                                src={item.imagen_url[0]} 
                                                alt={item.nombre_producto} 
                                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                                className="me-3"
                                            />
                                        ) : (
                                            <div className="bg-light me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '4px' }}>
                                                <i className="bi bi-image text-muted"></i>
                                            </div>
                                        )}
                                        <div className="text-truncate" style={{ maxWidth: '200px' }}>
                                            <strong>{item.nombre_producto}</strong>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm"
                                        onClick={() => {
                                            setMostrar(false);
                                            alCalificar(item);
                                        }}
                                    >
                                        Calificar
                                    </Button>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer className="border-0 pt-0 d-flex flex-column gap-2">
                <Button 
                    className="w-100" 
                    style={{
                        backgroundColor: "var(--color-primario)",
                        borderColor: "var(--color-primario)",
                        borderRadius: 50,
                        fontWeight: 600,
                    }}
                    onClick={() => {
                        setMostrar(false);
                        navigate("/mis-pedidos");
                    }}
                >
                    <i className="bi bi-truck me-2"></i>
                    Ver seguimiento de mi pedido
                </Button>
                <Button variant="secondary" className="w-100" style={{ borderRadius: 50 }} onClick={() => setMostrar(false)}>
                    Cerrar y seguir navegando
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ModalPostCompra;