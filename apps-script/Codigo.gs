// Camisa do PEI: guarda as camisas que as pessoas montam no site (site/index.html) e os corações (cada coração é um
// voto num design), e devolve a lista e a contagem. Ver a lista e os corações é livre; salvar, apagar e dar coração
// pedem o login com o Google, e este script confere a credencial no Google (tokeninfo) antes de gravar.
// Grava nas abas "Camisas" e "Corações" (com a apuração em "Corações por design") da mesma planilha da votação do logo
// ("Votação do novo logo do PEI (respostas do site)"), aberta pelo ID guardado nas propriedades deste projeto
// (PLANILHA_ID). As abas da votação ficam como estão. O código da votação (encerrada em 23/11/2026) saiu daqui em
// 24/11/2026 e continua no histórico do git de site/.
//
// Como instalar (passo a passo em site/LEIAME.md):
//   1. No projeto do Apps Script "Votação do logo do PEI (site)", apague o código antigo, cole este arquivo e salve.
//   2. Implantar → Nova implantação → tipo "App da Web"; Executar como: Eu; Quem pode acessar: Qualquer pessoa.
//   3. Copie a URL do app da Web (termina em /exec) para window.URL_CAMISAS, em site/config.js.
//
// O site manda tudo por POST (JSON em texto), com o token do login (a credencial que o Google assina) quando há:
//   { acao: "lista" }                                 as camisas e os corações de cada design (sem login)
//   { acao: "lista", token }                          o mesmo, e as camisas e os corações do próprio usuário
//   { acao: "salvar", token, nome, estado }           uma camisa nova; o autor é o nome da conta Google; devolve o id
//   { acao: "salvar", token, id, nome, estado }       muda a camisa id, se for de quem está logado
//   { acao: "apagar", token, id }                     apaga a camisa id (e os corações dela), com a mesma condição
//   { acao: "coracao", token, alvo, nome, dar }       dá (dar = true) ou tira o coração no design alvo
// O estado é o que vai no link da página (por exemplo "l=sigla&c=nome-grande"). O alvo é "p:<id>" para os designs
// prontos (os ids de PRONTOS, em site/index.html) e "g:<id>" para as camisas do grupo. Um coração por conta Google em
// cada design. A resposta da lista: { ok, eu: { nome } ou null, camisas: [{ id, nome, autor, estado, criada, atualizada, minha }],
// coracoes: { alvo: n }, meus: [alvo] }. Os e-mails ficam só na planilha: a lista não os mostra.

const CLIENTE_GOOGLE = '129979775868-s8hofjoin16lvroc5gdervjnk1dt1144.apps.googleusercontent.com';  // o mesmo de site/config.js
const ABA_CAMISAS = 'Camisas';
const CAB_CAMISAS = ['Criada em', 'Atualizada em', 'ID', 'Nome da camisa', 'Autor', 'Escolhas (o que vai no link)',
  'E-mail do autor'];
const ABA_CORACOES = 'Corações';
const CAB_CORACOES = ['Data e hora', 'E-mail', 'Design', 'Nome do design'];
const ABA_APURACAO = 'Corações por design';
const MAX_CAMISAS = 1000;   // um limite, para ninguém encher a planilha
const MAX_TEXTO = 40;       // o nome da camisa

function doGet() {
  return resposta_({ ok: true, app: 'camisa do PEI' });   // abrir a URL no navegador mostra se o app está no ar
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (erro) { return resposta_({ ok: false, erro: 'pedido inválido' }); }
  // a lista é livre: sem token, vem sem as marcas de "minha" e sem os corações da pessoa
  if (d.acao === 'lista' && !d.token) {
    try { return resposta_(lista_(null)); } catch (erro) { return resposta_({ ok: false, erro: String(erro) }); }
  }
  const eu = login_(d.token);
  if (!eu) return resposta_({ ok: false, erro: 'login', mensagem: 'login do Google inválido ou expirado' });
  if (d.acao === 'lista') {
    try { return resposta_(lista_(eu)); } catch (erro) { return resposta_({ ok: false, erro: String(erro) }); }
  }
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    if (d.acao === 'salvar') return resposta_(salvar_(d, eu));
    if (d.acao === 'apagar') return resposta_(apagar_(d, eu));
    if (d.acao === 'coracao') return resposta_(coracao_(d, eu));
    return resposta_({ ok: false, erro: 'ação desconhecida' });
  } catch (erro) {
    return resposta_({ ok: false, erro: String(erro) });
  } finally {
    trava.releaseLock();
  }
}

