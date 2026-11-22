// O site de votação: monta os logos e as candidatas a partir de dados.js. Cada pessoa escolhe uma candidata (o voto),
// e, se quiser, a melhor variante de cada logo e estrelas nos critérios. Tudo fica guardado neste navegador (localStorage) até o envio para a
// planilha (o app da Web do Apps Script em config.js).
(function () {
  "use strict";
  const D = window.PEI;
  const CRIT = D.criterios;
  const CHAVE = "pei-votacao-logo-v1";
  const ESTRELA = "M12 2.3l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.1l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

  // ---------------------------------------------------------------------------------------------- estado guardado
  function ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; }
  }
  const E = Object.assign({ voto: "", melhores: {}, votos: {}, nome: "", comentario: "", votante: "" }, ler());
  if (!E.votante) E.votante = Math.random().toString(36).slice(2, 10);
  function guardar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) { /* sem armazenamento: segue sem guardar */ }
  }

  // ---------------------------------------------------------------------------------------------- ajudantes
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
  function img(c, chave, alt) {
    return el("img", { src: "img/" + c.codigo + "/" + c.img[chave], alt: alt, loading: "lazy", decoding: "async" });
  }
  const completa = c => (E.votos[c.codigo] || []).filter(Boolean).length === CRIT.length;
  const total = c => (E.votos[c.codigo] || []).reduce((s, x) => s + (x || 0), 0);
  const todas = D.logos.flatMap(l => l.candidatas.map(c => Object.assign({ logo: l.nome }, c)));

  let avisoTempo;
  function avisar(t) {
    const a = document.getElementById("aviso");
    a.textContent = t;
    a.style.display = "block";
    clearTimeout(avisoTempo);
    avisoTempo = setTimeout(() => { a.style.display = "none"; }, 5000);
  }

  // ---------------------------------------------------------------------------------------------- ampliar
  const zoom = document.getElementById("zoom");
  function ampliar(src, legenda, escuro) {
    zoom.querySelector("img").src = src;
    zoom.querySelector(".legenda").textContent = legenda;
    zoom.querySelector(".caixa").classList.toggle("escuro", !!escuro);
    zoom.style.display = "flex";
  }
  zoom.addEventListener("click", () => { zoom.style.display = "none"; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") zoom.style.display = "none"; });

  // ---------------------------------------------------------------------------------------------- formatos
  function formato(c, rotulo, chave, opts) {
    const o = opts || {};
    const caixa = el("div", { class: "fmt" + (o.classe ? " " + o.classe : ""), title: "Ampliar" }, [
      el("div", { class: "area" }, [img(c, chave, c.codigo + " · " + rotulo)]),
      el("span", { class: "rot", text: rotulo }),
    ]);
    caixa.addEventListener("click", () => ampliar("img/" + c.codigo + "/" + c.img[chave], c.codigo + " · " + rotulo,
      o.escuro));
    return caixa;
  }
  function favicon(c) {
    const fav = () => img(c, "favicon", "favicon");
    const aba = (cls) => el("div", { class: cls }, [fav(), el("span", { text: "PEI · Grupo de Pesquisa…" })]);
    const caixa = el("div", { class: "fmt", title: "Ampliar" }, [
      el("div", { class: "area" }, [el("div", { class: "aba" }, [aba("clara"), aba("escura")])]),
      el("span", { class: "rot", text: "Favicon (16 px)" }),
    ]);
    caixa.addEventListener("click", () => ampliar("img/" + c.codigo + "/" + c.img.favicon, c.codigo + " · favicon"));
    return caixa;
  }

  // ---------------------------------------------------------------------------------------------- estrelas
  function estrelaSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", ESTRELA);
    s.appendChild(p);
    return s;
  }
  function linhaEstrelas(c, i, aoMudar) {
    const caixa = el("div", { class: "estrelas", role: "radiogroup", "aria-label": c.codigo + " · " + CRIT[i] });
    const botoes = [1, 2, 3, 4].map(k => {
      const b = el("button", { type: "button", role: "radio", "aria-label": k + (k === 1 ? " estrela" : " estrelas") });
      b.appendChild(estrelaSvg());
      b.addEventListener("click", () => marcar(k));
      caixa.appendChild(b);
      return b;
    });
    const limpar = el("button", { type: "button", class: "limpar", text: "limpar" });
    limpar.addEventListener("click", () => marcar(0));
    caixa.appendChild(limpar);
    function pintar() {
      const v = (E.votos[c.codigo] || [])[i] || 0;
      botoes.forEach((b, j) => {
        b.classList.toggle("on", j < v);
        b.setAttribute("aria-checked", String(j + 1 === v));
      });
      caixa.classList.toggle("tem", v > 0);
    }
    function marcar(k) {
      const v = (E.votos[c.codigo] || new Array(CRIT.length).fill(0)).slice();
      v[i] = k;
      if (v.every(x => !x)) delete E.votos[c.codigo]; else E.votos[c.codigo] = v;
      guardar();
      pintar();
      aoMudar();
    }
    pintar();
    return caixa;
  }

  // ---------------------------------------------------------------------------------------------- cartões
  const atualizadores = [];
  const pintarVotos = [];
  function escolher(cod) {
    E.voto = E.voto === cod ? "" : cod;
    guardar();
    pintarVotos.forEach(f => f());
    resumo();
  }
  // a melhor variante de um logo (uma por logo, só nos logos com mais de uma variante)
  function escolherMelhor(n, cod) {
    if (E.melhores[n] === cod) delete E.melhores[n]; else E.melhores[n] = cod;
    guardar();
    pintarVotos.forEach(f => f());
    resumo();
  }
  function cartao(c) {
    const totalEl = el("span");
    const votar = el("button", { type: "button", class: "votar", "aria-pressed": "false" });
    votar.addEventListener("click", () => escolher(c.codigo));
    const botoes = [votar];
    let melhor = null;
    if (c.nlogo > 1) {
      melhor = el("button", { type: "button", class: "melhor", "aria-pressed": "false" });
      melhor.addEventListener("click", () => escolherMelhor(c.n, c.codigo));
      botoes.push(melhor);
    }
    const caixa = el("article", { class: "cartao", id: "c-" + c.codigo }, [
      el("div", { class: "topo" }, [
        el("span", { class: "selo", text: c.codigo }),
        el("div", { class: "nome" }, [c.logo, el("small", { text: c.variante })]),
        el("div", { class: "botoes" }, botoes),
      ]),
      el("div", { class: "formatos" }, [
        formato(c, "Horizontal", "h", { classe: "largo" }),
        formato(c, "Vertical", "v"),
        formato(c, "Ícone", "icone"),
        formato(c, "Perfil", "perfil", { classe: "perfil" }),
        formato(c, "Negativa", "neg", { classe: "dois escuro", escuro: true }),
        favicon(c),
      ]),
    ]);
    const crit = el("div", { class: "criterios" });
    CRIT.forEach((k, i) => {
      crit.appendChild(el("span", { class: "k", text: k }));
      crit.appendChild(linhaEstrelas(c, i, atualizar));
    });
    caixa.appendChild(crit);
    caixa.appendChild(el("div", { class: "total" }, [el("span", { text: "Total" }), totalEl]));
    function atualizar() {
      const n = (E.votos[c.codigo] || []).filter(Boolean).length;
      totalEl.replaceChildren();
      if (n === 0) totalEl.appendChild(el("span", { text: "sem nota" }));
      else if (n < CRIT.length) {
        totalEl.appendChild(el("span", { class: "falta", text: "faltam " + (CRIT.length - n) + " critério" +
          (CRIT.length - n > 1 ? "s" : "") + " · " }));
        totalEl.appendChild(el("b", { text: String(total(c)) }));
        totalEl.appendChild(document.createTextNode("/24"));
      } else {
        totalEl.appendChild(el("b", { text: String(total(c)) }));
        totalEl.appendChild(document.createTextNode("/24"));
      }
      caixa.classList.toggle("completa", n === CRIT.length);
      resumo();
    }
    atualizadores.push(atualizar);
    pintarVotos.push(() => {
      const sim = E.voto === c.codigo;
      votar.textContent = sim ? "✓ Meu voto" : "Votar nesta";
      votar.setAttribute("aria-pressed", String(sim));
      caixa.classList.toggle("escolhida", sim);
      if (melhor) {
        const m = E.melhores[c.n] === c.codigo;
        melhor.textContent = m ? "★ Melhor deste logo" : "Melhor deste logo";
        melhor.setAttribute("aria-pressed", String(m));
        caixa.classList.toggle("melhor-logo", m);
      }
    });
    return caixa;
  }

  // ---------------------------------------------------------------------------------------------- página
  const menu = document.getElementById("menu");
  const main = document.getElementById("logos");
  const contadores = [];
  D.logos.forEach(l => {
    const sec = el("section", { class: "logo", id: "logo-" + l.n }, [
      el("h2", {}, [el("span", { class: "n", text: l.n + ". " }), l.nome]),
      el("p", { class: "origem", text: l.origem + " · " + l.candidatas.length + (l.candidatas.length > 1 ?
        " candidatas" : " candidata") }),
    ]);
    const grade = el("div", { class: "grade" });
    if (l.candidatas.length > 1) {
      sec.appendChild(el("p", { class: "dica", text: "Escolha a melhor variante deste logo em “Melhor deste logo”." }));
    }
    l.candidatas.forEach(c => grade.appendChild(cartao(Object.assign({ logo: l.nome, nlogo: l.candidatas.length }, c))));
    sec.appendChild(grade);
    main.appendChild(sec);
    const feitas = el("span", { class: "feitas" });
    menu.appendChild(el("a", { href: "#logo-" + l.n }, [el("span", { class: "n", text: String(l.n) }), l.nome, feitas]));
    contadores.push(() => {
      const m = E.melhores[l.n];
      feitas.textContent = m ? "★ " + m : "";
    });
  });

  const contagem = document.getElementById("contagem");
  function resumo() {
    const n = todas.filter(completa).length;
    const voto = el("a", { href: E.voto ? "#c-" + E.voto : "#logo-1" }, [E.voto ? "Seu voto: " : "Escolha seu voto"]);
    if (E.voto) voto.appendChild(el("b", { text: E.voto }));
    const nm = D.logos.filter(l => l.candidatas.length > 1).length;
    const feitos = Object.keys(E.melhores).length;
    contagem.replaceChildren(voto, document.createTextNode(" · melhor de " + feitos + " de " + nm + " logos · " + n +
      " de " + todas.length + " com estrelas"));
    contadores.forEach(f => f());
  }
  atualizadores.forEach(f => f());
  pintarVotos.forEach(f => f());

  // ---------------------------------------------------------------------------------------------- envio
  const nome = document.getElementById("nome");
  const comentario = document.getElementById("comentario");
  nome.value = E.nome;
  comentario.value = E.comentario;
  nome.addEventListener("input", () => { E.nome = nome.value; guardar(); });
  comentario.addEventListener("input", () => { E.comentario = comentario.value; guardar(); });

  const botao = document.getElementById("enviar");
  botao.addEventListener("click", async () => {
    const notas = todas.filter(completa).map(c => ({ codigo: c.codigo, logo: c.logo, variante: c.variante,
      notas: E.votos[c.codigo] }));
    const parciais = todas.filter(c => E.votos[c.codigo] && !completa(c)).map(c => c.codigo);
    const escolhida = todas.find(c => c.codigo === E.voto);
    if (!escolhida) { avisar("Escolha seu voto: clique em “Votar nesta” na candidata que você prefere."); return; }
    if (!nome.value.trim()) { avisar("Escreva seu nome antes de enviar."); nome.focus(); return; }
    if (!window.URL_PLANILHA) { avisar("A planilha ainda não foi ligada ao site (falta a URL em config.js)."); return; }
    let msg = "Seu voto: " + escolhida.codigo + " (" + escolhida.logo + " · " + escolhida.variante + ").";
    const melhores = D.logos.filter(l => E.melhores[l.n]).map(l => {
      const c = l.candidatas.find(x => x.codigo === E.melhores[l.n]);
      return { n: l.n, logo: l.nome, codigo: c.codigo, variante: c.variante };
    });
    msg += "\nMelhor de cada logo: " + (melhores.length ? melhores.map(m => m.codigo).join(", ") : "nenhum") + ".";
    msg += "\nCom estrelas: " + (notas.length ? notas.length + " candidata" + (notas.length > 1 ? "s" : "") : "nenhuma") +
      ".";
    if (parciais.length) msg += "\nIncompletas (as estrelas não vão): " + parciais.join(", ") + ".";
    msg += "\n\nEnviar?";
    if (!confirm(msg)) return;
    botao.disabled = true;
    botao.textContent = "Enviando…";
    try {
      // o Apps Script não responde ao CORS: o envio vai como texto simples e a resposta não é lida (no-cors)
      await fetch(window.URL_PLANILHA, { method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ nome: nome.value.trim(), votante: E.votante, comentario: comentario.value.trim(),
          voto: { codigo: escolhida.codigo, logo: escolhida.logo, variante: escolhida.variante }, melhores: melhores,
          notas: notas }) });
      E.enviado = new Date().toISOString();
      guardar();
      avisar("Voto enviado. Obrigado! Se mudar de ideia, é só enviar de novo: vale o último envio.");
    } catch (e) {
      avisar("Não deu para enviar (sem internet?). Suas notas continuam guardadas; tente de novo.");
    } finally {
      botao.disabled = false;
      botao.textContent = "Enviar voto";
    }
  });
})();
