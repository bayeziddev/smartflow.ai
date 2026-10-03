# SmartFlow WhatsApp QR gateway — always-on Node service (see README.md).
FROM node:22-slim

ENV NODE_ENV=production \
    PORT=8790 \
    DATA_DIR=/data
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# WhatsApp logins live here. Mount a persistent volume on /data, or every
# redeploy unlinks the numbers and they must scan the QR code again.
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
USER node

EXPOSE 8790
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8790)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
