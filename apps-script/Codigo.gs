// Votação do novo logo do PEI: recebe os envios do site completo (site/completo.html) e do formulário das finalistas
// (site/formulario.html) e grava na mesma planilha, cada um nas suas abas.
// Como instalar (passo a passo em site/LEIAME.md):
//   1. script.google.com → Novo projeto; apague o que estiver lá e cole este arquivo; preencha CLIENTE_GOOGLE.
//   2. Execute a função configurar (uma vez): ela cria a planilha da votação e mostra o link no registro.
//   3. Implantar → Nova implantação → tipo "App da Web"; Executar como: Eu; Quem pode acessar: Qualquer pessoa.
//   4. Copie a URL do app da Web (termina em /exec) para site/config.js.
// O formulário usa o login com o Google: o site manda a credencial (o token que o Google assina) e este script a
// confere no Google (tokeninfo) antes de gravar; o e-mail verificado da conta é o identificador do voto. Cole em
// CLIENTE_GOOGLE o mesmo ID do cliente OAuth de site/config.js.
// Abas do formulário (o e-mail identifica o voto; em cada formato, uma ou mais finalistas marcadas):
//   Formulário             uma linha por e-mail: as marcadas em cada formato e o comentário
//   Escolhas por formato   uma linha por e-mail, formato e finalista marcada (boa para contar)
//   Apuração por formato   em cada formato, quantas marcações cada finalista teve, da mais marcada para a menos
//   Apuração do formulário a soma das marcações de cada finalista em todos os formatos, com um gráfico de barras
//   Apuração por critério  as marcações nos quatro critérios, uma coluna por critério, com um gráfico empilhado
// Abas do site completo:
//   Voto            uma linha por pessoa: a candidata escolhida e o comentário
//   Apuração        quantos votos cada candidata teve, da mais votada para a menos
//   Melhor por logo uma linha por pessoa e logo: a variante que ela achou melhor naquele logo
//   Apuração por logo  em cada logo, quantas vezes cada variante foi escolhida como a melhor
//   Notas           uma linha por candidata avaliada nas estrelas (1 a 4 em cada critério) e o total
//   Média das notas a média das estrelas de cada candidata, da maior para a menor
// Um voto por pessoa: no formulário, pelo e-mail; no site completo, por um código do navegador (votante). Se a
// mesma pessoa enviar de novo, o envio anterior dela sai e fica só o novo.

const CLIENTE_GOOGLE = '129979775868-s8hofjoin16lvroc5gdervjnk1dt1144.apps.googleusercontent.com';  // o ID do cliente OAuth (o mesmo de site/config.js)
const ABA_VOTO = 'Voto';
const ABA_APURACAO = 'Apuração';
const ABA_MELHOR = 'Melhor por logo';
const ABA_APURACAO_LOGO = 'Apuração por logo';
const ABA_NOTAS = 'Notas';
const ABA_MEDIA = 'Média das notas';
const CRITERIOS = ['Nitidez', 'Identidade', 'Uma cor', 'Conceito', 'Coerência', 'Simplicidade'];
const CAB_VOTO = ['Data e hora', 'Envio', 'Votante', 'Nome', 'Voto (código)', 'Logo', 'Variante', 'Comentário'];
// o formulário: as colunas dos formatos saem dos próprios envios (etapas.json, no site), na ordem das etapas
const ABA_FORM = 'Formulário';
const ABA_ESCOLHAS = 'Escolhas por formato';
const ABA_APURACAO_FORMATO = 'Apuração por formato';
const ABA_APURACAO_FORM = 'Apuração do formulário';
const ABA_APURACAO_CRIT = 'Apuração por critério';
const CAB_ESCOLHAS = ['Data e hora', 'Envio', 'E-mail', 'Nº', 'Formato', 'Código', 'Logo'];
const CAB_MELHOR = ['Data e hora', 'Envio', 'Votante', 'Nome', 'Logo nº', 'Logo', 'Código', 'Variante'];
const CAB_NOTAS = ['Data e hora', 'Envio', 'Votante', 'Nome', 'Código', 'Logo', 'Variante'].concat(CRITERIOS,
  ['Total (de 24)']);

