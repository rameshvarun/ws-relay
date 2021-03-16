FROM node:14

ADD ./server /server
ADD ./common /common

WORKDIR /server

RUN npm install
ENV PORT=$PORT

CMD npm start
