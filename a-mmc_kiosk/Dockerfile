FROM node:20-alpine
WORKDIR /app
COPY . .

RUN apk add --no-cache curl
RUN npm ci 

# ARG VITE_MAIN_APP_URL=http://localhost:3000
# ARG VITE_API_URL=/api
ARG VITE_MAIN_APP_URL
ARG VITE_API_URL

ENV VITE_MAIN_APP_URL=$VITE_MAIN_APP_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

CMD ["npm", "run", "preview"]