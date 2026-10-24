FROM node:18-bullseye-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends default-mysql-client \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY google-ads-automation/package*.json ./google-ads-automation/
RUN cd google-ads-automation && npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

CMD ["npm", "run", "prod"]
