FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production 2>/dev/null || npm install --only=production
COPY . .
EXPOSE 4000
ENV PORT=4000
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
