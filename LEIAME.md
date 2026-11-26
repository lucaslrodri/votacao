# Site da camisa do PEI

O site fica em https://lucaslrodri.github.io/votacao/. O repositório é o `lucaslrodri/votacao`, e esta pasta é o
próprio repositório.

Até 23/11/2026, este era o site da votação do novo logo. Em 24/11/2026 ele virou o site da camisa do PEI, com o
montador da camisa na página inicial. A votação das camisas terminou em 25/11/2026 e venceu a Clássica; no mesmo dia,
o montador saiu do site (Lucas: "tem como remover o criador de camisas?") e a página inicial passou a ser a da cor da
camisa: cada um escolhe a Clássica azul ou a preta e põe o nome na lista. Tudo o que saiu continua no histórico do
git (o montador publicado é o do commit 87c20dc). O montador continua como ferramenta local, fora do site, em
`../montador/index.html`: o `../exportar-grafica.py` desenha com ele os modelos do kit da gráfica. As Inspirações
estão em `../inspiracoes.html` e `../inspiracoes/`.

## As páginas

| Página | O que é |
|---|---|
| `index.html` | **A camisa do PEI é a Clássica**: a escolha da cor e a lista dos pedidos (descritas abaixo). |
| `grafica.html` | **Para a gráfica**: só o que vai na camisa, a Clássica na polo azul e na preta: o logo do PEI do peito, a Ufac da manga e a bandeira do Brasil em SVG, PDF e EPS, com os textos em curvas, e em PNG de 600 ppi; os desenhos das duas Clássicas; as cores e as fontes (a Montserrat e a Inter vão no zip); e o guia em PDF, sem medidas (a malharia ajusta o tamanho). Tudo em `grafica/`, feito por `../exportar-grafica.py` (com `../grafica.typ` e `../guia-camisa.typ`). O botão "A lista dos pedidos" leva para `index.html#pedidos`. |
| `logo.html` | **O logo oficial para baixar**: o kit em zip, o manual de identidade, cada arquivo do logo e a imagem das versões (`kit-logo.png`, de `../kit-oficial.typ`). Os arquivos estão em `oficial/` e saem do `../exportar-oficial.sh`. |
| `resultado.html`, `formulario.html`, `completo.html`, `montar.html` | Só redirecionam os links antigos. `resultado.html#arquivos` vai para `logo.html`, e o resto vai para a página inicial. |

## A página inicial (`index.html`): os pedidos da camisa

Lucas, 25/11/2026: "manda a galera logar lá vc coloca quem quer azul ou preta para mandar para a gráfica, pode deixar
aberto para todo mundo e bota para exportar para um PDF ou um csv", "Vc anota na planilha", "o formulário vai na
própria página" e, depois, "deveria ter a quantidade e o carrinho na verdade e a pessoa (Em uma lista em baixo para
todo mundo ver)", "E o tamanho da camisa", "O tamanho é P, M, G ou GG", "Então a pessoa não precisa por o nome" e "Ao
final vc deixa exportar para csv ou pdf".

- **As duas cores.** Dois cartões, a Clássica na polo azul e na preta (frente e costas, de `grafica/modelos/`). A preta
  leva "Inspirada no modelo do Doug, o segundo colocado". Em cada cartão: o tamanho (P, M, G ou GG), a quantidade (de 1
  a 10) e "Adicionar ao carrinho". Os textos ficam curtos: os ajustes finos do desenho não vão para a página (Lucas:
  "Esse ajuste fino fica entre a gente").
- **O carrinho.** Os itens (cor e tamanho), com a quantidade e "Remover", e o total. Fica guardado na aba do navegador
  até enviar. Para enviar, a pessoa entra com o Google: o nome do pedido é o nome da conta Google (não há campo de
  nome). Um pedido por conta: enviar de novo troca o pedido inteiro, e "Cancelar o meu pedido" apaga. Quem já tem
  pedido e volta encontra o pedido no carrinho, para mudar. O login vale por uma hora, nesta aba.
- **A lista dos pedidos** (`#pedidos`, "Quem pediu o quê"), no fim da página, para todo mundo ver: os totais (azul,
  preta, camisas e pessoas), a tabela por cor e tamanho e as pessoas, em ordem alfabética, com o pedido de cada uma.
  No fim, "Baixar a lista (PDF)" (os totais por tamanho e as pessoas; jsPDF 2.5.1, do cdnjs, carregado só ao clicar)
  e "Baixar a lista (CSV)" (uma linha por item: Nome;Cor;Tamanho;Quantidade, com ponto e vírgula e BOM, que abre direto
  no Excel em português). Funciona no celular. A lista vem na hora, direto da planilha.
