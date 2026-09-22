import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FormularioLogin from '../components/login/FormularioLogin';
import { supabase } from "../database/supabaseconfig";
import { useAuth } from "../context/AuthContext";
import { asegurarPerfil, asegurarUsuario } from "../services/perfilService";
import logoCompleto from "../assets/LogoCom1.png";
import "../App.css";

function Login() {
  const [usuario, setUsuario] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const navegar = useNavigate();
  const { user, loading, role } = useAuth();

  const iniciarSesion = async () => {
    try {
      setCargando(true);
      setError(null);
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: usuario,
        password: contraseña,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Por favor, confirma tu correo electrónico antes de iniciar sesión.");
        } else {
          setError(authError.message || "Error al iniciar sesión. Intenta de nuevo.");
        }
        return;
      }

      if (data?.user) {
        await asegurarUsuario(data.user);
        await asegurarPerfil(data.user.id);
      }

      localStorage.removeItem("rol-activo");
      
    } catch (err) {
      console.error("Error en iniciarSesion:", err);
      setError("Error de conexión con el servidor. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const iniciarSesionConGoogle = async () => {
    try {
      setCargando(true);
      setError(null);
      localStorage.removeItem("rol-activo");
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        console.error("Error de Google:", error);
        if (error.message.includes("provider is not enabled")) {
          setError("Google no está configurado en el sistema. Contacta al administrador.");
        } else {
          setError("Error al iniciar sesión con Google. Intenta de nuevo.");
        }
        setCargando(false);
      }
    } catch (err) {
      console.error("Error en iniciarSesionConGoogle:", err);
      setError("Error de conexión con Google.");
      setCargando(false);
    }
  };

  const iniciarSesionConApple = async () => {
    try {
      setCargando(true);
      setError(null);
      localStorage.removeItem("rol-activo");
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { 
          redirectTo: window.location.origin,
        }
      });
      
      if (error) {
        console.error("Error de Apple:", error);
        if (error.message.includes("provider is not enabled")) {
          setError("Apple no está configurado en el sistema. Contacta al administrador.");
        } else {
          setError("Error al iniciar sesión con Apple. Intenta de nuevo.");
        }
        setCargando(false);
      }
    } catch (err) {
      console.error("Error en iniciarSesionConApple:", err);
      setError("Error de conexión con Apple.");
      setCargando(false);
    }
  };

  // Efecto para manejar redirección después de login con OAuth
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      if (user && !loading) {
        try {
          await asegurarUsuario(user);
          await asegurarPerfil(user.id);
        } catch (err) {
          console.error("Error asegurando usuario/perfil en OAuth:", err);
          setError("Error al completar el perfil. Intenta de nuevo.");
          return;
        }
        
        if (role === 'admin') {
          navegar("/admin-inicio", { replace: true });
        } else {
          navegar("/seleccion-rol", { replace: true });
        }
      }
    };

    handleOAuthRedirect();
  }, [user, loading, role, navegar]);

  // Efecto para verificar sesión OAuth existente
  useEffect(() => {
    const checkOAuthSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !loading) {
        try {
          await asegurarUsuario(session.user);
          await asegurarPerfil(session.user.id);
        } catch (err) {
          console.error("Error asegurando usuario/perfil en sesión existente:", err);
          setError("Error al completar el perfil. Intenta de nuevo.");
          return;
        }
        
        if (role === 'admin') {
          navegar("/admin-inicio", { replace: true });
        } else {
          navegar("/seleccion-rol", { replace: true });
        }
      }
    };

    checkOAuthSession();
  }, [loading, role, navegar]);

  const MobileLoginView = () => (
    <div className="login-mobile-view">
      <div className="login-mobile-header">
        <img src={logoCompleto} alt="InterMarket" className="login-mobile-logo" />
        <span className="login-mobile-subtitle">Conecta, Intercambia, crece</span>
      </div>

      <div className="login-mobile-panel">
        <h1 className="login-mobile-title">Inicia sesión</h1>
        <p className="login-mobile-description">Ingresa tus datos para continuar en InterMarket.</p>

        <FormularioLogin
          usuario={usuario}
          contraseña={contraseña}
          error={error}
          setUsuario={setUsuario}
          setContraseña={setContraseña}
          iniciarSesion={iniciarSesion}
          iniciarSesionConGoogle={iniciarSesionConGoogle}
          iniciarSesionConApple={iniciarSesionConApple}
          cargando={cargando}
        />

        <div className="login-mobile-footer">
          <span>¿No tienes cuenta? </span>
          <button type="button" className="login-mobile-link" onClick={() => navegar("/registro")}>
            Regístrate gratis
          </button>
        </div>
      </div>
    </div>
  );

  const DesktopLoginView = () => (
    <div className="login-desktop-view">
      <div className="login-desktop-hero">
        <div className="login-desktop-blob login-desktop-blob-a" aria-hidden="true" />
        <div className="login-desktop-blob login-desktop-blob-b" aria-hidden="true" />
        <div className="login-desktop-brand">
          <img src={logoCompleto} alt="InterMarket" className="login-desktop-logo" />
          <p className="login-desktop-tagline">Conecta, Intercambia, Crece</p>
        </div>
      </div>

      <div className="login-desktop-panel">
        <div className="auth-card">
          <h1 className="auth-card-title">Iniciar Sesión</h1>
          <p className="auth-card-subtitle">Ingresa tus datos para continuar en InterMarket.</p>

          <FormularioLogin
            usuario={usuario}
            contraseña={contraseña}
            error={error}
            setUsuario={setUsuario}
            setContraseña={setContraseña}
            iniciarSesion={iniciarSesion}
            iniciarSesionConGoogle={iniciarSesionConGoogle}
            iniciarSesionConApple={iniciarSesionConApple}
            cargando={cargando}
          />

          <div className="auth-sheet-footer">
            <small>
              ¿No tienes cuenta?{" "}
              <span className="auth-sheet-link" onClick={() => navegar("/registro")}>
                Regístrate gratis
              </span>
            </small>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <MobileLoginView />
      <DesktopLoginView />
    </div>
  );
}

export default Login;