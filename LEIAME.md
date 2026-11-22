# Site de votação do novo logo do PEI

**No ar:** https://lucaslrodri.github.io/votacao/ (abre o formulário das finalistas).

**O link oficial para divulgar é https://lucaslrodri.github.io/votacao/?v=3** (é também o `og:url` das páginas). O
`?v=3` não muda nada no site: serve só para o WhatsApp gerar a prévia nova, com o banner quadrado. O WhatsApp guarda
a prévia de cada link, e o link sem o `?v=3` já tinha sido compartilhado com a prévia antiga. Se o banner mudar de
novo, troque para `?v=4` aqui e no `og:url` de `index.html` e `formulario.html`. Repositório: `lucaslrodri/votacao`
(esta pasta é o próprio repositório). Os votos vão para a planilha "Votação do novo logo do PEI (respostas do site)",
criada pelo Apps Script "Votação do logo do PEI (site)"; o login usa o projeto do Google Cloud `votacao-logo-pei`.

**Republicar** depois de mudar alguma coisa (por exemplo, depois do `sh gerar.sh`): dentro desta pasta,
`sh publicar.sh "o que mudou"`. O script põe um número de versão novo nos links dos scripts, para o navegador não
usar a cópia antiga, e envia ao GitHub; o GitHub Pages atualiza em um ou dois minutos. Quem já abriu a página nos
últimos 10 minutos pode precisar recarregar (Cmd+Shift+R).

São duas páginas, que gravam na mesma planilha:

- **`formulario.html`, o formulário das finalistas.** Funciona como um Google Forms, mas mostra as opções: as 12
  escolhidas da versão filtrada (`filtrada.typ`), em 20 etapas (`etapas.json`). Cada etapa mostra as finalistas num
  formato ou num uso só, e a pessoa marca as que ficam melhores, pelo menos uma (pode marcar mais):
  - assinaturas: horizontal e vertical;
  - tela: ícone pequeno (no quadrado arredondado), favicon do navegador, ícone de aplicativo e foto de perfil
    redonda;
  - cores: mono, negativa e mono negativa;
  - camisas polo: azul, amarela, branca e preta;
  - papel e evento: crachá, slide e lista de realizadores;
  - critérios: identidade, conceito, coerência e simplicidade. A nitidez e o uso em uma cor já estão nos formatos.

  Antes, a pessoa entra com a conta Google. Ela não digita o e-mail, mas o e-mail da conta identifica o voto (um por
  e-mail) e fica guardado na planilha. No fim vêm o resumo e um comentário. A ordem das opções é embaralhada para cada
  pessoa.
- **`completo.html`, o site completo.** Todas as candidatas, com o voto geral, a melhor de cada logo e as estrelas nos
  critérios (descrito abaixo).

A seleção do formulário vem de `filtrada.typ`: o `sh gerar.sh` grava a lista em `selecao.js`.

Uma página com todas as candidatas, agrupadas por logo. Cada candidata aparece em vários formatos: horizontal, vertical,
ícone, negativa, foto de perfil e favicon. Clique numa imagem para ampliar.

Cada pessoa:

1. escolhe **uma** candidata com o botão **Votar nesta** (é o voto);
2. nos logos com várias variantes, escolhe a melhor de cada um em **Melhor deste logo** (opcional);
3. se quiser, dá de 1 a 4 estrelas nos seis critérios (Nitidez, Identidade, Uma cor, Conceito, Coerência,
   Simplicidade) das candidatas que quiser;
4. escreve o nome e clica em **Enviar voto**.

Os envios vão para uma planilha do Google. O que a pessoa marca fica guardado no navegador dela até o envio. Se ela
enviar de novo do mesmo navegador, vale o último envio.

## Arquivos

| Arquivo | O que é |
|---|---|
| `formulario.html`, `formulario.js`, `selecao.js`, `etapas.js` | o formulário das finalistas, a lista delas e as etapas (de `etapas.json`) |
| `completo.html`, `app.js` | o site completo |
| `config.js` | a URL da planilha (o único arquivo para editar à mão) |
| `social-quadrado.png`, `social.png` | os banners que o WhatsApp e as redes mostram ao compartilhar o link (etiquetas Open Graph em `index.html` e `formulario.html`): o quadrado, só com o título e os ícones, vem primeiro, porque o WhatsApp no computador mostra a prévia num quadradinho; o largo é para quem mostra a prévia grande. Feitos por `banner-social-quadrado.typ` e `banner-social.typ`, que o `sh gerar.sh` recompila. |
| `dados.js`, `img/` | a lista e as imagens das candidatas. O `sh gerar.sh` refaz os dois e não mexe no `config.js`. |
| `apps-script/Codigo.gs` | o código que grava na planilha |
| `montar.py` | monta `dados.js` e `img/` a partir de `opcoes/` (o `gerar.sh` chama) |

## 1. Ligar a planilha (uma vez, uns 5 minutos)

