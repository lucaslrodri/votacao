// Os pedidos da camisa (index.html): cada um escolhe a cor, o tamanho e a quantidade, põe no carrinho, entra com o
// Google e envia; o Apps Script (apps-script/Codigo.gs, URL em config.js) anota na planilha, com o nome da conta Google
// (Lucas, 25/11/2026: "deveria ter a quantidade e o carrinho na verdade e a pessoa (Em uma lista em baixo para todo
// mundo ver)", "E o tamanho da camisa", "O tamanho é P, M, G ou GG", "Então a pessoa não precisa por o nome" e "Ao
// final vc deixa exportar para csv ou pdf"). A lista dos pedidos (o nome e os itens, sem e-mail) é aberta e sai em PDF
// ou CSV.
(function () {
  "use strict";
  const URL_PEDIDOS = window.URL_PEDIDOS || "";
  const TAMANHOS = ["P", "M", "G", "GG"];         // a mesma lista de apps-script/Codigo.gs
  const MAX_QTD = 10;
  const CORES = { azul: { nome: "Polo azul", curto: "Azul", tinta: "#083671" },
    preta: { nome: "Polo preta", curto: "Preta", tinta: "#1A1A1A" } };
  const K_LOGIN = "pei-cor-login", K_JA = "pei-cor-ja", K_CARRINHO = "pei-carrinho";
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  const plural = function (n, um, varios) { return n + " " + (n === 1 ? um : varios); };

  let login = null;                     // { token, nome, exp }
  let carrinho = [];                    // [{ cor, tamanho, qtd }]
  let pedidos = [], quando = null, meu = null, aberto = true, ocupado = false, carregou = false;

  function aviso(t, erro) {
    const a = $("cor-aviso");
    a.textContent = t || "";
    a.classList.toggle("erro", !!erro);
  }
  function guardar(k, v, sessao) {
    try { (sessao ? sessionStorage : localStorage)[v == null ? "removeItem" : "setItem"](k, v); } catch (e) { /* sem armazenamento */ }
  }
  const ordemItem = function (a, b) {
    return a.cor !== b.cor ? (a.cor === "azul" ? -1 : 1) : TAMANHOS.indexOf(a.tamanho) - TAMANHOS.indexOf(b.tamanho);
  };
  const somar = function (itens) { return itens.reduce(function (s, it) { return s + it.qtd; }, 0); };
  const chave = function (itens) {
    return itens.slice().sort(ordemItem).map(function (it) { return it.cor + it.tamanho + "x" + it.qtd; }).join(",");
  };
  const textoItens = function (itens) {
    return itens.map(function (it) { return CORES[it.cor].curto + " " + it.tamanho + (it.qtd > 1 ? " × " + it.qtd : ""); }).join(", ");
  };

  // ------------------------------------------------------------------------------------------------------------------
  // Os cartões das duas cores: o tamanho, a quantidade e o "Adicionar ao carrinho"
  // ------------------------------------------------------------------------------------------------------------------
  document.querySelectorAll(".opcao[data-cor]").forEach(function (cartao) {
    const cor = cartao.dataset.cor;
    const caixa = cartao.querySelector(".compra");
    caixa.innerHTML = '<div><span class="rotulo" id="tam-' + cor + '">Tamanho</span><div class="tamanhos" role="group" ' +
      'aria-labelledby="tam-' + cor + '">' + TAMANHOS.map(function (t) {
        return '<button type="button" data-tam="' + t + '" aria-pressed="false">' + t + "</button>";
      }).join("") + '</div></div><div class="linha-compra"><div class="qtd" role="group" aria-label="Quantidade">' +
      '<button type="button" data-q="-1" aria-label="Menos uma">−</button><output aria-live="polite">1</output>' +
      '<button type="button" data-q="1" aria-label="Mais uma">+</button></div><button type="button" class="adicionar forte">' +
      "Adicionar ao carrinho</button></div>" + '<p class="aviso" role="status"></p>';
    let tam = "", qtd = 1;
    const saida = caixa.querySelector("output"), msg = caixa.querySelector(".aviso");
    const mostrar = function () {
      caixa.querySelectorAll("[data-tam]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.tam === tam); });
      saida.textContent = qtd;
      caixa.querySelector('[data-q="-1"]').disabled = qtd <= 1;
      caixa.querySelector('[data-q="1"]').disabled = qtd >= MAX_QTD;
    };
    caixa.querySelectorAll("[data-tam]").forEach(function (b) {
      b.addEventListener("click", function () { tam = b.dataset.tam; msg.textContent = ""; msg.classList.remove("erro"); mostrar(); });
    });
    caixa.querySelectorAll("[data-q]").forEach(function (b) {
      b.addEventListener("click", function () { qtd = Math.max(1, Math.min(MAX_QTD, qtd + Number(b.dataset.q))); mostrar(); });
    });
    caixa.querySelector(".adicionar").addEventListener("click", function () {
      if (!tam) {
        msg.textContent = "Escolha o tamanho."; msg.classList.add("erro");
        caixa.querySelector("[data-tam]").focus();
        return;
      }
      const it = carrinho.find(function (x) { return x.cor === cor && x.tamanho === tam; });
      if (it) it.qtd = Math.min(MAX_QTD, it.qtd + qtd);
      else carrinho.push({ cor: cor, tamanho: tam, qtd: qtd });
      carrinho.sort(ordemItem);
      msg.classList.remove("erro");
      msg.textContent = plural(qtd, "camisa", "camisas") + " " + CORES[cor].curto.toLowerCase() + " " + tam + " no carrinho.";
      tam = ""; qtd = 1; mostrar();
      desenharCarrinho();
    });
    mostrar();
  });

  // ------------------------------------------------------------------------------------------------------------------
  // O carrinho
  // ------------------------------------------------------------------------------------------------------------------
  function desenharCarrinho() {
    guardar(K_CARRINHO, JSON.stringify(carrinho), true);
    const lista = $("itens");
    if (!carrinho.length) {
      lista.innerHTML = '<li style="background:none;border:0;padding:0"><span class="vazio">O carrinho está vazio. ' +
        "Escolha o tamanho e a quantidade em cima.</span></li>";
    } else {
      lista.innerHTML = carrinho.map(function (it, k) {
        return '<li><span class="nome-item"><i style="background:' + CORES[it.cor].tinta + '"></i>' + CORES[it.cor].nome +
          " · " + it.tamanho + '</span><span class="qtd" role="group" aria-label="Quantidade"><button type="button" ' +
          'data-item="' + k + '" data-q="-1" aria-label="Menos uma"' + (it.qtd <= 1 ? " disabled" : "") + '>−</button>' +
          "<output>" + it.qtd + '</output><button type="button" data-item="' + k + '" data-q="1" aria-label="Mais uma"' +
          (it.qtd >= MAX_QTD ? " disabled" : "") + '>+</button></span><button type="button" class="remover" data-tirar="' + k +
          '">Remover</button></li>';
      }).join("");
    }
    const n = somar(carrinho);
    $("total-carrinho").textContent = n ? "Total: " + plural(n, "camisa", "camisas") : "";
    mostrarSessao();
  }
  $("itens").addEventListener("click", function (e) {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.tirar != null) carrinho.splice(Number(b.dataset.tirar), 1);
    else if (b.dataset.item != null) {
      const it = carrinho[Number(b.dataset.item)];
      it.qtd = Math.max(1, Math.min(MAX_QTD, it.qtd + Number(b.dataset.q)));
    }
    desenharCarrinho();
  });

  // ------------------------------------------------------------------------------------------------------------------
  // O login com o Google (o nome do pedido é o nome da conta)
  // ------------------------------------------------------------------------------------------------------------------
  function lerJwt(t) {
    const b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b + "===".slice((b.length + 3) % 4));
    return JSON.parse(decodeURIComponent(bin.split("").map(function (ch) {
      return "%" + ("00" + ch.charCodeAt(0).toString(16)).slice(-2);
    }).join("")));
  }
  function aoEntrar(r) {
    try {
      const d = lerJwt(r.credential);
      login = { token: r.credential, nome: d.name || String(d.email || "").split("@")[0], exp: +d.exp || 0 };
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
    const m = $("cor-minha");
    const igual = meu && chave(meu.itens) === chave(carrinho);
    m.hidden = !meu;
    if (meu) {
      m.innerHTML = igual ? "O seu pedido está na lista: <b>" + esc(textoItens(meu.itens)) + "</b>." :
        "O seu pedido na lista é <b>" + esc(textoItens(meu.itens)) + "</b>. Você mudou o carrinho: envie de novo para valer.";
    }
    $("cor-salvar").textContent = meu ? "Enviar as mudanças" : "Enviar o pedido";
    $("cor-salvar").disabled = ocupado || !aberto || !carrinho.length || !!igual;
    $("cor-tirar").hidden = !meu;
    $("cor-tirar").disabled = ocupado || !aberto;
  }
  $("sair").addEventListener("click", function () { sair(""); });
  (function () {
    try {
      const g = JSON.parse(sessionStorage.getItem(K_LOGIN) || "null");
      if (g && g.token && g.exp * 1000 > Date.now() + 60000) login = g;
      const c = JSON.parse(sessionStorage.getItem(K_CARRINHO) || "[]");
      if (Array.isArray(c)) carrinho = c.filter(function (it) {
        return it && CORES[it.cor] && TAMANHOS.indexOf(it.tamanho) >= 0 && it.qtd >= 1 && it.qtd <= MAX_QTD;
      });
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
    // quem já tem pedido e chega com o carrinho vazio vê o pedido no carrinho, para mudar
    if (meu && !carrinho.length) carrinho = meu.itens.map(function (it) { return { cor: it.cor, tamanho: it.tamanho, qtd: it.qtd }; });
    carregou = true;
    desenharLista();
    desenharCarrinho();
    if (!aberto) aviso("Os pedidos foram fechados. A lista continua aqui.");
  }
  function carregar() {
    if (!URL_PEDIDOS) { $("pedidos-lista").innerHTML = '<p class="vazio">A lista ainda não está ligada.</p>'; return; }
    if (!carregou) $("pedidos-lista").innerHTML = '<p class="vazio">Carregando a lista…</p>';
    enviar({ acao: "pedidos" }).then(receber).catch(function (e) {
      if (e.message !== "login") $("pedidos-lista").innerHTML = '<p class="vazio">Não deu para ler a lista agora. Tente de novo daqui a pouco.</p>';
    });
  }

  $("cor-salvar").addEventListener("click", function () {
    if (!login) { aviso("Entre com a sua conta Google para enviar o pedido.", true); return; }
    if (!carrinho.length) { aviso("O carrinho está vazio.", true); return; }
    ocupado = true; mostrarSessao(); aviso("Enviando…");
    enviar({ acao: "pedido", nome: login.nome, itens: carrinho }).then(function (r) {
      ocupado = false;
      receber(r);
      aviso("Pronto! O seu pedido está na lista.");
    }).catch(function (e) {
      ocupado = false; mostrarSessao();
      if (e.message !== "login") aviso("Não deu para enviar: " + e.message + ". Tente de novo.", true);
    });
  });
  $("cor-tirar").addEventListener("click", function () {
    ocupado = true; mostrarSessao(); aviso("Cancelando…");
    enviar({ acao: "tirar" }).then(function (r) {
      ocupado = false;
      carrinho = [];
      receber(r);
      aviso("O seu pedido saiu da lista.");
    }).catch(function (e) {
      ocupado = false; mostrarSessao();
      if (e.message !== "login") aviso("Não deu para cancelar: " + e.message + ". Tente de novo.", true);
    });
  });

  // ------------------------------------------------------------------------------------------------------------------
  // A lista: os totais, a tabela por cor e tamanho e as pessoas
  // ------------------------------------------------------------------------------------------------------------------
  function contar() {
    const c = { azul: {}, preta: {} };
    pedidos.forEach(function (p) { p.itens.forEach(function (it) { c[it.cor][it.tamanho] = (c[it.cor][it.tamanho] || 0) + it.qtd; }); });
    return c;
  }
  const soma = function (o) { return Object.keys(o).reduce(function (s, k) { return s + o[k]; }, 0); };
  function desenharLista() {
    const c = contar(), na = soma(c.azul), np = soma(c.preta);
    $("pedidos-n-azul").textContent = na;
    $("pedidos-n-preta").textContent = np;
    $("pedidos-n-total").textContent = na + np;
    $("pedidos-n-pessoas").textContent = pedidos.length;
    const cel = function (n) { return '<td class="n">' + (n || "–") + "</td>"; };
    $("pedidos-tamanhos").innerHTML = "<table><thead><tr><th></th>" + TAMANHOS.map(function (t) { return '<th class="n">' + t + "</th>"; }).join("") +
      '<th class="n">Total</th></tr></thead><tbody>' + ["azul", "preta"].map(function (cor) {
        return '<tr><td><span class="cor-ponto" style="background:' + CORES[cor].tinta + '"></span>' + CORES[cor].nome + "</td>" +
          TAMANHOS.map(function (t) { return cel(c[cor][t]); }).join("") + cel(soma(c[cor])) + "</tr>";
      }).join("") + "</tbody><tfoot><tr><td>Total</td>" + TAMANHOS.map(function (t) { return cel((c.azul[t] || 0) + (c.preta[t] || 0)); }).join("") +
      cel(na + np) + "</tr></tfoot></table>";
    $("pedidos-lista").innerHTML = pedidos.length ? "<table><thead><tr><th>Nome</th><th>Pedido</th><th class=\"n\">Camisas</th>" +
      "</tr></thead><tbody>" + pedidos.map(function (p) {
        return '<tr class="pessoa"><td><b>' + esc(p.nome) + "</b></td><td>" + p.itens.map(function (it) {
          return '<span style="white-space:nowrap"><span class="cor-ponto" style="background:' + CORES[it.cor].tinta + '"></span>' +
            CORES[it.cor].curto + " " + it.tamanho + (it.qtd > 1 ? " × " + it.qtd : "") + "</span>";
        }).join(", ") + '</td><td class="n">' + somar(p.itens) + "</td></tr>";
      }).join("") + "</tbody></table>" : '<p class="vazio">Ninguém pediu ainda.</p>';
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
  // o CSV: uma linha por item (Nome;Cor;Tamanho;Quantidade), com ponto e vírgula e BOM (abre direto no Excel em português)
  function csv() {
    const q = function (s) { return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const linhas = [];
    pedidos.forEach(function (p) { p.itens.forEach(function (it) { linhas.push([q(p.nome), CORES[it.cor].curto, it.tamanho, it.qtd].join(";")); }); });
    const texto = "Nome;Cor;Tamanho;Quantidade\r\n" + linhas.join("\r\n") + "\r\n";
    baixar("pedidos-camisa-pei.csv", new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }));
  }
  // o PDF (jsPDF, carregado só na hora): os totais por cor e tamanho e a lista das pessoas
  function pdf() {
    const fazer = function () {
      const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
      const M = 18, L = 210 - 2 * M;
      let y = 22, pag = 1;
      const rodape = function () {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(91, 102, 120);
        doc.text("Camisa do PEI · pedidos · " + data(quando) + " · página " + pag, M, 287);
      };
      const nova = function () { rodape(); doc.addPage(); pag++; y = 22; };
      const fonte = function (peso, tam, cor) { doc.setFont("helvetica", peso); doc.setFontSize(tam); doc.setTextColor(cor[0], cor[1], cor[2]); };
      const AZUL = [8, 54, 113], TEXTO = [30, 30, 30], CINZA = [91, 102, 120];
      doc.setFillColor(8, 54, 113); doc.rect(0, 0, 126, 3, "F");
      doc.setFillColor(12, 77, 162); doc.rect(126, 0, 63, 3, "F");
      doc.setFillColor(255, 191, 20); doc.rect(189, 0, 21, 3, "F");
      fonte("bold", 18, AZUL); doc.text("Camisa do PEI: pedidos", M, y); y += 7;
      fonte("normal", 10, CINZA);
      doc.text("A Clássica, na polo azul ou na preta. Lista de " + data(quando) + " às " + hora(quando) + ".", M, y); y += 11;
      // a tabela por cor e tamanho
      const c = contar(), cols = ["", "P", "M", "G", "GG", "Total"], xs = [M, M + 52, M + 74, M + 96, M + 118, M + 144];
      fonte("bold", 12, AZUL); doc.text("Por tamanho", M, y); y += 7;
      fonte("bold", 10, CINZA); cols.forEach(function (t, k) { if (k) doc.text(t, xs[k], y, { align: "center" }); }); y += 6;
      const linha = function (rot, vals, negrito) {
        fonte(negrito ? "bold" : "normal", 11, negrito ? AZUL : TEXTO);
        doc.text(rot, xs[0], y);
        vals.forEach(function (v, k) { doc.text(String(v || "–"), xs[k + 1], y, { align: "center" }); });
        doc.setDrawColor(218, 223, 231); doc.line(M, y + 2.2, M + 156, y + 2.2);
        y += 7;
      };
      ["azul", "preta"].forEach(function (cor) {
        linha(CORES[cor].nome, TAMANHOS.map(function (t) { return c[cor][t]; }).concat([soma(c[cor])]));
      });
      linha("Total", TAMANHOS.map(function (t) { return (c.azul[t] || 0) + (c.preta[t] || 0); }).concat([soma(c.azul) + soma(c.preta)]), true);
      y += 2;
      fonte("normal", 10, CINZA); doc.text(plural(pedidos.length, "pessoa", "pessoas") + ".", M, y); y += 10;
      // as pessoas
      fonte("bold", 12, AZUL); doc.text("As pessoas", M, y); y += 7;
      pedidos.forEach(function (p, i) {
        const itens = doc.splitTextToSize(textoItens(p.itens), L - 78);
        if (y + itens.length * 5.2 > 278) nova();
        fonte("normal", 10.5, TEXTO);
        doc.text((i + 1) + ".", M + 5, y, { align: "right" });
        doc.text(doc.splitTextToSize(p.nome, 66)[0], M + 8, y);
        doc.text(itens, M + 78, y);
        fonte("bold", 10.5, AZUL); doc.text(String(somar(p.itens)), M + L, y, { align: "right" });
        y += Math.max(1, itens.length) * 5.2 + 1.6;
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
  desenharCarrinho();
  carregar();
})();
