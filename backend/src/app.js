// ============================================================
// backend/src/app.js — API de Controle Financeiro Pessoal
// ============================================================

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const financeRoutes = require("./routes/financeRoutes");

const app = express();

// CORS liberado para qualquer origem (Vercel, localhost, IP da rede, mobile)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "Expires"]
}));

app.use(express.json());

// Headers anti-cache para garantir dados sempre atualizados no celular
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Rotas principais
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/finance", financeRoutes);
app.use("/finance", financeRoutes);

// Rota raiz e health-check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Controle Financeiro Pessoal - Vinícius Lourenço",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    app: "Controle Financeiro Pessoal - Vinícius Lourenço",
    endpoints: {
      auth: "/api/auth/login",
      financeData: "/api/finance/data",
      health: "/api/health"
    }
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error("❌ Erro no backend:", err.message);
  res.status(500).json({ success: false, erro: err.message || "Erro interno do servidor." });
});

module.exports = app;
