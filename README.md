# 💼 FinControl — Gestão Financeira Inteligente & Quitação de Dívidas

[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Oracle Cloud](https://img.shields.io/badge/Oracle_Cloud-Autonomous_DB_ATP-F80000?logo=oracle&logoColor=white)](https://www.oracle.com/cloud/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

O **FinControl** é uma plataforma moderna, *mobile-first* e orientada a metas financeiras, projetada para proporcionar controle absoluto do orçamento mensal, simulação de amortização acelerada de dívidas com juros altos, lançamento de despesas em tempo real e automações proativas via WhatsApp.

---

## 🎯 Principais Funcionalidades

### 1. 🧮 Simulador de Amortização Inteligente (13º e Renda Extra)
* Simula a aplicação de rendas extras (como 1ª, 2ª parcelas do 13º salário ou bonificações) na liquidação de dívidas parceladas com juros.
* Calcula automaticamente:
  * **Número exato de parcelas eliminadas**.
  * **Economia real de juros** (evitando juros compostos de cheque especial ou cartão).
  * **Meses adiantados** na quitação do contrato.
  * Botão de **Aplicação Direta no Orçamento** com recálculo instantâneo das pendências.

### 2. 📅 Navegador de Meses (Histórico e Planejamento Futuro)
* Navegação temporal fluida para consultar extratos de meses anteriores ou planejar o orçamento dos próximos meses.
* Permite visualizar antecipadamente o impacto de vencimentos futuros, faturas de cartão e parcelamentos.

### 3. 📱 Progressive Web App (PWA Nativo)
* **Instalável** em qualquer smartphone (iOS / Safari e Android / Chrome) ou Desktop.
* Ícone dedicado, tema escuro nativo (*Dark Mode Premium*), manifesto configurado e **Service Worker** para resiliência e suporte offline.

### 4. 🤖 Robô de Notificações WhatsApp (CallMeBot Integration)
* **Lembretes Automáticos:** O sistema executa uma rotina diária e notifica o usuário via WhatsApp na data programada com o resumo das contas e faturas a vencer.
* **Lançamento Rápido via Mensagem:** Webhook integrado para registrar despesas e pagamentos por comando de texto.
* **Console Interativo no App:** Chatbot embutido no dashboard para testar e executar comandos rápidos sem sair da tela.

### 5. 📊 Visualização Gráfica & Relatórios PDF
* **Gráfico Donut Dinâmico:** Distribuição percentual em tempo real das categorias de despesas (Alimentação, Transporte, Moradia, Lazer, etc.).
* **Exportação para PDF / Impressão:** Geração de extrato financeiro formatado para arquivamento ou auditoria pessoal com um clique.

### 6. 🔐 Autenticação Segura & Gestão Multi-Tenant
* Autenticação baseada em **JWT (JSON Web Tokens)**.
* **Fluxo de Solicitação de Acesso:** Novos usuários solicitam cadastro informando nome, WhatsApp e e-mail.
* **Aprovação pelo Administrador:** Notificação em tempo real no WhatsApp do admin para revisar, aprovar solicitações e gerar credenciais temporárias seguras com link direto de boas-vindas.
* **Recuperação de Senhas:** Fluxo integrado para reset de credenciais com validação do gestor.

### 7. 💾 Resiliência de Dados & Backups Automáticos
* Persistência híbrida no **Oracle Cloud Autonomous Transaction Processing (ATP Exadata)** via REST Data Services (ORDS).
* Cache local com fallback para contingência offline.
* Rotina automática de **Backup Diário às 23:59** com retenção histórica e endpoint para snapshot manual imediato.

---

## 🏗️ Arquitetura do Sistema

```
[ Frontend: React + Vite + PWA ]
          │ (HTTPS / REST API)
          ▼
[ Backend: Node.js + Express ]
   ├── JWT Auth & Role Validation
   ├── WhatsApp Bot Webhook (CallMeBot)
   ├── Backup & Scheduled Cron Service
   └── Oracle ATP Database Service (ORDS)
```

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:**
  * React 18, Vite
  * Tailwind CSS / Vanilla Modern CSS3 (Glassmorphism & Dark UI)
  * Lucide Icons & FontAwesome
  * Service Workers & Web App Manifest (PWA)
* **Backend:**
  * Node.js & Express.js
  * JSON Web Token (jsonwebtoken) & Bcryptjs
  * Oracle Cloud ORDS REST API (ATP Autonomous Database)
  * HTTPS Client para integrações externas (WhatsApp CallMeBot)
* **DevOps & Deploy:**
  * Docker & Docker Compose
  * Nginx Reverse Proxy
  * Vercel (Frontend Edge Hosting)
  * Oracle Cloud Infrastructure (OCI Compute VM)

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
* **Node.js** (versão 18 ou superior)
* **NPM** ou **Yarn**
* *(Opcional)* **Docker** e **Docker Compose**

### 1. Clonar o Repositório
```bash
git clone https://github.com/ViniScooper/controle-financeiro.git
cd controle-financeiro
```

### 2. Configurar o Backend
```bash
cd backend

# Copie o arquivo de exemplo de variáveis de ambiente
cp .env.example .env

# Instale as dependências
npm install

# Inicie o servidor em modo de desenvolvimento
npm run dev
# Ou em produção: npm start
```
O servidor estará disponível em: `http://localhost:3001`

### 3. Configurar o Frontend
```bash
cd ../frontend

# Copie as variáveis de ambiente (se necessário)
cp .env.example .env.local

# Instale as dependências
npm install

# Inicie o servidor Vite
npm run dev
```
Acesse a aplicação em: `http://localhost:5173`

---

## 🐳 Executando com Docker

Se preferir rodar toda a aplicação conteinerizada:

```bash
# Na raiz do projeto
docker-compose up -d --build
```

O Nginx balanceará as requisições entre o frontend e a API.

---

## ⚙️ Variáveis de Ambiente

### Backend (`backend/.env`)
| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `PORT` | Porta de escuta da API | `3001` |
| `JWT_SECRET` | Chave criptográfica para tokens JWT | `sua_chave_secreta_jwt` |
| `ORDS_HOST` | Host do Oracle ATP ORDS | `seu-ords-host.oraclecloudapps.com` |
| `ORDS_PATH` | Endpoint SQL do ORDS | `/ords/admin/_/sql` |
| `ORDS_AUTH` | Credencial em Base64 para o banco | `Buffer.from('USER:PASS').toString('base64')` |
| `ADMIN_WHATSAPP_PHONE` | Telefone com DDI para receber alertas do sistema | `5511999999999` |
| `CALLMEBOT_API_KEY` | Chave de API da plataforma CallMeBot | `1234567` |
| `ADMIN_EMAIL` | E-mail do usuário administrador | `admin@exemplo.com` |

### Frontend (`frontend/.env.local`)
| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL base do backend em execução | `http://localhost:3001` |

---

## 📱 Instalação como Aplicativo (PWA)

1. **No iPhone (iOS):** Abra o link da aplicação no **Safari**, clique no botão de compartilhamento e selecione **"Adicionar à Tela de Início"**.
2. **No Android:** Abra no **Google Chrome**, clique nos três pontos no canto superior direito e selecione **"Instalar aplicativo"** ou use o botão **"📲 Instalar App"** no topo da página.

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE). Sinta-se livre para usar, estudar e contribuir.
