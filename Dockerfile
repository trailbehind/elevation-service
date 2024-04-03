FROM node:lts

WORKDIR /srv

COPY package.json package-lock.json ./

RUN npm install -g pm2
RUN npm install

COPY src src
COPY tsconfig.json ./
RUN npm run build

EXPOSE 5001
CMD ["pm2-runtime", "npm start"]
