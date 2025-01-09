FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
COPY docs ./docs
RUN npm ci --only=production

COPY --from=development /app/dist ./dist

CMD ["npm", "start"]
