FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

WORKDIR /app
COPY . .

RUN mkdir -p /app/data

EXPOSE 3001

WORKDIR /app/backend

CMD ["npm", "start"]