- **Ampliar** (Lucas: "deixa ampliar para ver os detalhes também (Da camisa com o modelo 3D - em um modal)"): o
  botão em cima de cada cor abre um modal com a camisa em 3D (o avatar do montador, girando com o dedo ou o mouse, com
  as vistas de frente, dos lados e de costas) e em desenho (frente, costas e as duas mangas, grandes). Dá para trocar
  a cor ali, e "Quero a polo ..." volta para o cartão da cor, no tamanho. O 3D só carrega quando abre: o three.js (do
  jsDelivr) e as peças da Clássica (`malhas-3d.js`, 0,5 MB), a Ufac 1,25× como nos desenhos.
- Os e-mails ficam só na planilha: o site mostra só o nome e o pedido.

| Arquivo | O que é |
|---|---|
| `pedidos.js` | os cartões (tamanho e quantidade), o carrinho, o login, a lista, o PDF e o CSV |
| `ampliar.js` | o modal do "Ampliar" |
| `camisa-3d.js` | o 3D do modal (módulo, com o three.js 0.160 pelo importmap da página) |
| `malhas-3d.js` | as peças 3D da Clássica, feito por `../avatar/malhas-classica.py` (que o `../avatar/exportar-3d.sh` roda no fim) |
| `config.js` | a URL do Apps Script (`window.URL_PEDIDOS`) e o ID do cliente OAuth do login (`window.CLIENTE_GOOGLE`), o único arquivo para editar à mão |
| `apps-script/Codigo.gs` | o código que confere o login e anota a cor na planilha |
| `resultado-camisas.js` | o resultado congelado da votação das camisas (o site não usa mais; fica de registro, e o montador o lê) |
| `social-cor.png` | o banner que o WhatsApp mostra ao compartilhar o link (etiquetas Open Graph): a Clássica azul e a preta e "Escolha a sua cor", feito por `../banner-cor.typ` (25/11/2026). O `social-camisa.png` ("Monte a camisa", de `../banner-camisa.typ`) não é mais usado. |

## A planilha

**Já está ligada** desde 25/11/2026: implantação "Camisa do PEI: pedidos (cor, tamanho e quantidade)" (a versão 4 da
implantação de antes, "Camisa do PEI: a cor (azul ou preta)", com a mesma URL, em `config.js`).

