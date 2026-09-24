// src/components/vendedor/ModalEstimadoEnvio.jsx
import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { guardarEstimadoEnvio } from "../../services/pedidosService";
import { idCorto, formatearMonto } from "../../utils/seguimiento";

const ModalEstimadoEnvio = ({ mostrar, onHide, pedido, onGuardado }) => {
  const [dias, setDias] = useState("");
  const [horas, setHoras] = useState("");
  const [numeroGuia, setNumeroGuia] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mostrar && pedido) {
      setDias(pedido.dias_estimados ?? "");
      setHoras(pedido.horas_estimadas ?? "");
      setNumeroGuia(pedido.numero_guia ?? "");
      setError("");
    }
  }, [mostrar, pedido]);

  const handleGuardar = async () => {
    const d = Number(dias) || 0;
    const h = Number(horas) || 0;

    if (d === 0 && h === 0) {
      setError("Debes indicar al menos un día o una hora.");
      return;
    }
    if (h < 0 || h > 23) {
      setError("Las horas deben estar entre 0 y 23.");
      return;
    }
    if (d < 0) {
      setError("Los días no pueden ser negativos.");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      await guardarEstimadoEnvio(pedido.id_pedido, {
        dias: d,
        horas: h,
        numeroGuia: numeroGuia.trim(),
      });
      onGuardado?.();
      onHide?.();
    } catch (err) {
      console.error("ERROR GUARDANDO ESTIMADO:", err);
      setError(
        `No se pudo guardar. ${err?.message || "Intenta de nuevo."}`
      );
    } finally {
      setGuardando(false);
    }
  };

  if (!pedido) return null;

  const nombreComprador =
    pedido.perfiles?.usuarios?.username || "Comprador";
  const subtotal =
    Number(pedido.precio_unitario || 0) * Number(pedido.cantidad || 1);

  return (
    <Modal show={mostrar} onHide={onHide} centered className="me-modal">
      <Modal.Body className="me-body">
        <div className="me-header">
          <div className="me-header-icon">
            <i className="bi bi-truck"></i>
          </div>
          <div>
            <h5>Poner estimado de envío</h5>
            <p>
              Pedido #{idCorto(pedido.id_pedido)} · {nombreComprador}
            </p>
          </div>
        </div>

        <div className="me-producto">
          <div className="me-producto-info">
            <strong>{pedido.productos?.nombre_producto || "Producto"}</strong>
            <span>
              x{pedido.cantidad}
              {pedido.talla_seleccionada && ` · Talla ${pedido.talla_seleccionada}`}
              {pedido.color_seleccionado && ` · ${pedido.color_seleccionado}`}
            </span>
          </div>
          <div className="me-producto-precio">{formatearMonto(subtotal)}</div>
        </div>

        <div className="me-seccion">
          <label className="me-label">
            ¿Cuánto tardará en llegar?
          </label>

          <div className="me-tiempo-inputs">
            <div className="me-input-group">
              <Form.Control
                type="number"
                min="0"
                max="365"
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                placeholder="0"
                disabled={guardando}
              />
              <span>días</span>
            </div>

            <div className="me-input-group">
              <Form.Control
                type="number"
                min="0"
                max="23"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                placeholder="0"
                disabled={guardando}
              />
              <span>horas</span>
            </div>
          </div>

          <small className="me-hint">
            <i className="bi bi-info-circle"></i>
            Consulta con tu mensajero y escribe el tiempo que te indique.
          </small>
        </div>

        <div className="me-seccion">
          <label className="me-label">Número de guía (opcional)</label>
          <Form.Control
            type="text"
            value={numeroGuia}
            onChange={(e) => setNumeroGuia(e.target.value)}
            placeholder="Ej: CT-8842-NI"
            maxLength={60}
            disabled={guardando}
          />
        </div>

        {error && (
          <div className="me-error">
            <i className="bi bi-exclamation-circle"></i>
            {error}
          </div>
        )}

        <div className="me-actions">
          <Button
            variant="light"
            className="me-btn-cancel"
            onClick={onHide}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            className="me-btn-save"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? (
              <>
                <Spinner size="sm" animation="border" /> Guardando...
              </>
            ) : (
              <>
                <i className="bi bi-check2-circle"></i> Guardar estimado
              </>
            )}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default ModalEstimadoEnvio;