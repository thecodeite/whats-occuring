FROM node:10-buster-slim

# setup
RUN mkdir /app

WORKDIR /app

COPY package.json .
# COPY yarn.lock .
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