function doPost(e) {
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    const d = JSON.parse(e.postData.contents);
    const planilha = planilha_();
    if (d.formatos) return resposta_(formulario_(planilha, d));
    const abaVoto = aba_(planilha, ABA_VOTO, CAB_VOTO);
    const abaMelhor = aba_(planilha, ABA_MELHOR, CAB_MELHOR);
    const abaNotas = aba_(planilha, ABA_NOTAS, CAB_NOTAS);
    resumos_(planilha);
    const quando = new Date();
    const envio = Utilities.getUuid().slice(0, 8);
    const votante = String(d.votante || envio).slice(0, 40);
    const nome = String(d.nome || '').slice(0, 120);
    apagar_(abaVoto, votante);
    apagar_(abaMelhor, votante);
    apagar_(abaNotas, votante);

    const v = d.voto || {};
    abaVoto.appendRow([quando, envio, votante, nome, String(v.codigo || ''), String(v.logo || ''),
      String(v.variante || ''), String(d.comentario || '').slice(0, 2000)]);

    const melhores = (d.melhores || []).map(function (m) {
      return [quando, envio, votante, nome, Number(m.n) || '', String(m.logo || ''), String(m.codigo || ''),
        String(m.variante || '')];
    });
    if (melhores.length) {
      abaMelhor.getRange(abaMelhor.getLastRow() + 1, 1, melhores.length, CAB_MELHOR.length).setValues(melhores);
    }

    const linhas = (d.notas || []).map(function (c) {
      const notas = CRITERIOS.map(function (_, j) {
        const x = Number((c.notas || [])[j]);
        return x >= 1 && x <= 4 ? x : '';
      });
      const total = notas.reduce(function (s, x) { return s + (x || 0); }, 0);
      return [quando, envio, votante, nome, String(c.codigo || ''), String(c.logo || ''), String(c.variante || '')]
        .concat(notas, [total]);
    });
    if (linhas.length) {
      abaNotas.getRange(abaNotas.getLastRow() + 1, 1, linhas.length, CAB_NOTAS.length).setValues(linhas);
    }
    return resposta_({ ok: true, voto: v.codigo || null, melhores: melhores.length, notas: linhas.length });
  } catch (erro) {
    return resposta_({ ok: false, erro: String(erro) });
  } finally {
    trava.releaseLock();
  }
}

// O formulário: uma linha na aba Formulário (as marcadas em cada formato) e uma por marcação em Escolhas por formato
function formulario_(planilha, d) {
  const email = emailDoLogin_(d.token);
  if (!email) return { ok: false, erro: 'login do Google inválido ou expirado' };
  const fs = (d.formatos || []).filter(function (f) { return f && f.formato; });
  const nomes = fs.map(function (f) { return String(f.formato); });
  const abaForm = aba_(planilha, ABA_FORM, ['Data e hora', 'Envio', 'E-mail'].concat(nomes, ['Comentário']));
  const abaEsc = aba_(planilha, ABA_ESCOLHAS, CAB_ESCOLHAS);
  apuracoesForm_(planilha, false);
  try { graficos_(planilha); } catch (err) { console.warn('gráficos: ' + err); }  // um gráfico nunca impede o voto
  // as colunas da aba Formulário: as que já existem e, no fim, os formatos novos
  let cab = abaForm.getRange(1, 1, 1, abaForm.getLastColumn()).getValues()[0].map(String);
  nomes.forEach(function (nome) {
    if (cab.indexOf(nome) < 0) {
      abaForm.getRange(1, cab.length + 1).setValue(nome).setFontWeight('bold');
      cab = cab.concat([nome]);
    }
  });
  const quando = new Date();
  const envio = Utilities.getUuid().slice(0, 8);
  apagar_(abaForm, email);
  apagar_(abaEsc, email);
  const linha = cab.map(function (col) {
    if (col === 'Data e hora') return quando;
    if (col === 'Envio') return envio;
    if (col === 'E-mail') return email;
    if (col === 'Comentário') return String(d.comentario || '').slice(0, 2000);
    const f = fs.find(function (x) { return String(x.formato) === col; });
    return f ? (f.escolhas || []).map(function (e) { return String(e.codigo); }).join(', ') : '';
  });
  abaForm.appendRow(linha);
  const linhas = [];
  fs.forEach(function (f) {
    (f.escolhas || []).forEach(function (e) {
      linhas.push([quando, envio, email, Number(f.ordem) || '', String(f.formato), String(e.codigo || ''),
        String(e.logo || '')]);
    });
  });
  if (linhas.length) {
    abaEsc.getRange(abaEsc.getLastRow() + 1, 1, linhas.length, CAB_ESCOLHAS.length).setValues(linhas);
  }
  return { ok: true, marcacoes: linhas.length };
}

