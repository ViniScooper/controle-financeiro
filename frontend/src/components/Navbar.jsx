// ============================================================
// src/components/Navbar.jsx — Navbar do Boteco com Menu Hamburguer
// ============================================================

import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Navbar() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const [menuAberto, setMenuAberto] = useState(false);

    useEffect(() => {
        const u = localStorage.getItem("usuario");
        if (u) setUsuario(JSON.parse(u));

        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const fecharMenu = () => setMenuAberto(false);

    const sair = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setUsuario(null);
        fecharMenu();
        navigate("/");
        window.location.reload();
    };

    return (
        <nav className="navbar-container" style={{ ...styles.nav, ...(scrolled ? styles.navScrolled : {}) }}>
            <Link to="/" style={styles.logo} onClick={fecharMenu}>
                <img src="/logo.png" alt="Logo Boteco do Sivirino" style={styles.logoImg} />
                <div className="navbar-logo-textos" style={styles.logoTextos}>
                    <span style={styles.logoNome}>Boteco do Sivirino</span>
                    <span className="navbar-logo-slogan" style={styles.logoSlogan}>Comida Arretada & Cerveja Gelada</span>
                </div>
            </Link>

            {/* Menu Desktop */}
            <div className="nav-desktop-links" style={styles.links}>
                <Link to="/" style={styles.link}>Cardápio</Link>

                {usuario ? (
                    <>
                        {usuario.role === "admin" && (
                            <Link to="/admin" style={styles.linkAdmin}>
                                Painel Admin
                            </Link>
                        )}
                        <span style={styles.nomeBadge}>
                            {usuario.nome.split(" ")[0]}
                        </span>
                        <button onClick={sair} style={styles.btnSair}>
                            Sair
                        </button>
                    </>
                ) : (
                    <Link to="/login" style={styles.btnEntrar}>
                        Entrar
                    </Link>
                )}
            </div>

            {/* Botão Hamburguer Mobile */}
            <button
                className="nav-hamburger-btn"
                onClick={() => setMenuAberto(!menuAberto)}
                aria-label="Abrir Menu"
            >
                <span
                    className="nav-hamburger-line"
                    style={menuAberto ? { transform: "rotate(45deg) translate(5px, 5px)" } : {}}
                />
                <span
                    className="nav-hamburger-line"
                    style={menuAberto ? { opacity: 0 } : {}}
                />
                <span
                    className="nav-hamburger-line"
                    style={menuAberto ? { transform: "rotate(-45deg) translate(5px, -5px)" } : {}}
                />
            </button>

            {/* Menu Dropdown Mobile */}
            {menuAberto && (
                <div className="nav-mobile-menu">
                    <Link to="/" style={styles.linkMobile} onClick={fecharMenu}>
                        🍽️ Cardápio
                    </Link>

                    {usuario ? (
                        <>
                            {usuario.role === "admin" && (
                                <Link to="/admin" style={styles.linkAdminMobile} onClick={fecharMenu}>
                                    ⚙️ Painel Admin
                                </Link>
                            )}
                            <div style={{ color: "#aaa", fontSize: "0.85rem", padding: "0.4rem 0" }}>
                                Conectado como: <strong style={{ color: "#e8b84b" }}>{usuario.nome}</strong>
                            </div>
                            <button onClick={sair} style={styles.btnSairMobile}>
                                🚪 Sair
                            </button>
                        </>
                    ) : (
                        <Link to="/login" style={styles.btnEntrarMobile} onClick={fecharMenu}>
                            🔐 Entrar como Admin
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
}

const styles = {
    nav: {
        display:         "flex",
        justifyContent:  "space-between",
        alignItems:      "center",
        background:      "#111111",
        padding:         "0 2.5rem",
        height:          "70px",
        position:        "sticky",
        top:             0,
        zIndex:          1000,
        transition:      "box-shadow 0.3s ease",
    },
    navScrolled: {
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
    },
    logo: {
        display:    "flex",
        alignItems: "center",
        gap:        "0.75rem",
    },
    logoImg: {
        height:       "44px",
        width:        "44px",
        objectFit:    "cover",
        borderRadius: "50%",
        border:       "2px solid #e8b84b",
    },
    logoTextos: {
        display:       "flex",
        flexDirection: "column",
    },
    logoNome: {
        fontFamily:    "'Playfair Display', serif",
        fontSize:      "1.1rem",
        fontWeight:    "700",
        color:         "#e8b84b",
        letterSpacing: "0.3px",
        lineHeight:    "1.2",
    },
    logoSlogan: {
        fontSize:      "0.68rem",
        color:         "#888",
        letterSpacing: "1.5px",
        textTransform: "uppercase",
    },
    links: {
        display:    "flex",
        alignItems: "center",
        gap:        "1.2rem",
    },
    link: {
        color:         "#ccc",
        fontSize:      "0.9rem",
        letterSpacing: "0.5px",
    },
    linkAdmin: {
        color:         "#e8b84b",
        fontSize:      "0.9rem",
        fontWeight:    "600",
    },
    nomeBadge: {
        color:    "#888",
        fontSize: "0.85rem",
    },
    btnEntrar: {
        border:       "1.5px solid #e8b84b",
        color:        "#e8b84b",
        padding:      "0.4rem 1.1rem",
        borderRadius: "50px",
        fontWeight:   "500",
        fontSize:     "0.85rem",
    },
    btnSair: {
        background:   "transparent",
        border:       "1.5px solid #555",
        color:        "#888",
        padding:      "0.35rem 0.9rem",
        borderRadius: "50px",
        cursor:       "pointer",
        fontSize:     "0.82rem",
    },

    /* Mobile */
    linkMobile: {
        color: "#fff",
        fontSize: "1rem",
        fontWeight: "500",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        paddingBottom: "0.8rem",
    },
    linkAdminMobile: {
        color: "#e8b84b",
        fontSize: "1rem",
        fontWeight: "600",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        paddingBottom: "0.8rem",
    },
    btnEntrarMobile: {
        background: "#e8b84b",
        color: "#111",
        textAlign: "center",
        padding: "0.75rem",
        borderRadius: "8px",
        fontWeight: "700",
        marginTop: "0.5rem",
    },
    btnSairMobile: {
        background: "rgba(255,255,255,0.08)",
        color: "#ff6b6b",
        border: "1px solid rgba(255,107,107,0.3)",
        padding: "0.7rem",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
        width: "100%",
        marginTop: "0.5rem",
    }
};
