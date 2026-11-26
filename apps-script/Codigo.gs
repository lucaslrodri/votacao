// Camisa do PEI: os pedidos. A camisa é a Clássica, na polo azul ou na preta; quem quer a camisa entra com o Google
// no site (site/index.html), monta o carrinho (a cor, o tamanho e a quantidade de cada item) e põe o nome completo, e
// este script anota na planilha (Lucas, 25/11/2026: "deveria ter a quantidade e o carrinho na verdade e a pessoa (Em
// uma lista em baixo para todo mundo ver)", "A quantidade de pretas e azuis" e "E o tamanho da camisa"). A lista dos
// pedidos (nome e itens, sem e-mail) é livre; enviar e cancelar o pedido pedem o login, e o script confere a credencial
// no Google (tokeninfo) antes de gravar. Um pedido por conta Google: enviar de novo troca o pedido inteiro.
// Grava na aba "Pedidos da camisa" (uma linha por item; a contagem por cor e tamanho em "Pedidos da camisa (total)")
// da mesma planilha da votação do logo ("Votação do novo logo do PEI (respostas do site)"), aberta pelo ID guardado
// nas propriedades deste projeto (PLANILHA_ID). As outras abas ficam como estão.
//
// Como instalar (passo a passo em site/LEIAME.md):
//   1. No projeto do Apps Script "Votação do logo do PEI (site)", apague o código antigo, cole este arquivo e salve.
//   2. Implantar → Gerenciar implantações → editar → Nova versão (a URL continua a mesma, em site/config.js).
//
// O site manda tudo por POST (JSON em texto), com o token do login (a credencial que o Google assina) quando há:
//   { acao: "pedidos" }                           a lista e os totais (sem login)
//   { acao: "pedidos", token }                    o mesmo, e o pedido de quem está logado (meu)
//   { acao: "pedido", token, nome, itens }        anota ou troca o pedido; itens: [{ cor, tamanho, qtd }]
//   { acao: "tirar", token }                      cancela o pedido
// A resposta: { ok, aberto, eu: { nome } ou null, meu: { nome, itens } ou null, pedidos: [{ nome, itens }] }. Os
// e-mails ficam só na planilha.

const CLIENTE_GOOGLE = '129979775868-s8hofjoin16lvroc5gdervjnk1dt1144.apps.googleusercontent.com';  // o mesmo de site/config.js
const ABERTO = true;          // false fecha os pedidos: a lista continua, mas ninguém envia nem cancela mais
const ABA = 'Pedidos da camisa';
const CAB = ['Anotado em', 'Atualizado em', 'Nome completo', 'Cor', 'Tamanho', 'Quantidade', 'E-mail (conta Google)',
  'Nome da conta Google'];
const ABA_TOTAL = 'Pedidos da camisa (total)';
const CORES = { azul: 'Azul', preta: 'Preta' };
const TAMANHOS = ['P', 'M', 'G', 'GG'];   // a mesma lista de site/pedidos.js (Lucas: "O tamanho é P, M, G ou GG")
const MAX_QTD = 10;           // por item
const MAX_ITENS = 10;         // por pedido
const MAX_LINHAS = 2000;      // um limite, para ninguém encher a planilha
const MAX_NOME = 80;

