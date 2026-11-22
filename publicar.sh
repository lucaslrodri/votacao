#!/bin/sh
# Publica o site no GitHub Pages: põe um número de versão novo nos links dos scripts das páginas (assim o navegador
# não usa a cópia antiga guardada) e envia tudo ao GitHub. Uso, dentro desta pasta:
#   sh publicar.sh "o que mudou"
set -e
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M%S)
for f in formulario.html completo.html; do
  sed -i '' -E "s/src=\"([a-z]+)\.js(\?v=[0-9]+)?\"/src=\"\1.js?v=$V\"/g" "$f"
done
git add -A
git commit -q -m "${1:-Atualiza o site}"
git push -q
echo "publicado (versão $V): https://lucaslrodri.github.io/votacao/ (fica no ar em um ou dois minutos)"
