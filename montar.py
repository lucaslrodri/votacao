# Monta o site de votação (site/) a partir dos arquivos que o gerar.sh já exportou em opcoes/: para cada candidata,
# as imagens em site/img/<código>/ (horizontal, vertical, negativa, ícone, perfil e favicon) e a lista em
# site/dados.js. Chamado pelo gerar.sh, com o JSON da lista.typ na entrada:
#   typst eval 'query(<lista>).first().value' --in lista.typ | python3 -I site/montar.py <pasta do experimento>
# Os SVGs vão como estão (leves e nítidos em qualquer tamanho). No desenho original do Eliseu (2A, 2B) o SVG traz o
# desenho dele embutido, com a sigla em Calisto MT, que só aparece certa em quem tem a fonte; ali vão PNGs.
import json
import os
import shutil
import subprocess
import sys

raiz = sys.argv[1]
site = os.path.join(raiz, "site")
d = json.load(sys.stdin)
opcoes = {o["n"]: o for o in d["opcoes"]}


def reduzir(origem, destino, lado):
    """Copia um PNG com o lado maior reduzido (sips, do macOS); sem o sips, copia como está."""
    try:
        subprocess.run(["sips", "-Z", str(lado), origem, "--out", destino], check=True, capture_output=True)
    except (OSError, subprocess.CalledProcessError):
        shutil.copyfile(origem, destino)


img = os.path.join(site, "img")
shutil.rmtree(img, ignore_errors=True)
os.makedirs(img)
lista = []
for c in d["candidatas"]:
    o = opcoes[c["n"]]
    pasta = os.path.join(raiz, "opcoes", "%02d-%s" % (c["n"], o["id"]))
    if c["var"]:
        pasta = os.path.join(pasta, "variantes", c["var"])
    base = os.path.join(pasta, "pei-" + c["id"])
    destino = os.path.join(img, c["codigo"])
    os.makedirs(destino)
    arq = {}
    especial = c["n"] == 2 and c["var"] in ("", "libertinus")
    for chave, sufixo in (("h", "horizontal"), ("v", "vertical"), ("neg", "horizontal-negativa"), ("icone", "icone")):
        if especial:
            fonte = base + "-" + sufixo + ".png"
            if chave == "icone" and not os.path.exists(fonte):
                fonte = base + "-icone-512.png"
            nome = chave + ".png"
            reduzir(fonte, os.path.join(destino, nome), 900)
        else:
            nome = chave + ".svg"
            shutil.copyfile(base + "-" + sufixo + ".svg", os.path.join(destino, nome))
        arq[chave] = nome
    reduzir(base + "-perfil.png", os.path.join(destino, "perfil.png"), 256)
    reduzir(base + "-icone-placa.png", os.path.join(destino, "favicon.png"), 64)
    arq["perfil"], arq["favicon"] = "perfil.png", "favicon.png"
    lista.append({"codigo": c["codigo"], "n": c["n"], "variante": c["variante"], "img": arq})

dados = {
    "criterios": d["criterios"],
    "logos": [{"n": o["n"], "nome": o["nome"], "origem": o["origem"],
               "candidatas": [c for c in lista if c["n"] == o["n"]]} for o in d["opcoes"]],
}
with open(os.path.join(site, "dados.js"), "w", encoding="utf-8") as f:
    f.write("// Feito pelo site/montar.py (sh gerar.sh). Não edite à mão.\n")
    f.write("window.PEI = " + json.dumps(dados, ensure_ascii=False, indent=1) + ";\n")
print("ok: site (%d candidatas)" % len(lista))