function doGet() {
  return resposta_({ ok: true, app: 'camisa do PEI: pedidos' });   // abrir a URL no navegador mostra se o app está no ar
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (erro) { return resposta_({ ok: false, erro: 'pedido inválido' }); }
  try {
    if (d.acao === 'pedidos' && !d.token) return resposta_(lista_(null));
    const eu = login_(d.token);
    if (!eu) return resposta_({ ok: false, erro: 'login', mensagem: 'login do Google inválido ou expirado' });
    if (d.acao === 'pedidos') return resposta_(lista_(eu));
    if (d.acao !== 'pedido' && d.acao !== 'tirar') return resposta_({ ok: false, erro: 'ação desconhecida' });
    if (!ABERTO) return resposta_({ ok: false, erro: 'fechado', mensagem: 'os pedidos já foram fechados' });
    const trava = LockService.getScriptLock();
    trava.waitLock(30000);
    try {
      const r = d.acao === 'pedido' ? anotar_(d, eu) : (apagar_(eu.email), { ok: true });
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

// as linhas da aba: [{ i (número da linha), anotado, nome, cor, tamanho, qtd, email }]
function linhas_() {
  const aba = planilha_().getSheetByName(ABA);
  if (!aba || aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB.length).getValues().map(function (l, k) {
    const cor = String(l[3]).trim().toLowerCase();
    return { i: k + 2, anotado: l[0], nome: String(l[2]).trim(), cor: CORES[cor] ? cor : '',
      tamanho: String(l[4]).trim().toUpperCase(), qtd: Math.floor(Number(l[5]) || 0),
      email: String(l[6]).trim().toLowerCase() };
  });
}

// a lista: uma entrada por pessoa (o e-mail só agrupa, não sai), em ordem alfabética
function lista_(eu) {
  const porEmail = {};
  linhas_().forEach(function (l) {
    if (!l.nome || !l.cor || !(l.qtd > 0) || !l.email) return;
    const p = porEmail[l.email] || (porEmail[l.email] = { nome: l.nome, itens: [] });
    p.itens.push({ cor: l.cor, tamanho: l.tamanho, qtd: l.qtd });
  });
  const ordem = function (a, b) {
    return a.cor !== b.cor ? (a.cor === 'azul' ? -1 : 1) : TAMANHOS.indexOf(a.tamanho) - TAMANHOS.indexOf(b.tamanho);
  };
  Object.keys(porEmail).forEach(function (k) { porEmail[k].itens.sort(ordem); });
  const pedidos = Object.keys(porEmail).map(function (k) { return porEmail[k]; })
    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  return { ok: true, aberto: ABERTO, eu: eu ? { nome: eu.nome } : null, meu: eu ? (porEmail[eu.email] || null) : null,
    pedidos: pedidos };
}

// anota ou troca o pedido inteiro: apaga as linhas da pessoa e escreve uma por item
function anotar_(d, eu) {
  const nome = texto_(d.nome, MAX_NOME);
  if (nome.length < 3) return { ok: false, erro: 'escreva o seu nome completo' };
  if (!Array.isArray(d.itens)) return { ok: false, erro: 'o carrinho está vazio' };
  const junta = {};
  for (let k = 0; k < d.itens.length; k++) {
    const it = d.itens[k] || {}, cor = String(it.cor || ''), tam = String(it.tamanho || '').toUpperCase();
    const qtd = Math.floor(Number(it.qtd));
    if (!CORES[cor]) return { ok: false, erro: 'cor inválida' };
    if (TAMANHOS.indexOf(tam) < 0) return { ok: false, erro: 'tamanho inválido' };
    if (!(qtd >= 1 && qtd <= MAX_QTD)) return { ok: false, erro: 'quantidade inválida (de 1 a ' + MAX_QTD + ')' };
    const c = cor + '|' + tam;
    junta[c] = Math.min(MAX_QTD, (junta[c] || 0) + qtd);
  }
  const chaves = Object.keys(junta);
  if (!chaves.length) return { ok: false, erro: 'o carrinho está vazio' };
  if (chaves.length > MAX_ITENS) return { ok: false, erro: 'itens demais no carrinho' };
  const aba = aba_();
  const minhas = linhas_().filter(function (l) { return l.email === eu.email; }).length;
  if (aba.getLastRow() - 1 - minhas + chaves.length > MAX_LINHAS) return { ok: false, erro: 'a lista está cheia' };
  const antes = apagar_(eu.email);
  const agora = new Date();
  const linhas = chaves.map(function (c) {
    const p = c.split('|');
    return [antes || agora, agora, seguro_(nome), CORES[p[0]], p[1], junta[c], eu.email, seguro_(eu.nome)];
  });
  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, CAB.length).setValues(linhas);
  return { ok: true };
}

// apaga as linhas do e-mail; devolve a data da primeira anotação (para manter no pedido novo), ou null
function apagar_(email) {
  const aba = planilha_().getSheetByName(ABA);
  if (!aba) return null;
  let antes = null;
  const ls = linhas_().filter(function (l) { return l.email === email; });
  ls.forEach(function (l) { if (l.anotado instanceof Date && (!antes || l.anotado < antes)) antes = l.anotado; });
  for (let k = ls.length - 1; k >= 0; k--) aba.deleteRow(ls[k].i);
  return antes;
}

// a aba dos pedidos e a contagem (quantas camisas de cada cor e tamanho), criadas na primeira vez
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
    query_(t.getRange('A1'), '\'' + ABA + '\'!C:F', 'select D, sum(F) where C is not null group by D pivot E');
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

// Rode uma vez no editor: cria as abas e mostra o link da planilha. Apaga as abas da versão anterior ("Cor da
// camisa", só a cor, sem tamanho e quantidade), se estiverem vazias.
function configurar() {
  const planilha = planilha_();
  const velha = planilha.getSheetByName('Cor da camisa');
  if (velha && velha.getLastRow() < 2) {
    planilha.deleteSheet(velha);
    const t = planilha.getSheetByName('Cor da camisa (total)');
    if (t) planilha.deleteSheet(t);
  }
  aba_();
  Logger.log('Planilha: ' + planilha.getUrl());
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
