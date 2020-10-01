from node:14

WORKDIR /app

# prepare environment
COPY package*.json ./
RUN npm install

# compile app
COPY tsconfig.json ./tsconfig.json
COPY ./lib ./lib
RUN npm run build

ENTRYPOINT ["npm", "run", "start"]
