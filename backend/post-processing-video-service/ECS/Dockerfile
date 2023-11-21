FROM node:lts-alpine
RUN apk add ffmpeg

ADD index.js /
ADD package.json /
RUN npm install

CMD [ "node", "index.js" ]