#!/bin/sh
# Publica o site no GitHub Pages: põe um número de versão novo nos links dos scripts da página da camisa (assim o
# navegador não usa a cópia antiga guardada) e envia tudo ao GitHub. Uso, dentro desta pasta:
#   sh publicar.sh "o que mudou"
# Atenção: o git add -A leva tudo o que está na pasta.
set -e
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M%S)
sed -i '' -E "s/src=\"([a-z0-9-]+)\.js(\?v=[0-9]+)?\"/src=\"\1.js?v=$V\"/g; s/\"montar-3d\.js(\?v=[0-9]+)?\"/\"montar-3d.js?v=$V\"/g" index.html
git add -A
git commit -q -m "${1:-Atualiza o site}"
git push -q
echo "publicado (versão $V): https://lucaslrodri.github.io/votacao/ (fica no ar em um ou dois minutos)"