// Confere a credencial do login com o Google: assinada pelo Google, emitida para o nosso cliente (aud), dentro da
// validade e com o e-mail verificado. Devolve { email, nome }, ou null. Guarda a resposta por até 10 minutos (no
// máximo até a credencial vencer), para os corações não esperarem o Google a cada clique.
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
  const eu = { email: email, nome: texto_(t.name, 60) || email.split('@')[0] };
  if (resta > 5) cache.put(chave, JSON.stringify(eu), Math.min(600, Math.floor(resta)));
  return eu;
}

// a lista: da mais recente para a mais antiga, sem os e-mails; "minha" marca as de quem pediu (com login)
function lista_(eu) {
  const aba = planilha_().getSheetByName(ABA_CAMISAS);
  const linhas = aba && aba.getLastRow() > 1 ? aba.getRange(2, 1, aba.getLastRow() - 1, CAB_CAMISAS.length).getValues() : [];
  const camisas = linhas.filter(function (l) { return l[2]; }).map(function (l) {
    return { id: String(l[2]), nome: String(l[3]), autor: String(l[4]), estado: String(l[5]),
      criada: data_(l[0]), atualizada: data_(l[1]), minha: !!eu && String(l[6]).toLowerCase() === eu.email };
  }).sort(function (a, b) { return a.atualizada < b.atualizada ? 1 : a.atualizada > b.atualizada ? -1 : 0; });
  const c = coracoes_();
  return { ok: true, eu: eu ? { nome: eu.nome } : null, camisas: camisas, coracoes: c.contagem,
    meus: eu ? (c.porEmail[eu.email] || []) : [] };
}

function salvar_(d, eu) {
  const nome = texto_(d.nome), estado = String(d.estado || '');
  if (!nome) return { ok: false, erro: 'falta o nome da camisa' };
  if (estado.length > 400 || !/^([a-z0-9]+=[a-z0-9.\-]*(&[a-z0-9]+=[a-z0-9.\-]*)*)?$/.test(estado)) {
    return { ok: false, erro: 'escolhas inválidas' };
  }
  const aba = aba_();
  const agora = new Date();
  if (d.id) {
    const i = linha_(aba, d.id);
    if (!i) return { ok: false, erro: 'esta camisa não existe mais' };
    if (String(aba.getRange(i, 7).getValue()).toLowerCase() !== eu.email) return { ok: false, erro: 'só quem criou pode mudar' };
    aba.getRange(i, 2, 1, 5).setValues([[agora, String(d.id), seguro_(nome), seguro_(eu.nome), estado]]);
    return { ok: true, id: String(d.id), autor: eu.nome };
  }
  if (aba.getLastRow() - 1 >= MAX_CAMISAS) return { ok: false, erro: 'a lista está cheia' };
  const id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
  aba.appendRow([agora, agora, id, seguro_(nome), seguro_(eu.nome), estado, eu.email]);
  return { ok: true, id: id, autor: eu.nome };
}

function apagar_(d, eu) {
  const aba = aba_();
  const i = linha_(aba, d.id);
  if (!i) return { ok: true, id: String(d.id || '') };        // já não existia
  if (String(aba.getRange(i, 7).getValue()).toLowerCase() !== eu.email) return { ok: false, erro: 'só quem criou pode apagar' };
  aba.deleteRow(i);
  apagarCoracoes_('g:' + String(d.id));
  return { ok: true, id: String(d.id) };
}

// Os corações: uma linha por e-mail e design. Dar de novo não repete; tirar apaga a linha.
function coracao_(d, eu) {
  const alvo = String(d.alvo || '');
  if (!/^(p:[a-z0-9-]{1,30}|g:[0-9a-f]{10})$/.test(alvo)) return { ok: false, erro: 'design inválido' };
  if (alvo.charAt(0) === 'g' && !linha_(aba_(), alvo.slice(2))) return { ok: false, erro: 'esta camisa não existe mais' };
  const aba = abaCoracoes_();
  const n = aba.getLastRow() - 1;
  const linhas = n > 0 ? aba.getRange(2, 2, n, 2).getValues() : [];
  let i = -1;
  for (let k = 0; k < linhas.length; k++) {
    if (String(linhas[k][0]).toLowerCase() === eu.email && String(linhas[k][1]) === alvo) { i = k; break; }
  }
  if (d.dar && i < 0) aba.appendRow([new Date(), eu.email, alvo, seguro_(texto_(d.nome, 90))]);
  if (!d.dar && i >= 0) aba.deleteRow(i + 2);
  return { ok: true, alvo: alvo, dado: !!d.dar, n: coracoes_().contagem[alvo] || 0 };
}

