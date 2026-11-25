// Camisa do PEI: a cor de cada um. A camisa é a Clássica, na polo azul ou na preta; quem quer a camisa entra com o
// Google no site (site/index.html), escolhe a cor e põe o nome completo, e este script anota na planilha. A lista dos
// pedidos (nome e cor, sem e-mail) é livre; anotar e tirar o nome pedem o login, e o script confere a credencial no
// Google (tokeninfo) antes de gravar. Uma linha por conta Google: escolher de novo troca a cor.
// Grava na aba "Cor da camisa" (com a contagem em "Cor da camisa (total)") da mesma planilha da votação do logo
// ("Votação do novo logo do PEI (respostas do site)"), aberta pelo ID guardado nas propriedades deste projeto
// (PLANILHA_ID). As outras abas (a votação do logo, as camisas e os corações) ficam como estão. O código das camisas
// do grupo e dos corações (votação encerrada em 25/11/2026) saiu daqui no mesmo dia e continua no histórico do git.
//
// Como instalar (passo a passo em site/LEIAME.md):
//   1. No projeto do Apps Script "Votação do logo do PEI (site)", apague o código antigo, cole este arquivo e salve.
//   2. Implantar → Nova implantação → tipo "App da Web"; Executar como: Eu; Quem pode acessar: Qualquer pessoa.
//   3. Copie a URL do app da Web (termina em /exec) para window.URL_PEDIDOS, em site/config.js.
//
// O site manda tudo por POST (JSON em texto), com o token do login (a credencial que o Google assina) quando há:
//   { acao: "pedidos" }                     a lista: [{ nome, cor }] e o total de cada cor (sem login)
//   { acao: "pedidos", token }              o mesmo, e o pedido de quem está logado (meu: { nome, cor } ou null)
//   { acao: "cor", token, cor, nome }       anota ou troca a cor ("azul" ou "preta") e o nome completo
//   { acao: "tirar", token }                tira o nome da lista
// A resposta: { ok, eu: { nome } ou null, meu, pedidos: [{ nome, cor }], total: { azul, preta } }. Os e-mails ficam
// só na planilha.

const CLIENTE_GOOGLE = '129979775868-s8hofjoin16lvroc5gdervjnk1dt1144.apps.googleusercontent.com';  // o mesmo de site/config.js
const ABERTO = true;          // false fecha os pedidos: a lista continua, mas ninguém anota nem tira mais
const ABA = 'Cor da camisa';
const CAB = ['Anotado em', 'Atualizado em', 'Nome completo', 'Cor', 'E-mail (conta Google)', 'Nome da conta Google'];
const ABA_TOTAL = 'Cor da camisa (total)';
const CORES = { azul: 'Azul', preta: 'Preta' };
const MAX_PEDIDOS = 500;      // um limite, para ninguém encher a planilha
const MAX_NOME = 80;

function doGet() {
  return resposta_({ ok: true, app: 'camisa do PEI: a cor' });   // abrir a URL no navegador mostra se o app está no ar
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (erro) { return resposta_({ ok: false, erro: 'pedido inválido' }); }
  try {
    if (d.acao === 'pedidos' && !d.token) return resposta_(lista_(null));
    const eu = login_(d.token);
    if (!eu) return resposta_({ ok: false, erro: 'login', mensagem: 'login do Google inválido ou expirado' });
    if (d.acao === 'pedidos') return resposta_(lista_(eu));
    if (d.acao !== 'cor' && d.acao !== 'tirar') return resposta_({ ok: false, erro: 'ação desconhecida' });
    if (!ABERTO) return resposta_({ ok: false, erro: 'fechado', mensagem: 'os pedidos já foram fechados' });
    const trava = LockService.getScriptLock();
    trava.waitLock(30000);
    try {
      const r = d.acao === 'cor' ? anotar_(d, eu) : tirar_(eu);
      return resposta_(r.ok ? lista_(eu) : r);
    } finally {
      trava.releaseLock();
    }
  } catch (erro) {
    return resposta_({ ok: false, erro: String(erro) });
  }
}

// Confere a credencial do login com o Google: assinada pelo Google, emitida para o nosso cliente (aud), dentro da
// validade e com o e-mail verificado. Devolve { email, nome }, ou null. Guarda a resposta por até 10 minutos (no
// máximo até a credencial vencer).
function login_(token) {
  token = String(token || '');
  if (!token || token.length > 4096) return null;
  const cache = CacheService.getScriptCache(), chave = 'login:' + resumo_(token);
  const guardado = cache.get(chave);
  if (guardado) return JSON.parse(guardado);
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  const t = JSON.parse(r.getContentText());
  const verificado = t.email_verified === true || t.email_verified === 'true';
  const resta = Number(t.exp) - Date.now() / 1000;
  if (t.aud !== CLIENTE_GOOGLE || !verificado || !(resta > 0) || !t.email) return null;
  const email = String(t.email).toLowerCase();
  const eu = { email: email, nome: texto_(t.name, MAX_NOME) || email.split('@')[0] };
  if (resta > 5) cache.put(chave, JSON.stringify(eu), Math.min(600, Math.floor(resta)));
  return eu;
}

