# Site da camisa do PEI

O site fica em https://lucaslrodri.github.io/votacao/. O repositório é o `lucaslrodri/votacao`, e esta pasta é o
próprio repositório.

Até 23/11/2026, este era o site da votação do novo logo. Em 24/11/2026 ele virou o site da camisa do PEI, e a página
inicial passou a ser a de montar a camisa. A votação saiu do site: as páginas, as imagens das candidatas, o resultado,
o infográfico e o carrossel do Instagram. Tudo isso continua no histórico do git. O logo oficial (a 12J) ficou, para
baixar. As Inspirações (as polos de empresa, com as fotos das lojas) também saíram do site em 24/11/2026; a página e
as fotos estão em `../inspiracoes.html` e `../inspiracoes/`, para consulta.

## As páginas

| Página | O que é |
|---|---|
| `index.html` | **Monte a camisa do PEI**: a página inicial (descrita abaixo). |
| `logo.html` | **O logo oficial para baixar**: o kit em zip, o manual de identidade, cada arquivo do logo e a imagem das versões (`kit-logo.png`, de `../kit-oficial.typ`). Os arquivos estão em `oficial/` e saem do `../exportar-oficial.sh`. |
| `resultado.html`, `formulario.html`, `completo.html`, `montar.html` | Só redirecionam os links antigos. `resultado.html#arquivos` vai para `logo.html`, e o resto vai para a camisa. O `montar.html` leva as escolhas do link junto. |

## A página da camisa (`index.html`)

- **Login com o Google, só para o que grava.** Montar a camisa, ver e abrir as camisas do grupo, ver os corações e
  compartilhar não pedem login. Para salvar a camisa e dar corações, a pessoa entra com o Google: o botão fica no topo
  da página e no lugar do formulário de salvar. Sem login, o clique no coração só pede para entrar. O login vale por
  uma hora, nesta aba do navegador; quem já entrou uma vez volta sem clicar, se o Google deixar. A planilha entrega a
  lista sem login, mas confere o login no Google antes de gravar. Qualquer conta Google entra.
- **Designs prontos.** São dez, com nomes no lugar dos códigos de `../camisa-pei.typ`. No computador, ficam numa
  barra lateral, à esquerda. No celular e no tablet, ficam numa fila que rola de lado, em cima da prévia. Um design
  pronto muda as escolhas, mas mantém a cor da polo que a pessoa escolheu. Os designs prontos e as camisas do grupo
  ficam numa lista só, a "Camisas": primeiro as do grupo, depois os prontos. Em "Mais corações", cada parte vai do
  mais amado para o menos, e as do grupo continuam na frente.

  | Nome | Código antigo | O que muda |
  |---|---|---|
  | Clássica | H | nada: logo no peito, Brasil e Ufac nas mangas |
  | Sigla no peito | H2 | só a sigla na frente e o nome grande nas costas |
  | Gola azul Ufac | H3 | gola e punho em azul Ufac |
  | Friso dourado | H4 | friso dourado na gola e no punho |
  | Faixa dourada | H5 | faixa dourada em cada lateral |
  | Gola Ufac e friso | H10 | gola e punho azul Ufac, com friso dourado |
  | Friso duplo | H11 | frisos dourado e branco |
  | Logo nas costas | H15 | o logo grande nas costas (eventos) |
  | Logo maior | H18 | logo de 12 cm, 6 cm mais baixo |
  | Bandeira do Acre | H20 | a do Acre embaixo da do Brasil |

  A lista é a `PRONTOS`, no script da página. Cada design tem um `id` (por exemplo, `friso`), que é o nome dele na
  planilha dos corações (`p:friso`). Não mude o `id` de um design que já recebeu corações. Para pôr outro design, basta
  acrescentar uma linha.
- **A prévia.** Pode ser em desenho (frente, costas e as duas mangas ampliadas) ou em 3D (o avatar do OpenSCAD).
  Os emblemas das mangas ficam em cima do ombro, do lado de fora da manga, então não aparecem no desenho das costas.
- **Camisas do grupo.** A pessoa dá um nome à camisa e clica em **Salvar no grupo**. A camisa vai para a planilha
  com o nome da conta Google de quem salvou, e todos veem a camisa na lista, que pode ser ordenada por "Recentes" ou
  "Mais corações". Quem criou pode salvar mudanças nela ou apagá-la, de qualquer navegador, com a mesma conta. O link de
  uma camisa do grupo leva `s=<id>`, e a página mostra o nome dela e o de quem a criou.
- **Corações.** Cada design pronto e cada camisa do grupo tem um coração com o número de corações. Cada coração é um
  voto, que vai para a planilha. Vale um coração por conta Google em cada design, e a pessoa pode tirá-lo depois. Também
  há um coração em cima da prévia, para o design que está aberto. Uma camisa que ainda não foi salva não recebe
  corações.