1. No Google Drive, crie uma planilha nova (por exemplo, "Votação do logo do PEI").
2. Na planilha, abra **Extensões → Apps Script**. Apague o código que aparece, cole o conteúdo de
   `apps-script/Codigo.gs` e salve.
3. Clique em **Implantar → Nova implantação**. Na engrenagem, escolha **App da Web**. Preencha:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**, para quem vota não precisar entrar com conta Google
4. Clique em **Implantar** e autorize o acesso à planilha. O Google avisa que o app "não foi verificado": clique em
   *Avançado → Acessar*. O app é seu e só grava nesta planilha.
5. Copie a **URL do app da Web** (termina em `/exec`) e cole em `config.js`, entre as aspas:
   `window.URL_PLANILHA = "https://script.google.com/macros/s/…/exec";`
6. Para conferir, abra essa URL no navegador. Deve aparecer `{"ok":true,…}`.

As abas aparecem no primeiro envio de cada página:

| Aba | O que tem |
|---|---|
| **Formulário** | uma linha por e-mail: as finalistas marcadas em cada etapa e o comentário |
| **Escolhas por formato** | uma linha por e-mail, etapa e finalista marcada |
| **Apuração por formato** | em cada etapa, quantas marcações cada finalista teve |
| **Apuração do formulário** | a soma das marcações de cada finalista em todas as etapas |
| **Voto** | (site completo) uma linha por pessoa: data, nome, a candidata escolhida e o comentário |
| **Apuração** | quantos votos cada candidata teve, da mais votada para a menos |
| **Melhor por logo** | uma linha por pessoa e logo: a variante que ela achou melhor naquele logo |
| **Apuração por logo** | em cada logo, quantas vezes cada variante foi escolhida como a melhor |
| **Notas** | uma linha por candidata com estrelas: as seis notas e o total (até 24) |
| **Média das notas** | a média de cada critério e do total, por candidata |

Se mudar o `Codigo.gs` depois, publique de novo em **Implantar → Gerenciar implantações → editar → Nova versão**.
Assim a URL continua a mesma.

## 1b. Ligar o login com o Google (só para o formulário)

O formulário usa o "Fazer login com o Google". Para isso, o Google pede um ID do cliente OAuth, que se cria uma vez:

1. Abra console.cloud.google.com e crie um projeto (por exemplo, "Votação PEI").
2. Configure a tela de consentimento em **APIs e serviços → Tela de consentimento OAuth**:
   - tipo **Externo**;
   - nome do app e e-mail de suporte;
   - escopos `email` e `profile`;
   - publique o app ("Em produção"), para qualquer conta Google poder entrar.
3. Crie o ID em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - tipo **Aplicativo da Web**;
   - em **Origens JavaScript autorizadas**, ponha o endereço do site (por exemplo, `https://seu-usuario.github.io`)
     e, para testar no computador, `http://localhost:8000`.
4. Copie o ID, que termina em `.apps.googleusercontent.com`, para dois lugares:
   - `site/config.js`, em `window.CLIENTE_GOOGLE`;
   - `apps-script/Codigo.gs`, em `CLIENTE_GOOGLE`. Depois publique uma nova versão do Apps Script.

O Apps Script confere cada login com o Google (`tokeninfo`) antes de gravar. Assim, ninguém vota com o e-mail de
outra pessoa. Ao publicar o Apps Script, o Google pede também a autorização para "acessar serviços externos" (é essa
conferência).

O login não funciona abrindo o arquivo direto (`file://`). Para testar no computador, sirva a pasta: `python3 -m
http.server 8000` dentro de `site/` e abra `http://localhost:8000/formulario.html`.

## 2. Testar

Abra `completo.html` no navegador, direto da pasta: funciona sem servidor. Vote numa candidata, escreva um nome de
teste e envie. Em alguns segundos a linha aparece na aba **Voto**. Depois apague as linhas de teste.

## 3. Publicar para quem vai votar

A pasta `site/` é um site estático e pode ir para qualquer hospedagem gratuita:

- **Netlify Drop** (o mais rápido): entre em app.netlify.com/drop e arraste a pasta `site`. Sai um link na hora.
- **GitHub Pages**: crie um repositório, suba o conteúdo de `site/` e ative em *Settings → Pages* (branch `main`,
  pasta `/`).

Mande o link para o grupo. Para encerrar a votação, abra **Implantar → Gerenciar implantações** e arquive a
implantação. O site continua no ar, mas os envios param de chegar.

## Limites

- **Um voto por pessoa é por navegador.** Quem trocar de navegador ou limpar os dados vota de novo. Para uma votação
  interna do grupo basta. Na aba **Voto** dá para ver os nomes e apagar os repetidos.
- **O site não confirma o recebimento.** O Apps Script não deixa a página ler a resposta (CORS), então o aviso de
  "enviado" só garante que o envio saiu do navegador. Na primeira vez, confira na planilha.
