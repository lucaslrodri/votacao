// os pedidos: quem quer a Clássica azul e quem quer a preta (Lucas, 25/11/2026: "vc coloca quem quer azul ou preta
// para mandar para a gráfica, pode deixar aberto para todo mundo e bota para exportar para um PDF ou um csv"). Lê o CSV
// publicado da planilha do formulário (config.js, CSV_PEDIDOS: só nome e cor, sem e-mail) e baixa a lista em CSV ou PDF.
(function () {
  "use strict";
  const URL_CSV = window.CSV_PEDIDOS || "";
  const FORM = window.FORM_COR || "";
  const caixa = document.getElementById("pedidos-lista");
  if (!caixa) return;
  const esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  // um leitor de CSV simples (com aspas)
  function lerCSV(t) {
    const linhas = [];
    let campo = "", linha = [], aspas = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (aspas) {
        if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === ",") { linha.push(campo); campo = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && t[i + 1] === "\n") i++;
        linha.push(campo); linhas.push(linha); linha = []; campo = "";
      } else campo += c;
    }
    if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas;
  }
  const COR = function (v) { v = String(v || "").toLowerCase(); return v.indexOf("pret") === 0 ? "preta" : v.indexOf("azul") === 0 ? "azul" : ""; };
  let pedidos = [], quando = null;

  function desenhar() {
    const azul = pedidos.filter(function (p) { return p.cor === "azul"; });
    const preta = pedidos.filter(function (p) { return p.cor === "preta"; });
    document.getElementById("pedidos-n-azul").textContent = azul.length;
    document.getElementById("pedidos-n-preta").textContent = preta.length;
    document.getElementById("pedidos-n-total").textContent = pedidos.length;
    const lista = function (ps) {
      return ps.length ? "<ol>" + ps.map(function (p) { return "<li>" + esc(p.nome) + "</li>"; }).join("") + "</ol>" :
        '<p class="vazio">Ninguém ainda.</p>';
    };
    caixa.innerHTML = '<div class="cor-pedido"><h3><i style="background:#083671"></i>Polo azul <span>' + azul.length +
      "</span></h3>" + lista(azul) + '</div><div class="cor-pedido"><h3><i style="background:#1A1A1A"></i>Polo preta <span>' +
      preta.length + "</span></h3>" + lista(preta) + "</div>";
    document.getElementById("pedidos-quando").textContent = "Lista lida às " + hora(quando) + ". As respostas novas do " +
      "formulário aparecem aqui em alguns minutos.";
    document.querySelectorAll("[data-baixar]").forEach(function (b) { b.disabled = !pedidos.length; });
  }
  function hora(d) { return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function data(d) { return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear(); }

  function carregar() {
    if (!URL_CSV) { caixa.innerHTML = '<p class="vazio">A lista ainda não está ligada.</p>'; return; }
    caixa.innerHTML = '<p class="vazio">Carregando a lista…</p>';
    fetch(URL_CSV + "&t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (t) {
      const ls = lerCSV(t).slice(1);   // a primeira linha é o cabeçalho
      pedidos = ls.map(function (l) {
        return { nome: String(l[0] || "").replace(/\s+/g, " ").trim(), cor: COR(l[1]) };
      }).filter(function (p) { return p.nome && p.cor; }).sort(function (a, b) {
        return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
      });
      quando = new Date();
      desenhar();
    }).catch(function () {
      caixa.innerHTML = '<p class="vazio">Não deu para ler a lista agora. Tente de novo daqui a pouco.</p>';
    });
  }

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
      doc.text(doc.splitTextToSize("A Clássica, a vencedora da votação, na polo azul ou na preta (a mesma camisa, só muda " +
        "a cor). Lista do formulário em " + data(quando) + " às " + hora(quando) + ".", L), M, y); y += 12;
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
    s.onerror = function () { alert("Não deu para gerar o PDF agora. Tente o CSV ou tente de novo."); };
    document.head.appendChild(s);
  }

  document.querySelector('[data-baixar="csv"]').addEventListener("click", csv);
  document.querySelector('[data-baixar="pdf"]').addEventListener("click", pdf);
  document.getElementById("pedidos-atualizar").addEventListener("click", carregar);
  const f = document.getElementById("pedidos-form");
  if (f && FORM) f.href = FORM; else if (f) f.hidden = true;
  carregar();
})();