// Confere a credencial do login com o Google: assinada pelo Google, emitida para o nosso cliente (aud), dentro da
// validade e com o e-mail verificado. Devolve o e-mail, ou null.
function emailDoLogin_(token) {
  if (!token || !CLIENTE_GOOGLE) return null;
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  const t = JSON.parse(r.getContentText());
  const verificado = t.email_verified === true || t.email_verified === 'true';
  if (t.aud !== CLIENTE_GOOGLE || !verificado || Number(t.exp) * 1000 < Date.now()) return null;
  return String(t.email || '').toLowerCase() || null;
}

// A planilha da votação: criada na primeira vez e guardada nas propriedades do projeto
function planilha_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PLANILHA_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* apagada: cria outra */ }
  }
  const nova = SpreadsheetApp.create('Votação do novo logo do PEI (respostas do site)');
  props.setProperty('PLANILHA_ID', nova.getId());
  return nova;
}

// Rode uma vez no editor: cria a planilha (se ainda não existe) e mostra o link
function configurar() {
  Logger.log('Planilha da votação: ' + planilha_().getUrl());
  Logger.log('Login do Google: ' + (CLIENTE_GOOGLE ? 'configurado' : 'FALTA o CLIENTE_GOOGLE'));
}

// Abrir a URL no navegador mostra se o app está no ar.
function doGet() {
  return resposta_({ ok: true, app: 'votação do novo logo do PEI' });
}

