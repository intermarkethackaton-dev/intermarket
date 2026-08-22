import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Spinner,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import { supabase } from "../database/supabaseconfig";
import TarjetaCatalogo from "../components/catalogo/TarjetaCatalogo";

// Misma lógica que en Catálogo
const obtenerIconoCategoria = (nombre = "") => {
  const n = String(nombre)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (n.includes("ropa") || n.includes("vestiment") || n.includes("moda"))
    return "bi-handbag";
  if (n.includes("zapato") || n.includes("calzado")) return "bi-tag";
  if (
    n.includes("electron") ||
    n.includes("tecnolog") ||
    n.includes("celular") ||
    n.includes("phone")
  )
    return "bi-phone";
  if (n.includes("hogar") || n.includes("casa") || n.includes("muebles"))
    return "bi-house";
  if (n.includes("comida") || n.includes("alimento") || n.includes("bebida"))
    return "bi-cup-hot";
  if (n.includes("deporte") || n.includes("fitness")) return "bi-trophy";
  if (n.includes("juego") || n.includes("gamer") || n.includes("videojuego"))
    return "bi-controller";
  if (n.includes("belleza") || n.includes("cosmet")) return "bi-stars";
  if (n.includes("libro") || n.includes("educacion")) return "bi-book";
  if (
    n.includes("juguete") ||
    n.includes("nin") ||
    n.includes("bebe") ||
    n.includes("bebé")
  )
    return "bi-emoji-smile";
  if (n.includes("mascota") || n.includes("pet")) return "bi-heart";
  if (n.includes("herramient") || n.includes("ferreter")) return "bi-tools";
  if (n.includes("auto") || n.includes("vehiculo") || n.includes("carro"))
    return "bi-car-front";
  if (n.includes("salud") || n.includes("farmacia")) return "bi-heart-pulse";
  if (n.includes("accesorio")) return "bi-watch";
  if (n.includes("oferta") || n.includes("promo")) return "bi-tag";

  return "bi-grid";
};

