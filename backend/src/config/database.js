// ============================================================
// backend/src/config/database.js — Conexão com o MySQL (Connection Pool)
// Suporta variáveis de ambiente (Docker) com reconexão automática
// ============================================================

const mysql = require("mysql2");

// Usando createPool para evitar desconexões por inatividade (PROTOCOL_CONNECTION_LOST)
const db = mysql.createPool({
    host:               process.env.DB_HOST     || "localhost",
    user:               process.env.DB_USER     || "root",
    password:           process.env.DB_PASSWORD || "viniZIKA3103",
    database:           process.env.DB_NAME     || "restaurante",
    port:               Number(process.env.DB_PORT) || 3306,
    charset:            "utf8mb4",
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
});

db.getConnection((erro, conn) => {
    if (erro) {
        console.error("❌ Erro ao conectar no MySQL Pool:", erro.message);
        return;
    }
    console.log("✅ MySQL Pool conectado com sucesso!");
    conn.release();
});

module.exports = db;
