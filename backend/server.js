// ============================================================
// backend/server.js — Ponto de entrada da API Financeira
// ============================================================

require("dotenv").config();

const app = require("./src/app");
const os = require("os");

const PORT = process.env.PORT || 3001;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

app.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  console.log(`\n======================================================`);
  console.log(`💰 API FinControl Rodando com Sucesso!`);
  console.log(`🖥️  Local:       http://localhost:${PORT}`);
  console.log(`📱 Rede Local:  http://${ip}:${PORT}`);
  console.log(`======================================================\n`);
});
