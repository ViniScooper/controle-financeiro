# Imagem base oficial ultra-leve para economizar memória na VM Always Free
FROM node:20-alpine

# Define diretório de trabalho
WORKDIR /app

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3006

# Copia manifestos de pacotes
COPY package*.json ./

# Instala apenas dependências de produção limpando o cache
RUN npm install --omit=dev && npm cache clean --force

# Copia código do backend
COPY . .

# Garante a existência do diretório de dados persistentes
RUN mkdir -p /app/data

# Expõe a porta 3006
EXPOSE 3006

# Inicia o servidor Node com limite de heap para evitar estouro de memória
CMD ["node", "--max-old-space-size=96", "server.js"]
