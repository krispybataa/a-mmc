FROM node:20-alpine
WORKDIR /app
COPY . .

RUN apk add --no-cache curl
RUN npm ci && npm run build

CMD ["npm", "run", "preview"]