Os pedidos vão para a mesma planilha da votação, "Votação do novo logo do PEI (respostas do site)"
(https://docs.google.com/spreadsheets/d/1EseeOfNeeZJ83Z94A7mXL52F72eXsf_KqQFEvt0Ft7o/edit), em duas abas, na frente das
outras. O Apps Script é o mesmo projeto da votação, "Votação do logo do PEI (site)", que guarda o ID da planilha nas
propriedades (`PLANILHA_ID`). As outras abas (a votação do logo, as camisas e os corações) não mudam. As abas da
primeira versão ("Cor da camisa", só a cor) saíram vazias, pelo `configurar()`.

| Aba | O que tem |
|---|---|
| **Pedidos da camisa** | uma linha por item: quando anotou, quando mudou, o nome (o da conta Google), a cor (Azul ou Preta), o tamanho, a quantidade, o e-mail da conta e o nome da conta |
| **Pedidos da camisa (total)** | quantas camisas de cada cor e tamanho (uma fórmula QUERY com pivot; com a aba vazia, mostra erro até o primeiro pedido) |

Para fechar os pedidos: no `Codigo.gs`, ponha `const ABERTO = false;`, salve e faça uma nova versão da implantação
(abaixo). A lista continua no site, mas ninguém envia nem cancela mais. O script aceita até 10 itens por pedido, até
10 de cada item e até 2000 linhas.

Para refazer a ligação:

1. Abra o projeto "Votação do logo do PEI (site)" em script.google.com. Apague o código antigo, cole o conteúdo de
   `apps-script/Codigo.gs` e salve.
2. Se mudou só o código, use **Implantar → Gerenciar implantações → editar → Nova versão**, para a URL continuar a
   mesma. Para uma implantação nova: **Implantar → Nova implantação**, **App da Web**, Executar como: **Eu**, Quem pode
   acessar: **Qualquer pessoa**; copie a URL (termina em `/exec`) para `window.URL_PEDIDOS`, em `config.js`.
3. Para conferir, abra a URL no navegador. Deve aparecer `{"ok":true,"app":"camisa do PEI: pedidos"}`.
4. Publique o site (veja abaixo).

O login usa o mesmo cliente OAuth da votação (projeto do Google Cloud `votacao-logo-pei`, o ID em `config.js` e em
`CLIENTE_GOOGLE`, no `Codigo.gs`). Em **APIs e serviços → Credenciais**, o cliente precisa ter
`https://lucaslrodri.github.io` nas **Origens JavaScript autorizadas**, e `http://localhost:8000` para testar no
computador. A tela de consentimento tem de estar "Em produção", para qualquer conta Google entrar.

Antes, a cor ia num Google Forms ("Camisa do PEI: azul ou preta?"); ele foi para a lixeira em 25/11/2026 (Lucas: "Pode
deletar o formulário de antes"), sem nenhuma resposta. A planilha dele, "Camisa do PEI: azul ou preta? (respostas)",
ficou no Drive, vazia.

## Publicar

Dentro desta pasta, rode `sh publicar.sh "o que mudou"`. O script:

1. põe um número de versão novo nos scripts da página inicial, para o navegador não usar a cópia antiga;
2. roda `git add -A`;
3. envia ao GitHub.

O GitHub Pages atualiza em um ou dois minutos.

O `.gitignore` deixa de fora o `.DS_Store` e o `camisa-pei.png`, a imagem de todos os designs, que o site não usa
mais.

## Testar no computador

Para testar, sirva a pasta: rode `python3 -m http.server 8000` dentro dela e abra `http://localhost:8000/`. O login
não funciona abrindo o arquivo direto (`file://`); a lista, sim.

## O fim da votação das camisas (25/11/2026)

O resultado ficou congelado em `resultado-camisas.js`, feito por `../resultado-camisas.py` a partir da planilha (sem
e-mails). Entre os alunos, "Doug?", de Douglas Lima, com 2 corações, e "Clásica", de Elmer Osman Hancco Catata, com 1.
No total, "Clássica" (design pronto) teve 3 corações, e a "Clásica" do Elmer é o mesmo desenho. A Clássica venceu. A
lista das camisas dos alunos saiu da página inicial junto com o montador (Lucas: "Remove a partir daqui").

## Para a gráfica (25/11/2026)

`grafica.html` e a pasta `grafica/`: o kit da camisa para a gráfica, refeito por `python3 ../exportar-grafica.py`.
Só o que vai na camisa (Lucas: "Coloca só o que vai ser usado mesmo"): a Clássica na polo azul e na preta. São o logo
do PEI do peito (vertical, negativa), a Ufac da manga (vertical, branca), a bandeira do Brasil, os desenhos das duas
Clássicas, as quatro cores da camisa (azul PEI, preto, dourado e branco) e as fontes gratuitas (`fontes/`: a
Montserrat Bold e a Inter, a fonte da Ufac pelo manual da marca da Ufac). O guia (`grafica/guia-da-camisa-pei.pdf`) e
os resumos não têm medidas: o tamanho e a posição exata ficam com a malharia. O `camisa-pei-png-tamanhos.zip` tem
cada peça em PNG de 300 ppi, de 3 a 30 cm de largura (Lucas: "Coloque a parte da gráfica em diversos tamanhos (Vai
que a gráfica quer um tamanho diferente - Aí vc coloca em zip)"); os PNG soltos não ficam no site, só o zip.

Os ajustes finos (não aparecem nos textos do site nem do kit):

- os desenhos vêm do montador (`../montador/index.html`, o Chrome abre cada modelo pelo link), com `ub=1.25`: a Ufac
  da manga 1,25× maior (o Prof. Tiago achou a Ufac pequena perto da bandeira e escolheu 1,25×);
- a bandeira do Brasil é o SVG da Wikipédia (`../origem/bandeiras/Flag_of_Brazil.svg`, domínio público), na peça e
  nos desenhos;
- a Ufac (o escudo e as letras) sai de `../origem/parceiros/ufac.svg` em pedaços levados para a origem e cortados
  com clipPath: só com o viewBox, o Typst desenhava o logo inteiro de novo nas imagens.

Só a Clássica venceu (Lucas: "Deixe claro que é só a clássica que venceu"): o kit diz isso no topo do `grafica.html`,
na capa e na página do modelo do guia e no `LEIA-ME.txt`. A azul e a preta são o mesmo modelo; a preta é inspirada no
modelo do Doug, o segundo colocado.
