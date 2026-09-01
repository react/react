#!/bin/bash

set -e

mkdir -p build/devtools

cd packages/react-devtools
npm pack
mv ./react-devtools*.tgz ../../build/devtools/

cd ../react-devtools-core
npm pack
mv ./react-devtools-core*.tgz ../../build/devtools/

cd ../react-devtools-inline
npm pack
mv ./react-devtools-inline*.tgz ../../build/devtools/

cd ../react-devtools-extensions
if [[ -n "$1" ]]; then
  yarn build:$1
  mv ./$1/build/ReactDevTools.zip ../../build/devtools/$1-extension.zip
  mv ./$1/build/webpack-stats.*.json ../../build/devtools/
else
  yarn build
  for browser in chrome firefox edge; do
    mv ./$browser/build/ReactDevTools.zip ../../build/devtools/$browser-extension.zip
    mv ./$browser/build/webpack-stats.*.json ../../build/devtools/
  done
fi
