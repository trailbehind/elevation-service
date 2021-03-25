FROM node:14-alpine

WORKDIR /usr/src/elevation-service

COPY ./package*.json ./

RUN npm install

COPY ./. .

EXPOSE 5001
CMD ["node", "index.js"]
