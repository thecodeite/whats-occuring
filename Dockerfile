FROM node:8.14-alpine

# RUN apk add --no-cache       \
#   make gcc g++ python git  \
#   postgresql-client        \
#   bash \
#   libjpeg-turbo-dev cairo-dev pango \
#   imagemagick \
#   ghostscript
RUN apk add --no-cache --virtual .build-deps git build-base g++ 
RUN apk add --no-cache --virtual .npm-deps cairo-dev libjpeg-turbo-dev pango pango-dev
RUN apk add --update  --repository http://dl-3.alpinelinux.org/alpine/edge/testing libmount ttf-dejavu ttf-droid ttf-freefont ttf-liberation ttf-ubuntu-font-family fontconfig
# RUN apk add --no-cache \
#   build-base \
#   g++ \
#   cairo-dev \
#   jpeg-dev \
#   pango-dev \
#   bash \
#   imagemagick

# setup
RUN mkdir /app

WORKDIR /app

COPY package.json .
#COPY yarn.lock .
RUN yarn install 

# copy over src files 
COPY ./index.js /app/
COPY ./occurrences /app/occurrences
COPY ./public /app/public
COPY ./shared /app/shared
COPY ./*.otf /app/

EXPOSE 22013

# Run the app
CMD ["yarn","start"]