const InicioComprador = () => {
  const navigate = useNavigate();

  const [productosDestacados, setProductosDestacados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      const catCache = sessionStorage.getItem("cache-categorias-inicio");

      if (catCache) {
        try {
          setCategorias(JSON.parse(catCache));
        } catch (error) {
          console.error("Error leyendo categorías del cache:", error);
        }
      }

      try {
        const [prodResponse, catResponse] = await Promise.all([
          supabase
            .from("productos")
            .select(
              "*, categorias(nombre_categoria), tiendas(perfiles(usuarios(username)))"
            )
            .order("creado_en", {
              ascending: false,
            })
            .limit(4),

          supabase.from("categorias").select("*").limit(6),
        ]);

        if (prodResponse.error) {
          console.error("Error cargando productos:", prodResponse.error);
        }

        if (catResponse.error) {
          console.error("Error cargando categorías:", catResponse.error);
        }

        if (prodResponse.data) {
          setProductosDestacados(prodResponse.data);
        }

        if (catResponse.data) {
          setCategorias(catResponse.data);
          sessionStorage.setItem(
            "cache-categorias-inicio",
            JSON.stringify(catResponse.data)
          );
        }
      } catch (error) {
        console.error("Error al cargar inicio:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  return (
    <div className="inicio-comprador">
      {/* =====================================================
          HERO
      ===================================================== */}
      <section className="inicio-hero">
        <div className="inicio-hero-orb inicio-hero-orb-1"></div>
        <div className="inicio-hero-orb inicio-hero-orb-2"></div>

        <Container className="position-relative">
          <Row className="align-items-center g-5">
            <Col lg={6}>
              <div className="inicio-hero-content">
                <div className="inicio-hero-badge">
                  <span className="inicio-hero-badge-dot"></span>
                  <span>Compra local. Compra seguro.</span>
                </div>

                <h1 className="inicio-hero-title">
                  Descubre algo
                  <span> increíble </span>
                  cerca de ti.
                </h1>

                <p className="inicio-hero-description">
                  Explora productos únicos de vendedores locales, encuentra lo
                  que necesitas y disfruta de una experiencia de compra simple,
                  segura y moderna.
                </p>

                <div className="inicio-hero-actions">
                  <Button
                    className="inicio-primary-button"
                    onClick={() => navigate("/catalogo")}
                  >
                    <i className="bi bi-grid me-2"></i>
                    Explorar catálogo
                    <i className="bi bi-arrow-right ms-2"></i>
                  </Button>

                  <Button
                    className="inicio-secondary-button"
                    onClick={() => navigate("/mensajes")}
                  >
                    <i className="bi bi-chat-dots me-2"></i>
                    Mis mensajes
                  </Button>
                </div>

                <div className="inicio-hero-stats">
                  <div className="inicio-stat">
                    <div className="inicio-stat-icon">
                      <i className="bi bi-shop"></i>
                    </div>
                    <div>
                      <strong>Vendedores</strong>
                      <small>Locales</small>
                    </div>
                  </div>

                  <div className="inicio-stat-divider"></div>

                  <div className="inicio-stat">
                    <div className="inicio-stat-icon">
                      <i className="bi bi-shield-check"></i>
                    </div>
                    <div>
                      <strong>Compra segura</strong>
                      <small>Siempre</small>
                    </div>
                  </div>

                  <div className="inicio-stat-divider"></div>

                  <div className="inicio-stat">
                    <div className="inicio-stat-icon">
                      <i className="bi bi-truck"></i>
                    </div>
                    <div>
                      <strong>Envíos</strong>
                      <small>Locales</small>
                    </div>
                  </div>
                </div>
              </div>
            </Col>

            <Col lg={6}>
              <div className="inicio-hero-visual">
                <div className="inicio-hero-glow"></div>

                <div className="inicio-shopping-card">
                  <div className="inicio-shopping-card-top">
                    <div className="inicio-shopping-avatar">
                      <i className="bi bi-bag-heart"></i>
                    </div>
                    <div>
                      <span>InterMarket</span>
                      <strong>Tu mercado, más cerca</strong>
                    </div>
                    <div className="inicio-shopping-check">
                      <i className="bi bi-check-lg"></i>
                    </div>
                  </div>

                  <div className="inicio-shopping-image">
                    <img
                      src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=900"
                      alt="Compras en InterMarket"
                      loading="lazy"
                    />
                    <div className="inicio-image-overlay"></div>

                    <div className="inicio-floating-price">
                      <small>Descubre</small>
                      <strong>Nuevos productos</strong>
                    </div>
                  </div>

                  <div className="inicio-shopping-footer">
                    <div>
                      <span>Compra inteligente</span>
                      <strong>Encuentra lo que buscas</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/catalogo")}
                      aria-label="Ver catálogo"
                    >
                      <i className="bi bi-arrow-up-right"></i>
                    </button>
                  </div>
                </div>

                <div className="inicio-floating-card inicio-floating-card-top">
                  <div className="inicio-floating-icon red">
                    <i className="bi bi-heart-fill"></i>
                  </div>
                  <div>
                    <strong>Hecho para ti</strong>
                    <small>Productos destacados</small>
                  </div>
                </div>

                <div className="inicio-floating-card inicio-floating-card-bottom">
                  <div className="inicio-floating-icon green">
                    <i className="bi bi-shield-check"></i>
                  </div>
                  <div>
                    <strong>Compra protegida</strong>
                    <small>Tu seguridad importa</small>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* =====================================================
          CATEGORÍAS
      ===================================================== */}
      <section className="inicio-section">
        <Container>
          <div className="inicio-section-heading">
            <div>
              <span className="inicio-section-kicker">EXPLORA</span>
              <h2>Encuentra lo que buscas</h2>
              <p>
                Navega por nuestras categorías y descubre nuevas opciones.
              </p>
            </div>

            <Button
              className="inicio-outline-button"
              onClick={() => navigate("/catalogo")}
            >
              Ver catálogo
              <i className="bi bi-arrow-right ms-2"></i>
            </Button>
          </div>

          <Row className="g-4">
            {cargando && categorias.length === 0 ? (
              <Col xs={12}>
                <div className="inicio-loading">
                  <Spinner animation="border" />
                  <span>Cargando categorías...</span>
                </div>
              </Col>
            ) : (
              categorias.map((cat) => (
                <Col key={cat.id_categoria} xs={6} md={4} lg={2}>
                  <Card
                    className="inicio-category-card"
                    onClick={() =>
                      navigate(`/catalogo?categoria=${cat.id_categoria}`)
                    }
                  >
                    <div className="inicio-category-icon">
                      <i
                        className={`bi ${obtenerIconoCategoria(
                          cat.nombre_categoria
                        )}`}
                      ></i>
                    </div>

                    <h6>{cat.nombre_categoria}</h6>

                    <span>
                      Explorar
                      <i className="bi bi-arrow-up-right"></i>
                    </span>
                  </Card>
                </Col>
              ))
            )}
          </Row>
        </Container>
      </section>

      {/* =====================================================
          PRODUCTOS DESTACADOS
      ===================================================== */}
      <section className="inicio-products-section">
        <Container>
          <div className="inicio-section-heading">
            <div>
              <span className="inicio-section-kicker">DESTACADOS</span>
              <h2>Novedades para ti</h2>
              <p>
                Descubre algunos de los productos más recientes del marketplace.
              </p>
            </div>

            <Button
              className="inicio-outline-button"
              onClick={() => navigate("/catalogo")}
            >
              Ver todo
              <i className="bi bi-arrow-right ms-2"></i>
            </Button>
          </div>

          <Row className="g-4">
            {cargando ? (
              <Col xs={12}>
                <div className="inicio-loading">
                  <Spinner animation="border" />
                  <span>Cargando productos...</span>
                </div>
              </Col>
            ) : productosDestacados.length === 0 ? (
              <Col xs={12}>
                <div className="inicio-empty-state">
                  <div>
                    <i className="bi bi-box-seam"></i>
                  </div>
                  <h4>Todavía no hay productos destacados</h4>
                  <p>Pronto encontrarás nuevas opciones disponibles.</p>
                </div>
              </Col>
            ) : (
              productosDestacados.map((prod) => (
                <Col key={prod.id_producto}  sm={6} lg={3}>
                  <div className="inicio-product-wrapper">
                    <TarjetaCatalogo
                      producto={prod}
                      abrirModalDetalles={() =>
                        navigate(`/catalogo?prod=${prod.id_producto}`)
                      }
                      abrirModalContacto={() => navigate("/mensajes")}
                      agregarAlCarrito={() => {}}
                    />
                  </div>
                </Col>
              ))
            )}
          </Row>
        </Container>
      </section>

      {/* =====================================================
          BANNER DE CONFIANZA
      ===================================================== */}
      <section className="inicio-trust-section">
        <Container>
          <div className="inicio-trust-glass">
            <div className="inicio-trust-heading">
              <span className="inicio-section-kicker">INTERMARKET</span>
              <h2>Compra con confianza.</h2>
              <p>
                Todo lo que necesitas para disfrutar una experiencia de compra
                más sencilla.
              </p>
            </div>

            <Row className="g-4">
              <Col md={4}>
                <div className="inicio-benefit-card">
                  <div className="inicio-benefit-icon">
                    <i className="bi bi-shield-check"></i>
                  </div>
                  <div>
                    <h5>Compras seguras</h5>
                    <p>
                      Tu información y tus transacciones están protegidas.
                    </p>
                  </div>
                </div>
              </Col>

              <Col md={4}>
                <div className="inicio-benefit-card">
                  <div className="inicio-benefit-icon">
                    <i className="bi bi-truck"></i>
                  </div>
                  <div>
                    <h5>Envíos locales</h5>
                    <p>
                      Recibe tus productos de forma rápida y conveniente.
                    </p>
                  </div>
                </div>
              </Col>

              <Col md={4}>
                <div className="inicio-benefit-card">
                  <div className="inicio-benefit-icon">
                    <i className="bi bi-headset"></i>
                  </div>
                  <div>
                    <h5>Soporte</h5>
                    <p>
                      Estamos disponibles para ayudarte cuando lo necesites.
                    </p>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </Container>
      </section>

      {/* =====================================================
          CTA FINAL
      ===================================================== */}
      <section className="inicio-final-cta">
        <Container>
          <div className="inicio-final-cta-content">
            <div className="inicio-final-cta-icon">
              <i className="bi bi-bag-heart-fill"></i>
            </div>

            <h2>¿Listo para encontrar algo increíble?</h2>

            <p>
              Explora nuestro catálogo y descubre productos que podrían
              convertirse en tus próximos favoritos.
            </p>

            <Button
              className="inicio-final-button"
              onClick={() => navigate("/catalogo")}
            >
              Comenzar a explorar
              <i className="bi bi-arrow-right ms-2"></i>
            </Button>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default InicioComprador;