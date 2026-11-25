// A cor da camisa (index.html): cada um entra com o Google, escolhe a azul ou a preta e põe o nome completo, e o Apps
// Script (apps-script/Codigo.gs, URL em config.js) anota na planilha (Lucas, 25/11/2026: "Vc anota na planilha" e "o
// formulário vai na própria página"). A lista dos pedidos (nome e cor, sem e-mail) é aberta e sai em PDF ou CSV ("bota
// para exportar para um PDF ou um csv").
(function () {
  "use strict";
  const URL_PEDIDOS = window.URL_PEDIDOS || "";
  const $ = function (id) { return document.getElementById(id); };
  const caixa = $("pedidos-lista");
  const form = $("form-cor");
  const NOME_COR = { azul: "polo azul", preta: "polo preta" };
  const K_LOGIN = "pei-cor-login", K_JA = "pei-cor-ja";
  const esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };

  let login = null;            // { token, nome, exp }
  let pedidos = [], quando = null, meu = null, aberto = true, ocupado = false;

  // ------------------------------------------------------------------------------------------------------------------
  // As opções (os cartões das duas cores)
  // ------------------------------------------------------------------------------------------------------------------
  const radios = Array.prototype.slice.call(form.querySelectorAll('input[name="cor"]'));
  function marcarOpcoes() {
    radios.forEach(function (r) {
      r.closest(".opcao").classList.toggle("marcada", r.checked);
    });
  }
  radios.forEach(function (r) {
    r.addEventListener("change", function () { marcarOpcoes(); aviso(""); });
    r.addEventListener("focus", function () { if (r.matches(":focus-visible")) r.closest(".opcao").classList.add("foco"); });
    r.addEventListener("blur", function () { r.closest(".opcao").classList.remove("foco"); });
  });
  const corEscolhida = function () { const r = radios.find(function (x) { return x.checked; }); return r ? r.value : ""; };

  function aviso(t, erro) {
    const a = $("cor-aviso");
    a.textContent = t || "";
    a.classList.toggle("erro", !!erro);
  }

  // ------------------------------------------------------------------------------------------------------------------
  // O login com o Google
  // ------------------------------------------------------------------------------------------------------------------
  function lerJwt(t) {
    const b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b + "===".slice((b.length + 3) % 4));
    return JSON.parse(decodeURIComponent(bin.split("").map(function (ch) {
      return "%" + ("00" + ch.charCodeAt(0).toString(16)).slice(-2);
    }).join("")));
  }
  function guardar(k, v, sessao) {
    try { (sessao ? sessionStorage : localStorage)[v == null ? "removeItem" : "setItem"](k, v); } catch (e) { /* sem armazenamento */ }
  }
  function aoEntrar(r) {
    try {
      const d = lerJwt(r.credential);
      login = { token: r.credential, nome: d.name || d.email || "", exp: +d.exp || 0 };
    } catch (e) { login = null; return; }
    guardar(K_LOGIN, JSON.stringify(login), true);
    guardar(K_JA, "1");
    mostrarSessao();
    carregar();
  }
  function sair(motivo) {
    login = null; meu = null;
    guardar(K_LOGIN, null, true);
    if (!motivo) guardar(K_JA, null);
    if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
    mostrarSessao();
    aviso(motivo || "", !!motivo);
  }
  function mostrarSessao() {
    $("cor-fora").hidden = !!login;
    $("cor-dentro").hidden = !login;
    if (!login) return;
    $("sessao-nome").textContent = login.nome;
    const nome = $("cor-nome");
    if (meu) nome.value = meu.nome;
    else if (!nome.value) nome.value = login.nome;
    const m = $("cor-minha");
    m.hidden = !meu;
    if (meu) m.innerHTML = "Você está na lista da <b>" + NOME_COR[meu.cor] + "</b>, como <b>" + esc(meu.nome) + "</b>.";
    $("cor-salvar").textContent = meu ? "Salvar a mudança" : "Pôr o meu nome na lista";
    $("cor-tirar").hidden = !meu;
    $("cor-salvar").disabled = $("cor-tirar").disabled = ocupado || !aberto;
  }
  $("sair").addEventListener("click", function () { sair(""); });
  (function () {
    try {
      const g = JSON.parse(sessionStorage.getItem(K_LOGIN) || "null");
      if (g && g.token && g.exp * 1000 > Date.now() + 60000) login = g;
    } catch (e) { /* sem armazenamento */ }
  })();
  // o botão do Google: o script dele chega depois (async); espera até ele aparecer
  (function iniciarGoogle(tentativas) {
    const c = $("login-cor");
    const problema = function (t) { c.innerHTML = '<p class="sub" style="margin:0">' + t + "</p>"; };
    if (!window.CLIENTE_GOOGLE) { problema("O login ainda não foi configurado."); return; }
    if (!(window.google && google.accounts && google.accounts.id)) {
      if (tentativas > 75) problema("Não deu para carregar o login do Google. Confira a internet e recarregue a página.");
      else setTimeout(function () { iniciarGoogle(tentativas + 1); }, 200);
      return;
    }
    google.accounts.id.initialize({ client_id: window.CLIENTE_GOOGLE, callback: aoEntrar, auto_select: true,
      cancel_on_tap_outside: true });
    google.accounts.id.renderButton(c, { theme: "filled_blue", size: "large", text: "signin_with", shape: "pill",
      locale: "pt-BR", width: Math.min(320, c.clientWidth || 320) });
    let ja = false;
    try { ja = localStorage.getItem(K_JA) === "1"; } catch (e) { /* sem armazenamento */ }
    if (!login && ja) google.accounts.id.prompt();
  })(0);

  // ------------------------------------------------------------------------------------------------------------------
  // A planilha (Apps Script): POST com o corpo em texto (o navegador não pede licença antes)
  // ------------------------------------------------------------------------------------------------------------------
  function enviar(corpo) {
    if (login) corpo.token = login.token;
    return fetch(URL_PEDIDOS, { method: "POST", body: JSON.stringify(corpo) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (r.erro === "login") { sair("O seu login venceu. Entre de novo."); throw new Error("login"); }
        if (!r.ok) throw new Error(r.mensagem || r.erro || "erro");
        return r;
      });
  }
  function receber(r) {
    pedidos = r.pedidos || [];
    aberto = r.aberto !== false;
    meu = r.meu || null;
    quando = new Date();
    if (meu && !corEscolhida()) {
      radios.forEach(function (x) { x.checked = x.value === meu.cor; });
      marcarOpcoes();
    }
    desenhar();
    mostrarSessao();
    if (!aberto) aviso("Os pedidos foram fechados. A lista continua aqui.");
  }
  function carregar() {
    if (!URL_PEDIDOS) { caixa.innerHTML = '<p class="vazio">A lista ainda não está ligada.</p>'; return; }
    if (!pedidos.length) caixa.innerHTML = '<p class="vazio">Carregando a lista…</p>';
    enviar({ acao: "pedidos" }).then(receber).catch(function (e) {
      if (e.message !== "login") caixa.innerHTML = '<p class="vazio">Não deu para ler a lista agora. Tente de novo daqui a pouco.</p>';
    });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    const cor = corEscolhida();
    const nome = $("cor-nome").value.replace(/\s+/g, " ").trim();
    if (!cor) { aviso("Escolha a cor: azul ou preta.", true); return; }
    if (!login) { aviso("Entre com a sua conta Google para pôr o nome na lista.", true); return; }
    if (nome.length < 3) { aviso("Escreva o seu nome completo.", true); $("cor-nome").focus(); return; }
    ocupado = true; mostrarSessao(); aviso("Salvando…");
    enviar({ acao: "cor", cor: cor, nome: nome }).then(function (r) {
      ocupado = false;
      receber(r);
      aviso("Pronto! O seu nome está na lista da " + NOME_COR[cor] + ".");
    }).catch(function (e) {
      ocupado = false; mostrarSessao();
      if (e.message !== "login") aviso("Não deu para salvar: " + e.message + ". Tente de novo.", true);
    });
  });
  $("cor-tirar").addEventListener("click", function () {
    ocupado = true; mostrarSessao(); aviso("Tirando…");
    enviar({ acao: "tirar" }).then(function (r) {
      ocupado = false;
      radios.forEach(function (x) { x.checked = false; });
      marcarOpcoes();
      receber(r);
      aviso("O seu nome saiu da lista.");
    }).catch(function (e) {
      ocupado = false; mostrarSessao();
      if (e.message !== "login") aviso("Não deu para tirar: " + e.message + ". Tente de novo.", true);
    });
  });

  // ------------------------------------------------------------------------------------------------------------------
  // A lista, o PDF e o CSV
  // ------------------------------------------------------------------------------------------------------------------
  function desenhar() {
    const azul = pedidos.filter(function (p) { return p.cor === "azul"; });
    const preta = pedidos.filter(function (p) { return p.cor === "preta"; });
    $("pedidos-n-azul").textContent = azul.length;
    $("pedidos-n-preta").textContent = preta.length;
    $("pedidos-n-total").textContent = pedidos.length;
    const lista = function (ps) {
      return ps.length ? "<ol>" + ps.map(function (p) { return "<li>" + esc(p.nome) + "</li>"; }).join("") + "</ol>" :
        '<p class="vazio">Ninguém ainda.</p>';
    };
    caixa.innerHTML = '<div class="cor-pedido"><h3><i style="background:#083671"></i>Polo azul <span>' + azul.length +
      "</span></h3>" + lista(azul) + '</div><div class="cor-pedido"><h3><i style="background:#1A1A1A"></i>Polo preta <span>' +
      preta.length + "</span></h3>" + lista(preta) + "</div>";
    document.querySelectorAll("[data-baixar]").forEach(function (b) { b.disabled = !pedidos.length; });
  }
  function hora(d) { return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function data(d) { return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); }

  function baixar(nome, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  // o CSV: Nome;Cor, com ponto e vírgula e BOM (abre direto no Excel em português)
  function csv() {
    const q = function (s) { return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const ordem = pedidos.slice().sort(function (a, b) { return a.cor < b.cor ? -1 : a.cor > b.cor ? 1 : 0; });
    const texto = "Nome;Cor\r\n" + ordem.map(function (p) { return q(p.nome) + ";" + (p.cor === "azul" ? "Azul" : "Preta"); }).join("\r\n") + "\r\n";
    baixar("pedidos-camisa-pei.csv", new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }));
  }
  // o PDF (jsPDF, carregado só na hora): o título, os totais e a lista de cada cor, numerada
  function pdf() {
    const fazer = function () {
      const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      const M = 18, L = 210 - 2 * M;
      let y = 22, pag = 1;
      const rodape = function () {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(91, 102, 120);
        doc.text("Camisa do PEI · pedidos por cor · " + data(quando) + " · página " + pag, M, 287);
      };
      const nova = function () { rodape(); doc.addPage(); pag++; y = 22; };
      doc.setFillColor(8, 54, 113); doc.rect(0, 0, 126, 3, "F");
      doc.setFillColor(12, 77, 162); doc.rect(126, 0, 63, 3, "F");
      doc.setFillColor(255, 191, 20); doc.rect(189, 0, 21, 3, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(8, 54, 113);
      doc.text("Camisa do PEI: pedidos por cor", M, y); y += 7;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(91, 102, 120);
      doc.text(doc.splitTextToSize("A Clássica, na polo azul ou na preta. Lista de " + data(quando) + " às " +
        hora(quando) + ".", L), M, y); y += 12;
      const azul = pedidos.filter(function (p) { return p.cor === "azul"; });
      const preta = pedidos.filter(function (p) { return p.cor === "preta"; });
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(30, 30, 30);
      doc.text("Azul: " + azul.length + "    Preta: " + preta.length + "    Total: " + pedidos.length, M, y); y += 10;
      [["Polo azul", azul, [8, 54, 113]], ["Polo preta", preta, [26, 26, 26]]].forEach(function (g) {
        if (y > 260) nova();
        doc.setFillColor(g[2][0], g[2][1], g[2][2]); doc.rect(M, y - 4, 4, 4, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(8, 54, 113);
        doc.text(g[0] + " (" + g[1].length + ")", M + 6, y); y += 7;
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(30, 30, 30);
        if (!g[1].length) { doc.text("Ninguém ainda.", M, y); y += 7; }
        g[1].forEach(function (p, i) {
          if (y > 278) { nova(); doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(30, 30, 30); }
          doc.text((i + 1) + ".", M + 6, y, { align: "right" });
          doc.text(doc.splitTextToSize(p.nome, L - 10)[0], M + 9, y);
          y += 6.2;
        });
        y += 6;
      });
      rodape();
      doc.save("pedidos-camisa-pei.pdf");
    };
    if (window.jspdf) return fazer();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = fazer;
    s.onerror = function () { aviso("Não deu para gerar o PDF agora. Tente o CSV ou tente de novo.", true); };
    document.head.appendChild(s);
  }

  document.querySelector('[data-baixar="csv"]').addEventListener("click", csv);
  document.querySelector('[data-baixar="pdf"]').addEventListener("click", pdf);
  $("pedidos-atualizar").addEventListener("click", carregar);
  mostrarSessao();
  carregar();
})();