// as linhas da aba: [{ i (número da linha), nome, cor ("azul"/"preta"), email }]
function linhas_() {
  const aba = planilha_().getSheetByName(ABA);
  if (!aba || aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB.length).getValues().map(function (l, k) {
    const cor = String(l[3]).trim().toLowerCase();
    return { i: k + 2, nome: String(l[2]).trim(), cor: cor === 'preta' ? 'preta' : cor === 'azul' ? 'azul' : '',
      email: String(l[4]).trim().toLowerCase() };
  }).filter(function (l) { return l.nome && l.cor; });
}

// a lista: em ordem alfabética, sem os e-mails; com login, o pedido da própria pessoa
function lista_(eu) {
  const todas = linhas_();
  const pedidos = todas.map(function (l) { return { nome: l.nome, cor: l.cor }; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  const total = { azul: 0, preta: 0 };
  pedidos.forEach(function (p) { total[p.cor]++; });
  const meu = eu ? todas.filter(function (l) { return l.email === eu.email; })[0] : null;
  return { ok: true, aberto: ABERTO, eu: eu ? { nome: eu.nome } : null, meu: meu ? { nome: meu.nome, cor: meu.cor } : null,
    pedidos: pedidos, total: total };
}

// anota ou troca: uma linha por e-mail
function anotar_(d, eu) {
  const cor = String(d.cor || '');
  if (!CORES[cor]) return { ok: false, erro: 'escolha a cor: azul ou preta' };
  const nome = texto_(d.nome, MAX_NOME);
  if (nome.length < 3) return { ok: false, erro: 'escreva o seu nome completo' };
  const aba = aba_();
  const agora = new Date();
  const minha = linhas_().filter(function (l) { return l.email === eu.email; })[0]
    || achar_(aba, eu.email);
  if (minha) {
    aba.getRange(minha.i, 2, 1, 3).setValues([[agora, seguro_(nome), CORES[cor]]]);
    aba.getRange(minha.i, 6).setValue(seguro_(eu.nome));
    return { ok: true };
  }
  if (aba.getLastRow() - 1 >= MAX_PEDIDOS) return { ok: false, erro: 'a lista está cheia' };
  aba.appendRow([agora, agora, seguro_(nome), CORES[cor], eu.email, seguro_(eu.nome)]);
  return { ok: true };
}

function tirar_(eu) {
  const aba = aba_();
  const minha = achar_(aba, eu.email);
  if (minha) aba.deleteRow(minha.i);
  return { ok: true };
}

// a linha do e-mail (coluna E), mesmo que o nome ou a cor estejam vazios
function achar_(aba, email) {
  const n = aba.getLastRow() - 1;
  if (n < 1) return null;
  const emails = aba.getRange(2, 5, n, 1).getValues();
  for (let k = 0; k < emails.length; k++) if (String(emails[k][0]).trim().toLowerCase() === email) return { i: k + 2 };
  return null;
}

// a aba dos pedidos e a contagem (quantos de cada cor), criadas na primeira vez
function aba_() {
  const planilha = planilha_();
  let aba = planilha.getSheetByName(ABA);
  if (!aba) {
    aba = planilha.insertSheet(ABA, 0);
    aba.getRange(1, 1, 1, CAB.length).setValues([CAB]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  if (!planilha.getSheetByName(ABA_TOTAL)) {
    const t = planilha.insertSheet(ABA_TOTAL, 1);
    query_(t.getRange('A1'), '\'' + ABA + '\'!C:D', 'select D, count(C) where C is not null group by D ' +
      'label D \'Cor\', count(C) \'Pedidos\'');
    t.setFrozenRows(1);
  }
  return aba;
}

// O separador dos argumentos das fórmulas segue o idioma da planilha: vírgula em inglês, ponto e vírgula em
// português. O setFormula não traduz, então tenta a vírgula e, se der erro de fórmula, o ponto e vírgula.
function query_(celula, intervalo, consulta) {
  [',', ';'].some(function (s) {
    celula.setFormula('=QUERY(' + intervalo + s + ' "' + consulta + '"' + s + ' 1)');
    SpreadsheetApp.flush();
    return !/^#ERRO|^#ERROR/.test(celula.getDisplayValue());
  });
}

// os nomes: uma linha só, sem espaços sobrando, até max letras
function texto_(s, max) {
  return String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
// um texto que começa com = + - @ viraria fórmula na planilha: o apóstrofo o guarda como texto (e não aparece)
function seguro_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }

function resumo_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

// A planilha da votação: a do ID guardado nas propriedades do projeto; se não houver (um projeto novo), cria uma
function planilha_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PLANILHA_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* apagada: cria outra */ }
  }
  const nova = SpreadsheetApp.create('Camisa do PEI (pedidos)');
  props.setProperty('PLANILHA_ID', nova.getId());
  return nova;
}

// Rode uma vez no editor: cria as abas e mostra o link da planilha
function configurar() {
  aba_();
  Logger.log('Planilha: ' + planilha_().getUrl());
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
