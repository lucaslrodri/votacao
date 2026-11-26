// O "Ampliar" da página inicial (Lucas, 25/11/2026: "deixa ampliar para ver os detalhes também (Da camisa com o
// modelo 3D - em um modal)"): o botão em cima de cada cor abre um modal com a camisa em 3D (camisa-3d.js) e os
// desenhos grandes (frente, costas e as duas mangas, de grafica/modelos/). Dá para trocar a cor ali mesmo, e "Quero a
// polo ..." volta para o cartão da cor, no tamanho.
(function () {
  "use strict";
  const dlg = document.getElementById("ampliar");
  if (!dlg || typeof dlg.showModal !== "function") return;
  const ARQ = { azul: "classica-design-pronto", preta: "classica-preta-design-pronto" };
  const NOME = { azul: "Polo azul", preta: "Polo preta" };
  let cor = "azul", modo = "3d";

  function mostrar() {
    document.getElementById("amp-titulo").textContent = NOME[cor];
    document.getElementById("amp-quero").textContent = "Quero a " + NOME[cor].toLowerCase();
    dlg.querySelectorAll("[data-amp-cor]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.ampCor === cor); });
    dlg.querySelectorAll("[data-amp-modo]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.ampModo === modo); });
    document.getElementById("amp-3d").hidden = modo !== "3d";
    document.getElementById("amp-desenho").hidden = modo !== "desenho";
    dlg.querySelectorAll("[data-vista-img]").forEach(function (img) {
      const src = "grafica/modelos/" + ARQ[cor] + "-" + img.dataset.vistaImg + ".svg";
      if (img.getAttribute("src") !== src) img.setAttribute("src", src);
      img.alt = NOME[cor] + ": " + img.parentNode.querySelector("figcaption").textContent.toLowerCase();
    });
    if (modo === "3d") window.dispatchEvent(new CustomEvent("camisa-3d", { detail: { cor: cor } }));
  }

  document.querySelectorAll("[data-ampliar]").forEach(function (b) {
    b.addEventListener("click", function () {
      cor = b.dataset.ampliar;
      dlg.showModal();
      mostrar();
    });
  });
  dlg.querySelectorAll("[data-amp-cor]").forEach(function (b) {
    b.addEventListener("click", function () { cor = b.dataset.ampCor; mostrar(); });
  });
  dlg.querySelectorAll("[data-amp-modo]").forEach(function (b) {
    b.addEventListener("click", function () { modo = b.dataset.ampModo; mostrar(); });
  });
  document.getElementById("amp-fechar").addEventListener("click", function () { dlg.close(); });
  // um clique fora da caixa (no fundo escuro) fecha
  dlg.addEventListener("click", function (e) {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });
  // "Quero a polo ...": volta para o cartão da cor, no tamanho (para escolher o tamanho e a quantidade)
  document.getElementById("amp-quero").addEventListener("click", function () {
    dlg.close();
    const compra = document.querySelector('.opcao[data-cor="' + cor + '"] .compra');
    if (!compra) return;
    compra.scrollIntoView({ behavior: "smooth", block: "center" });
    const b = compra.querySelector("[data-tam]");
    if (b) setTimeout(function () { b.focus({ preventScroll: true }); }, 400);
  });
})();