// a contagem de cada alvo e os alvos de cada e-mail
function coracoes_() {
  const aba = planilha_().getSheetByName(ABA_CORACOES);
  const contagem = {}, porEmail = {};
  if (!aba || aba.getLastRow() < 2) return { contagem: contagem, porEmail: porEmail };
  aba.getRange(2, 2, aba.getLastRow() - 1, 2).getValues().forEach(function (l) {
    const e = String(l[0]).toLowerCase(), a = String(l[1]);
    if (!a) return;
    contagem[a] = (contagem[a] || 0) + 1;
    (porEmail[e] = porEmail[e] || []).push(a);
  });
  return { contagem: contagem, porEmail: porEmail };
}

function apagarCoracoes_(alvo) {
  const aba = planilha_().getSheetByName(ABA_CORACOES);
  if (!aba || aba.getLastRow() < 2) return;
  const alvos = aba.getRange(2, 3, aba.getLastRow() - 1, 1).getValues();
  for (let k = alvos.length - 1; k >= 0; k--) if (String(alvos[k][0]) === alvo) aba.deleteRow(k + 2);
}

// o número da linha da camisa id (coluna C), ou 0
function linha_(aba, id) {
  const n = aba.getLastRow() - 1;
  if (n < 1 || !id) return 0;
  const ids = aba.getRange(2, 3, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function aba_() {
  const planilha = planilha_();
  let aba = planilha.getSheetByName(ABA_CAMISAS);
  if (!aba) {
    aba = planilha.insertSheet(ABA_CAMISAS);
    aba.getRange(1, 1, 1, CAB_CAMISAS.length).setValues([CAB_CAMISAS]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

// a aba dos corações e a apuração: quantos corações cada design tem, do mais amado para o menos
function abaCoracoes_() {
  const planilha = planilha_();
  let aba = planilha.getSheetByName(ABA_CORACOES);
  if (!aba) {
    aba = planilha.insertSheet(ABA_CORACOES);
    aba.getRange(1, 1, 1, CAB_CORACOES.length).setValues([CAB_CORACOES]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  if (!planilha.getSheetByName(ABA_APURACAO)) {
    const ap = planilha.insertSheet(ABA_APURACAO);
    query_(ap.getRange('A1'), '\'' + ABA_CORACOES + '\'!C:D', 'select C, D, count(C) where C is not null ' +
      'group by C, D order by count(C) desc label C \'Design\', D \'Nome\', count(C) \'Corações\'');
    ap.setFrozenRows(1);
  }
  return aba;
}

// O separador dos argumentos das fórmulas segue o idioma da planilha: vírgula em inglês, ponto e vírgula em
// português. O setFormula não traduz, então tenta a vírgula e, se der erro de fórmula, o ponto e vírgula.
function query_(celula, intervalo, consulta) {
  [',', ';'].some(function (s) {
    celula.setFormula('=QUERY(' + intervalo + s + ' "' + consulta + '"' + s + ' 1)');
    SpreadsheetApp.flush();
    return !/^#ERRO/.test(celula.getDisplayValue());
  });
}

// os nomes: uma linha só, sem espaços sobrando, até max letras
function texto_(s, max) {
  return String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || MAX_TEXTO);
}
// um texto que começa com = + - @ viraria fórmula na planilha: o apóstrofo o guarda como texto (e não aparece)
function seguro_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }

function resumo_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function data_(v) { return v instanceof Date ? v.toISOString() : String(v || ''); }

// A planilha da votação: a do ID guardado nas propriedades do projeto; se não houver (um projeto novo), cria uma
function planilha_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PLANILHA_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* apagada: cria outra */ }
  }
  const nova = SpreadsheetApp.create('Camisa do PEI (camisas do site)');
  props.setProperty('PLANILHA_ID', nova.getId());
  return nova;
}

// Rode uma vez no editor, se quiser: cria as abas e mostra o link da planilha
function configurar() {
  aba_();
  abaCoracoes_();
  Logger.log('Planilha: ' + planilha_().getUrl());
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
