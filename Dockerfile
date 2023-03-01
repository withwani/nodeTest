FROM node:latest

RUN apt-get update && apt-get install -y -q --no-install-recommends \
    vim \
    net-tools \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 3000
