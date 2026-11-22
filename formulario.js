// O formulário de votação (formulario.html), em etapas: primeiro o login com o Google (a pessoa não digita o e-mail;
// o e-mail verificado da conta é o identificador do voto, um voto por e-mail, e um envio novo substitui o anterior;
// o Apps Script confere o login com o Google antes de gravar); depois, em cada etapa, as finalistas da versão filtrada (selecao.js,
// feito a partir de filtrada.typ) num formato só, e a pessoa marca as que ficam melhores naquele formato (pelo menos
// uma, pode marcar mais); no fim, o resumo e um comentário opcional. O envio vai para a planilha (config.js).
// As imagens: dados.js e img/<código>/ (mono.svg, negmono.svg e camisa-<cor>.png só das finalistas, pelo gerar.sh).
(function () {
  "use strict";
  const CHAVE = "pei-votacao-formulario-v4";
  // as etapas: os textos vêm de etapas.json (via etapas.js); aqui, como mostrar cada uma: o arquivo da finalista em
  // img/<código>/, o tipo de vista, o fundo e se os cartões são largos
  const VISTAS = {
    "horizontal": { arq: c => c.img.h, vista: "h", largas: true },
    "vertical": { arq: c => c.img.v, vista: "v" },
    "icone": { arq: () => "app.png", vista: "icones" },
    "favicon": { arq: () => "aba.png", vista: "aba", largas: true },
    "app": { arq: () => "app.png", vista: "app" },
    "perfil": { arq: c => c.img.perfil, vista: "perfil" },
    "mono": { arq: () => "mono.svg", vista: "m", largas: true },
    "negativa": { arq: c => c.img.neg, vista: "m", fundo: "azul", largas: true },
    "mono-negativa": { arq: () => "negmono.svg", vista: "m", fundo: "grafite", largas: true },
    "camisa-azul": { arq: () => "camisa-azul.png", vista: "camisa" },
    "camisa-amarela": { arq: () => "camisa-amarela.png", vista: "camisa" },
    "camisa-branca": { arq: () => "camisa-branca.png", vista: "camisa" },
    "camisa-preta": { arq: () => "camisa-preta.png", vista: "camisa" },
    "cracha": { arq: () => "cracha.png", vista: "cracha" },
    "slide": { arq: () => "slide.png", vista: "slide", largas: true },
    "realizacao": { arq: () => "realizacao.png", vista: "realizacao", largas: true },
  };
  // os critérios (nitidez, identidade, uma cor, conceito, coerência, simplicidade): a assinatura e o ícone
  window.ETAPAS.filter(e => e.id.startsWith("crit-")).forEach(e => {
    VISTAS[e.id] = { arq: c => c.img.h, vista: "geral", largas: true };
  });
  const ETAPAS = window.ETAPAS.filter(e => VISTAS[e.id]).map(e => Object.assign({}, e, VISTAS[e.id]));
  // os passos: 0 = o e-mail; 1 a N = as etapas de formato; N + 1 = o resumo com o comentário
  const N = ETAPAS.length;

  const porCodigo = {};
  window.PEI.logos.forEach(l => l.candidatas.forEach(c => { porCodigo[c.codigo] = c; }));
  const OPS = window.SELECAO.filter(s => porCodigo[s.cod]).map(s => Object.assign({}, s, { c: porCodigo[s.cod] }));

  function ler() { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } }
  const E = Object.assign({ respostas: {}, comentario: "", ordem: [], passo: 0 }, ler());
  const marcadas = id => (E.respostas[id] || []);
  // o login com o Google: a credencial (um JWT assinado pelo Google, válido por 1 hora) fica só na memória
  let login = null;  // { token, email, nome, exp }
  function lerJwt(t) {
    const b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(b).split("").map(ch => "%" + ("00" + ch.charCodeAt(0).toString(16)).slice(-2)).join("")));
  }
  const logado = () => login && login.exp * 1000 > Date.now() + 60000;
  // prévia: sem o login configurado (config.js), dá para percorrer as etapas e ampliar, mas não enviar
  let previa = false;
  // a ordem das opções, embaralhada uma vez por pessoa (a posição na tela não puxa voto) e a mesma em todas as etapas
  if (E.ordem.length !== OPS.length || !OPS.every(o => E.ordem.includes(o.cod))) {
    E.ordem = OPS.map(o => o.cod);
    for (let i = E.ordem.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [E.ordem[i], E.ordem[j]] = [E.ordem[j], E.ordem[i]];
    }
  }
  const ORD = E.ordem.map(cod => OPS.find(o => o.cod === cod));
  E.passo = 0;  // o login não fica guardado: toda visita começa por ele (as escolhas ficam)
  function guardar() { try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) { /* segue sem guardar */ } }
  function iniciarGoogle(alvo) {
    if (!window.CLIENTE_GOOGLE) {
      const ver = el("button", { type: "button", class: "link", text: "Ver as etapas em prévia (sem enviar)" });
      ver.addEventListener("click", () => { previa = true; E.passo = 1; guardar(); mostrar(); window.scrollTo(0, 0); });
      alvo.replaceChildren(el("p", { class: "ajuda", text: "O login com o Google ainda não foi ligado a este site " +
        "(falta o ID do cliente em config.js), então ainda não dá para votar." }), ver);
      return;
    }
    const tentar = () => {
      if (!(window.google && google.accounts && google.accounts.id)) { setTimeout(tentar, 200); return; }
      google.accounts.id.initialize({ client_id: window.CLIENTE_GOOGLE, auto_select: false, callback: r => {
        const d = lerJwt(r.credential);
        login = { token: r.credential, email: String(d.email || "").toLowerCase(), nome: d.name || "", exp: d.exp };
        pergunta.classList.remove("erro");
        mostrar();
      } });
      google.accounts.id.renderButton(alvo, { theme: "outline", size: "large", text: "signin_with", locale: "pt-BR" });
    };
    tentar();
  }
  guardar();

  function el(tag, attrs, filhos) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (filhos || []).forEach(f => n.appendChild(typeof f === "string" ? document.createTextNode(f) : f));
    return n;
  }
  const caminho = (o, et) => "img/" + o.cod + "/" + et.arq(o.c);
  const img = (src, alt, extra) => el("img", Object.assign({ src: src, alt: alt, decoding: "async" }, extra || {}));

  let tempo;
  function avisar(t) {
    const a = document.getElementById("aviso");
    a.textContent = t;
    a.style.display = "block";
    clearTimeout(tempo);
    tempo = setTimeout(() => { a.style.display = "none"; }, 5000);
  }
  const zoom = document.getElementById("zoom");
  function ampliar(o, et) {
    const caixa = zoom.querySelector(".caixa");
    caixa.className = "caixa" + (et.fundo ? " " + et.fundo : "");
    const im = zoom.querySelector("img");
    im.src = caminho(o, et);
    const quadrado = ["icones", "app", "perfil"].includes(et.vista);
    im.style.width = quadrado ? "220px" : "";
    im.style.height = quadrado ? "220px" : "";
    im.style.borderRadius = et.vista === "perfil" ? "50%" : "";
    zoom.querySelector("span").textContent = o.cod + " · " + o.nome + " · " + et.nome;
    zoom.style.display = "flex";
  }
  zoom.addEventListener("click", () => { zoom.style.display = "none"; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") zoom.style.display = "none"; });

  function vista(o, et) {
    if (et.vista === "perfil") {
      return el("div", { class: "vista perfil" }, [72, 40].map(px => el("figure", {}, [
        img(caminho(o, et), o.cod + " · perfil " + px + " px", { style: "width:" + px + "px;height:" + px + "px" }),
        el("figcaption", { text: px === 72 ? "perfil" : "na lista" })])));
    }
    if (et.vista === "geral") {
      return el("div", { class: "vista geral" }, [img(caminho(o, et), o.cod + " · horizontal", { loading: "lazy" }),
        img("img/" + o.cod + "/app.png", o.cod + " · ícone", { loading: "lazy", class: "ic" })]);
    }
    if (et.vista === "app") {
      return el("div", { class: "vista app" }, [el("figure", {}, [
        img(caminho(o, et), o.cod + " · ícone de app", { style: "width:60px;height:60px" }),
        el("figcaption", { text: "PEI" })])]);
    }
    if (et.vista === "icones") {
      return el("div", { class: "vista icones" }, [16, 24, 32].map(px => el("figure", {}, [
        img(caminho(o, et), o.cod + " · ícone " + px + " px", { width: String(px), height: String(px),
          style: "width:" + px + "px;height:" + px + "px" }),
        el("figcaption", { text: px + " px" })])));
    }
    return el("div", { class: "vista " + et.vista + (et.fundo ? " " + et.fundo : "") },
      [img(caminho(o, et), o.cod + " · " + et.nome, { loading: "lazy" })]);
  }

  const pergunta = document.getElementById("pergunta");
  const voltar = document.getElementById("voltar");
  const proxima = document.getElementById("proxima");
  function mostrar() {
    const p = E.passo;
    document.getElementById("etapa").textContent = p === 0 ? "Identificação" : p <= N ? "Etapa " + p + " de " + N :
      "Resumo";
    document.getElementById("barra").style.width = (Math.min(p, N + 1) / (N + 1) * 100) + "%";
    voltar.style.visibility = p === 0 ? "hidden" : "visible";
    proxima.textContent = p <= N ? "Próxima" : "Enviar";
    pergunta.classList.remove("erro");
    pergunta.replaceChildren();
    if (p === 0) {
      pergunta.append(
        el("h2", {}, ["Entre com a sua conta Google ", el("span", { class: "ast", text: "*" })]),
        el("p", { class: "ajuda", text: "Você não precisa digitar nada: o e-mail da sua conta identifica o voto. Vale " +
          "um voto por e-mail, e um envio novo substitui o anterior. O e-mail fica guardado na planilha da votação " +
          "e não aparece no resultado." }));
      if (logado()) {
        const trocar = el("button", { type: "button", class: "link", text: "usar outra conta" });
        trocar.addEventListener("click", () => { login = null; if (window.google) google.accounts.id.disableAutoSelect(); mostrar(); });
        pergunta.append(el("p", { class: "logado" }, ["Votando como ", el("b", { text: login.email }), " · ", trocar]));
      } else {
        const alvo = el("div", { class: "google" });
        pergunta.append(alvo);
        iniciarGoogle(alvo);
      }
      pergunta.append(el("p", { class: "msg", text: "Entre com a sua conta Google para continuar." }));
    } else if (p <= N) {
      const et = ETAPAS[p - 1];
      pergunta.append(
        el("h2", {}, [el("span", { class: "n", text: p + "." }), et.pergunta + " ", el("span", { class: "ast",
          text: "*" })]),
        el("p", { class: "ajuda" }, [et.ajuda + " ", el("b", { text: "Marque pelo menos uma; pode marcar mais." })]));
      const grade = el("div", { class: "opcoes" + (et.largas ? " largas" : ""), role: "group", "aria-label": et.nome });
      ORD.forEach(o => {
        const caixa = el("input", { type: "checkbox", name: et.id, value: o.cod, "aria-label": o.cod + " · " + o.nome });
        if (marcadas(et.id).includes(o.cod)) caixa.checked = true;
        caixa.addEventListener("change", () => {
          const atual = marcadas(et.id).filter(c => c !== o.cod);
          E.respostas[et.id] = caixa.checked ? atual.concat(o.cod) : atual;
          guardar();
          pergunta.classList.remove("erro");
        });
        const ver = el("button", { type: "button", class: "ampliar", text: "ampliar" });
        ver.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); ampliar(o, et); });
        grade.appendChild(el("label", { class: "op" }, [caixa,
          el("div", { class: "cab" }, [el("span", { class: "radio" }), el("span", { class: "selo", text: o.cod }),
            el("span", { class: "nome", text: o.nome })]),
          vista(o, et), ver]));
      });
      pergunta.append(grade, el("p", { class: "msg", text: "Marque pelo menos uma opção para continuar." }));
    } else {
      pergunta.append(el("h2", { text: "Confira seus votos" }),
        el("p", { class: "ajuda", text: (previa ? "Prévia, sem login." : "Votando como " + (login ? login.email : "?") +
          ".") + " Clique num formato para mudar as escolhas." }));
      const resumo = el("div", { class: "resumo" });
      ETAPAS.forEach((et, i) => {
        const cods = ORD.filter(o => marcadas(et.id).includes(o.cod)).map(o => o.cod);
        const b = el("button", { type: "button" }, [el("span", {}, [el("span", { class: "f", text: et.nome }),
          el("b", { text: cods.length ? cods.join(", ") : "sem escolha" })])]);
        b.addEventListener("click", () => { E.passo = i + 1; guardar(); mostrar(); window.scrollTo(0, 0); });
        resumo.appendChild(b);
      });
      const com = el("textarea", { maxlength: "2000", placeholder: "Comentário (opcional)" });
      com.value = E.comentario;
      com.addEventListener("input", () => { E.comentario = com.value; guardar(); });
      pergunta.append(resumo, el("h2", { text: "Comentário" }), com);
    }
  }

  const pronto = p => p === 0 ? (logado() || previa) : p <= N ? marcadas(ETAPAS[p - 1].id).length > 0 : true;
  voltar.addEventListener("click", () => { E.passo = Math.max(0, E.passo - 1); guardar(); mostrar(); window.scrollTo(0, 0); });
  proxima.addEventListener("click", async () => {
    if (E.passo <= N) {
      if (!pronto(E.passo)) {
        pergunta.classList.add("erro");
        return;
      }
      E.passo += 1;
      guardar();
      mostrar();
      window.scrollTo(0, 0);
      return;
    }
    if (previa) { avisar("Isto é uma prévia: para votar, ligue o login do Google e a planilha (site/LEIAME.md)."); return; }
    if (!logado()) { E.passo = 0; guardar(); mostrar(); avisar("O login expirou: entre de novo com a conta Google."); return; }
    const falta = [0].concat(ETAPAS.map((_, i) => i + 1)).find(p => !pronto(p));
    if (falta !== undefined) { E.passo = falta; guardar(); mostrar(); pergunta.classList.add("erro"); return; }
    if (!window.URL_PLANILHA) { avisar("A planilha ainda não foi ligada ao site (falta a URL em config.js)."); return; }
    proxima.disabled = true;
    proxima.textContent = "Enviando…";
    try {
      // o Apps Script não responde ao CORS: vai como texto simples e a resposta não é lida (no-cors)
      await fetch(window.URL_PLANILHA, { method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ origem: "formulário", token: login.token, comentario: E.comentario.trim(),
          formatos: ETAPAS.map((et, i) => ({ ordem: i + 1, formato: et.nome,
            escolhas: ORD.filter(o => marcadas(et.id).includes(o.cod)).map(o => ({ codigo: o.cod, logo: o.nome })) })) }) });
      E.enviado = new Date().toISOString();
      guardar();
      document.getElementById("form").style.display = "none";
      document.getElementById("feito").style.display = "flex";
      window.scrollTo(0, 0);
    } catch (e) {
      avisar("Não deu para enviar (sem internet?). Seus votos continuam aqui; tente de novo.");
    } finally {
      proxima.disabled = false;
      proxima.textContent = "Enviar";
    }
  });
  document.getElementById("editar").addEventListener("click", () => {
    document.getElementById("feito").style.display = "none";
    document.getElementById("form").style.display = "flex";
    mostrar();
  });
  mostrar();
})();
