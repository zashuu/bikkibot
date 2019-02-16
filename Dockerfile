FROM node:11.9.0

WORKDIR /usr/src/app
VOLUME /usr/src/app/data

COPY package*.json ./

RUN npm install

COPY . .

# No need for expose
CMD [ "npm", "start" ]