function aba_(planilha, nome, cabecalho) {
  let aba = planilha.getSheetByName(nome);
  if (!aba) {
    aba = planilha.insertSheet(nome);
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

// tira as linhas de um votante (coluna C), de baixo para cima
function apagar_(aba, votante) {
  const n = aba.getLastRow() - 1;
  if (n < 1) return;
  const ids = aba.getRange(2, 3, n, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === votante) aba.deleteRow(i + 2);
  }
}

// As abas de resumo do site completo, com fórmulas
function resumos_(planilha, refazer) {
  apuracao_(planilha, ABA_APURACAO, '\'' + ABA_VOTO + '\'!E:G', 'select E, F, G, count(E) where E is not null ' +
    'group by E, F, G order by count(E) desc label E \'Código\', F \'Logo\', G \'Variante\', count(E) \'Votos\'', refazer);
  // colunas da aba Melhor por logo: E nº do logo, F logo, G código, H variante
  apuracao_(planilha, ABA_APURACAO_LOGO, '\'' + ABA_MELHOR + '\'!E:H', 'select E, F, G, H, count(G) where G is not null ' +
    'group by E, F, G, H order by E, count(G) desc label E \'Nº\', F \'Logo\', G \'Código\', H \'Variante\', ' +
    'count(G) \'Escolhas\'', refazer);
  // colunas da aba Notas: E código, F logo, G variante, H–M critérios, N total
  apuracao_(planilha, ABA_MEDIA, '\'' + ABA_NOTAS + '\'!E:N', 'select E, F, G, avg(H), avg(I), avg(J), ' +
    'avg(K), avg(L), avg(M), avg(N), count(N) where E is not null group by E, F, G order by avg(N) desc ' +
    'label E \'Código\', F \'Logo\', G \'Variante\', avg(H) \'Nitidez\', avg(I) \'Identidade\', ' +
    'avg(J) \'Uma cor\', avg(K) \'Conceito\', avg(L) \'Coerência\', avg(M) \'Simplicidade\', ' +
    'avg(N) \'Total médio\', count(N) \'Avaliações\'', refazer);
}

// As apurações do formulário. Colunas de Escolhas por formato: D nº, E formato, F código, G logo.
function apuracoesForm_(planilha, refazer) {
  const fonte = '\'' + ABA_ESCOLHAS + '\'!';
  apuracao_(planilha, ABA_APURACAO_FORMATO, fonte + 'D:G', 'select D, E, F, G, count(F) where F is not null ' +
    'group by D, E, F, G order by D, count(F) desc label D \'Nº\', E \'Formato\', F \'Código\', G \'Logo\', ' +
    'count(F) \'Marcações\'', refazer);
  apuracao_(planilha, ABA_APURACAO_FORM, fonte + 'F:G', 'select F, G, count(F) where F is not null ' +
    'group by F, G order by count(F) desc label F \'Código\', G \'Logo\', count(F) \'Marcações (todos os formatos)\'',
    refazer);
  // só os quatro critérios: uma linha por logo e uma coluna por critério (é a tabela do gráfico empilhado)
  apuracao_(planilha, ABA_APURACAO_CRIT, fonte + 'E:G', 'select G, count(F) where E starts with \'Critério\' ' +
    'group by G pivot E label G \'Logo\'', refazer);
}

// Uma aba de apuração: uma QUERY na A1. Cria a aba se ela não existe; com refazer, reescreve a fórmula.
function apuracao_(planilha, nome, intervalo, consulta, refazer) {
  let a = planilha.getSheetByName(nome);
  if (a && !refazer) return a;
  if (!a) a = planilha.insertSheet(nome);
  query_(a.getRange('A1'), intervalo, consulta);
  a.setFrozenRows(1);
  return a;
}

// O separador dos argumentos das fórmulas segue o idioma da planilha: vírgula em inglês, ponto e vírgula em
// português. O setFormula não traduz (com vírgula, a planilha em português dava #ERROR!), então tenta a vírgula e,
// se der erro de fórmula, o ponto e vírgula.
function query_(celula, intervalo, consulta) {
  [',', ';'].some(function (s) {
    celula.setFormula('=QUERY(' + intervalo + s + ' "' + consulta + '"' + s + ' 1)');
    SpreadsheetApp.flush();
    return !/^#ERRO/.test(celula.getDisplayValue());
  });
}

// Os gráficos, que se atualizam sozinhos com as fórmulas: as marcações de cada finalista nas 20 etapas (barras) e as
// dos quatro critérios (barras empilhadas, uma cor por critério). Só cria o gráfico se a aba ainda não tem um.
function graficos_(planilha) {
  const tot = planilha.getSheetByName(ABA_APURACAO_FORM);
  if (tot && !tot.getCharts().length) {
    tot.insertChart(tot.newChart().asBarChart()
      .setTitle('Marcações de cada finalista (as 20 etapas)')
      .setLegendPosition(Charts.Position.NONE)
      .setColors(['#083671'])
      .addRange(tot.getRange('B1:C13'))
      .setNumHeaders(1)
      .setPosition(1, 5, 0, 0)
      .setOption('width', 760)
      .setOption('height', 440)
      .build());
  }
  const crit = planilha.getSheetByName(ABA_APURACAO_CRIT);
  if (crit && !crit.getCharts().length) {
    crit.insertChart(crit.newChart().asBarChart()
      .setStacked()
      .setTitle('Marcações nos quatro critérios, por finalista')
      .setLegendPosition(Charts.Position.TOP)
      .addRange(crit.getRange('A1:E13'))
      .setNumHeaders(1)
      .setPosition(1, 7, 0, 0)
      .setOption('width', 760)
      .setOption('height', 440)
      .build());
  }
}

// Conserta as apurações de uma planilha que já existe e põe os gráficos: no editor, escolha consertarApuracao e
// clique em Executar (uma vez). Foi preciso em 22/11/2026, porque as fórmulas antigas, com vírgula, davam #ERROR! na
// planilha em português.
function consertarApuracao() {
  const planilha = planilha_();
  if (planilha.getSheetByName(ABA_ESCOLHAS)) apuracoesForm_(planilha, true);
  if ([ABA_VOTO, ABA_MELHOR, ABA_NOTAS].some(function (n) { return planilha.getSheetByName(n); })) {
    resumos_(planilha, true);
  }
  graficos_(planilha);
  console.log('Pronto: ' + planilha.getUrl());
}

function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
