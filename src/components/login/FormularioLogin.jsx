import React, { useState } from 'react';
import { Form, Button, Alert, InputGroup } from 'react-bootstrap';

const FormularioLogin = ({ 
  usuario, 
  contraseña, 
  error, 
  setUsuario, 
  setContraseña, 
  iniciarSesion, 
  iniciarSesionConGoogle,
  iniciarSesionConApple,
  cargando 
}) => {
  const [mostrarContraseña, setMostrarContraseña] = useState(false);

  return (
    <Form onSubmit={(e) => { e.preventDefault(); iniciarSesion(); }}>
      {error && <Alert variant="danger" className="border-0 rounded-4 text-center small py-2 mb-3 shadow-sm">{error}</Alert>}
      
      <Form.Group className="mb-3">
        <InputGroup className="unique-input-group">
          <InputGroup.Text>
            <i className="bi bi-envelope"></i>
          </InputGroup.Text>
          <Form.Control
            type="email"
            placeholder="Email"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
        </InputGroup>
      </Form.Group>

      <Form.Group className="mb-3">
        <InputGroup className="unique-input-group">
          <InputGroup.Text>
            <i className="bi bi-lock"></i>
          </InputGroup.Text>
          <Form.Control
            type={mostrarContraseña ? 'text' : 'password'}
            placeholder="Contraseña"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            required
          />
          <InputGroup.Text 
            onClick={() => setMostrarContraseña(!mostrarContraseña)}
            style={{ cursor: 'pointer' }}
          >
            <i className={`bi ${mostrarContraseña ? 'bi-eye-slash' : 'bi-eye'}`}></i>
          </InputGroup.Text>
        </InputGroup>
      </Form.Group>

      <div className="auth-remember-row">
        <label className="auth-remember-check">
          <input type="checkbox" /> Recordarme
        </label>
        <a href="#" className="auth-forgot-link" onClick={(e) => e.preventDefault()}>
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <Button type="submit" className="unique-login-btn w-100 shadow mb-3" disabled={cargando}>
        {cargando ? (
          <><span className="spinner-border spinner-border-sm me-2"></span> Entrando...</>
        ) : 'Iniciar Sesión'}
      </Button>

      <div className="auth-divider">
        <hr />
        <span>Or</span>
        <hr />
      </div>

      <Button 
        type="button" 
        className="auth-oauth-btn w-100 shadow-sm d-flex justify-content-center align-items-center" 
        onClick={iniciarSesionConGoogle}
        disabled={cargando}
      >
        <i className="bi bi-google me-2 text-danger"></i> Continuar con Google
      </Button>

      <Button 
        type="button" 
        className="auth-oauth-btn auth-oauth-btn--apple w-100 shadow-sm d-flex justify-content-center align-items-center" 
        onClick={iniciarSesionConApple}
        disabled={cargando}
      >
        <i className="bi bi-apple me-2"></i> Continuar con Apple
      </Button>
    </Form>
  );
};

export default FormularioLogin;