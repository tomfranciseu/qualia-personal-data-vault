FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY packages ./packages
COPY apps/vault-api ./apps/vault-api
RUN npm install
RUN npx prisma generate
EXPOSE 4010
CMD ["npm", "run", "start", "-w", "@qualia/vault-api"]