- **Compartilhar.** O botão monta uma foto, a vitrine, com:
  - o nome da camisa e o logo do PEI;
  - o desenho de frente e de costas;
  - as mangas ampliadas;
  - o resumo das escolhas;
  - o avatar 3D em quatro vistas (frente, lado esquerdo, lado direito e costas).

  O 3D carrega na hora, se ainda não tiver aberto, e precisa de internet para o three.js. Se não abrir, a foto sai sem
  ele. O botão **Enviar a foto e o link** abre o menu de compartilhar do aparelho com os dois. Alguns apps, como o
  WhatsApp no Mac e no iPhone, ficam só com a foto; por isso o link vai junto para a área de transferência, e a página
  avisa para colar. Há também **Enviar só o link**, **Copiar a foto** (para colar no WhatsApp Web, no e-mail etc.),
  **Baixar a foto** e **Copiar o link**. Num navegador que não compartilha arquivos, o botão do WhatsApp manda o link.
- **O link** guarda as escolhas: só o que muda do inicial, por exemplo `#l=sigla&c=nome-grande`. `ver=3d` abre direto
  no 3D, e `s=<id>` marca a camisa do grupo.

| Arquivo | O que é |
|---|---|
| `montar-dados.js` | os desenhos (o logo, o nome e a Ufac), feito por `../montar-dados.py` |
| `montar-3d.js` | as peças do avatar 3D (2,5 MB), feito por `../avatar/exportar-3d.sh` |
| `config.js` | a URL do Apps Script (`window.URL_CAMISAS`) e o ID do cliente OAuth do login (`window.CLIENTE_GOOGLE`), o único arquivo para editar à mão |
| `apps-script/Codigo.gs` | o código que confere o login e grava as camisas e os corações na planilha |
| `social-camisa.png` | o banner que o WhatsApp mostra ao compartilhar o link (etiquetas Open Graph), feito por `../banner-camisa.typ` |

## Ligar a planilha (uma vez)

As camisas do grupo e os corações vão para a mesma planilha da votação, "Votação do novo logo do PEI (respostas do
site)", em abas novas. O Apps Script é o mesmo projeto da votação, "Votação do logo do PEI (site)", que guarda o ID da
planilha nas propriedades. Por isso ele grava na mesma planilha sem precisar de configuração. As abas da votação não
mudam.

1. Abra o projeto "Votação do logo do PEI (site)" em script.google.com. Apague o código antigo, cole o conteúdo de
   `apps-script/Codigo.gs` e salve. O código da votação sai, mas continua no histórico do git.
2. Clique em **Implantar → Nova implantação**. Na engrenagem, escolha **App da Web** e preencha:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**

   A implantação da votação foi arquivada em 23/11/2026, por isso é preciso uma nova.
3. Clique em **Implantar** e autorize, se o Google pedir. O script pede para "acessar serviços externos": é a
   conferência do login no Google (tokeninfo).
4. Copie a **URL do app da Web**, que termina em `/exec`, e cole em `config.js`, entre as aspas de
   `window.URL_CAMISAS`.
5. Para conferir, abra a URL no navegador. Deve aparecer `{"ok":true,"app":"camisa do PEI"}`.
6. Publique o site (veja abaixo).

O login usa o mesmo cliente OAuth da votação (projeto do Google Cloud `votacao-logo-pei`, o ID em `config.js` e em
`CLIENTE_GOOGLE`, no `Codigo.gs`). Em **APIs e serviços → Credenciais**, o cliente precisa ter
`https://lucaslrodri.github.io` nas **Origens JavaScript autorizadas**, como na votação, e `http://localhost:8000`
para testar no computador. A tela de consentimento tem de estar "Em produção", para qualquer conta Google entrar.

Se mudar o `Codigo.gs` depois, use **Implantar → Gerenciar implantações → editar → Nova versão**, para a URL continuar
a mesma.

As abas aparecem no primeiro envio:

| Aba | O que tem |
|---|---|
| **Camisas** | uma linha por camisa do grupo: data, ID, nome, autor (o nome da conta Google), as escolhas (o que vai no link) e o e-mail de quem criou |
| **Corações** | uma linha por coração: data, o e-mail de quem deu, o design (`p:<id>` para os prontos e `g:<id>` para as do grupo) e o nome dele |
| **Corações por design** | a apuração: quantos corações cada design tem, do mais amado para o menos (uma fórmula QUERY, que se atualiza sozinha) |

Os e-mails ficam só na planilha: o site mostra só os nomes. O script aceita até 1000 camisas, com nomes de até 40
letras.

## Publicar

Dentro desta pasta, rode `sh publicar.sh "o que mudou"`. O script:

1. põe um número de versão novo nos scripts da página da camisa, para o navegador não usar a cópia antiga;
2. roda `git add -A`;
3. envia ao GitHub.

O GitHub Pages atualiza em um ou dois minutos.

O `.gitignore` deixa de fora o `.DS_Store` e o `camisa-pei.png`, a imagem de todos os designs, que o site não usa
mais.

## Testar no computador

Para testar, sirva a pasta: rode `python3 -m http.server 8000` dentro dela e abra `http://localhost:8000/`. O login
não funciona abrindo o arquivo direto (`file://`). Sem a URL em `config.js`, a página funciona, mas a lista do grupo, o
salvamento e os corações ficam desligados.
