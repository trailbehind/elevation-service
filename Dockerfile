FROM node:lts as base
ENV PNPM_HOME=/opt/pnpm
ENV PATH="$PATH:$PNPM_HOME"
WORKDIR /srv
RUN corepack enable
COPY package.json pnpm-lock.yaml ./


FROM base as build
RUN pnpm install --prod=false --frozen-lockfile
COPY src src
COPY tsconfig.json ./
RUN pnpm build


FROM base as prod
RUN pnpm install -g pm2
RUN pnpm install --prod=true --frozen-lockfile
COPY --from=build /srv/dist dist
EXPOSE 5001
CMD ["pm2-runtime", "pnpm start"]
