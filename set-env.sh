#!/bin/sh

set -e

touch ~/.bashrc

echo "alias ll='ls -al'" >> ~/.bashrc
source ~/.bashrc

npm install --slient
