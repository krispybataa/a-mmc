FROM node:20-alpine
WORKDIR /app
COPY . .

COPY ../a-mmc_frontend/src/data/triageLogic.js ./src/data/triageLogic.js
RUN npm ci && npm run build

CMD ["npm", "run", "preview"]