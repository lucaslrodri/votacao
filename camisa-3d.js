// O avatar 3D da Clássica, no "Ampliar" da página inicial (Lucas, 25/11/2026: "deixa ampliar para ver os detalhes
// também (Da camisa com o modelo 3D - em um modal)"). Adaptado do 3D do montador (../montador/index.html): as peças
// vêm do OpenSCAD (../avatar/avatar.scad), só as da Clássica, em malhas-3d.js (../avatar/malhas-classica.py). Carrega
// (three.js e as peças) só na primeira vez que o 3D abre. A página manda o evento "camisa-3d" com a cor.
const CORES = { azul: "#083671", ouro: "#FFBF14", preto: "#1A1A1A" };
const PELE = "#C68F6E", CABELO = "#2B2522", CALCA = "#3A3F47";
const BANDEIRA = { verde: "#009C3B", amarelo: "#FFDF00", azul: "#002776", branco: "#FFFFFF" };
// a Clássica: o logo de 10 cm no peito esquerdo (na negativa), a bandeira na manga esquerda e a Ufac na direita, a Ufac
// 1,25× (como nos desenhos do kit)
const ESCALA_BANDEIRA = 3.5 / 7, ESCALA_UFAC = 3.5 / 7 * 1.25;
let THREE, cena, camera, render, controles, malhas = {}, pronto = false, iniciando = null, cor = "azul";
const alvo = { x: 0, y: 1280, z: 0 };
const caixa = document.getElementById("v-3d");

function escurecer(h, p) {
  const n = parseInt(h.slice(1), 16);
  const f = (v) => Math.round(v * (1 - p)).toString(16).padStart(2, "0");
  return "#" + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
}
function carregarScript(src) {
  return new Promise((ok, erro) => {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = erro;
    document.head.appendChild(s);
  });
}
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;

function iniciar() {
  if (pronto) return Promise.resolve();
  if (!iniciando) iniciando = carregar().finally(() => { if (!pronto) iniciando = null; });
  return iniciando;
}
async function carregar() {
  const aviso = document.getElementById("carregando-3d");
  aviso.textContent = "Carregando o 3D…";
  try {
    THREE = await import("three");
    const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
    if (!window.MALHAS3D) await carregarScript(caixa.dataset.malhas);
    render = new THREE.WebGLRenderer({ antialias: true });
    render.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    caixa.appendChild(render.domElement);
    cena = new THREE.Scene();
    cena.background = new THREE.Color("#E9ECF1");
    camera = new THREE.PerspectiveCamera(28, 4 / 5, 50, 12000);
    cena.add(new THREE.HemisphereLight(0xffffff, 0x9aa0aa, 1.9));
    const luz = new THREE.DirectionalLight(0xffffff, 1.7); luz.position.set(700, 2000, 1800); cena.add(luz);
    const luz2 = new THREE.DirectionalLight(0xffffff, 0.7); luz2.position.set(-1500, 1400, -900); cena.add(luz2);
    const M = window.MALHAS3D;
    for (const [nome, p] of Object.entries(M.partes)) {
      const v = new Int16Array(b64(p.v));
      const pos = new Float32Array(v.length);
      for (let i = 0; i < v.length; i++) pos[i] = v[i] * M.escala;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setIndex(new THREE.BufferAttribute(p.i32 ? new Uint32Array(b64(p.i)) : new Uint16Array(b64(p.i)), 1));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0 }));
      m.name = nome;
      cena.add(m);
      malhas[nome] = m;
    }
    controles = new OrbitControls(camera, render.domElement);
    controles.target.set(alvo.x, alvo.y, alvo.z);
    controles.enablePan = false;
    controles.enableDamping = true;
    controles.minDistance = 700;
    controles.maxDistance = 4200;
    controles.minPolarAngle = 0.35;
    controles.maxPolarAngle = 2.2;
    controles.addEventListener("change", desenhar);
    new ResizeObserver(ajustar).observe(caixa);
    aviso.hidden = true;
    pronto = true;
    ajustar();
    vista("frente");
    (function laco() { requestAnimationFrame(laco); if (controles.update()) desenhar(); })();
  } catch (e) {
    console.error(e);
    aviso.textContent = "Não deu para abrir o 3D: precisa de internet e de um navegador com WebGL.";
    throw e;
  }
}

// os emblemas das mangas foram exportados com a bandeira de 7 cm; aqui eles são reduzidos ou ampliados em torno do
// centro, sobre a manga (em coordenadas cilíndricas do braço), para continuar rentes ao tecido
function matrizBraco(lado) {
  const g = Math.PI / 180;
  return new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, -lado * 16 * g, 0, "ZYX"))
    .setPosition(lado * 186, 0, 1368);
}
function escalarEmblema(m, s) {
  if (!m || m.userData.escala === s) return;
  const nome = m.name.split("@")[0];
  const lado = nome.includes("-esq") ? 1 : -1;
  const zc = nome.startsWith("ufac") ? -98 : -100, tc = lado > 0 ? 0 : Math.PI;
  const M = matrizBraco(lado), Mi = M.clone().invert();
  const atr = m.geometry.attributes.position;
  const orig = m.userData.orig || (m.userData.orig = atr.array.slice());
  const pos = atr.array, v = new THREE.Vector3();
  for (let i = 0; i < pos.length; i += 3) {
    v.set(orig[i], -orig[i + 2], orig[i + 1]).applyMatrix4(Mi);       // three.js → OpenSCAD → braço
    const r = Math.hypot(v.x, v.y);
    let t = Math.atan2(v.y, v.x) - tc;
    t = Math.atan2(Math.sin(t), Math.cos(t));
    const t2 = tc + t * s, z2 = zc + (v.z - zc) * s, r2 = r + 0.0355 * (z2 - v.z);
    v.set(r2 * Math.cos(t2), r2 * Math.sin(t2), z2).applyMatrix4(M);
    pos[i] = v.x; pos[i + 1] = v.z; pos[i + 2] = -v.y;                 // OpenSCAD → three.js
  }
  atr.needsUpdate = true;
  m.geometry.computeBoundingSphere();
  m.userData.escala = s;
}

function ajustar() {
  if (!pronto) return;
  const w = caixa.clientWidth, h = caixa.clientHeight;
  if (!w || !h) return;
  render.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  desenhar();
}
function desenhar() { if (pronto) render.render(cena, camera); }

// as vistas: o avatar olha para +z; o lado esquerdo dele é +x; de lado, 70°, a manga fica de frente para a câmera
function vista(v) {
  const ang = { frente: 0, esquerda: 70, direita: -70, costas: 180 }[v] * Math.PI / 180;
  camera.position.set(alvo.x + 3000 * Math.sin(ang), alvo.y + 60, alvo.z + 3000 * Math.cos(ang));
  controles.target.set(alvo.x, alvo.y, alvo.z);
  controles.update();
  document.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.vista === v));
  desenhar();
}

// pinta as peças na cor da polo
function aplicar() {
  if (!pronto) return;
  const T = cor === "preta" ? CORES.preto : CORES.azul;
  const liga = (nome, c) => { const m = malhas[nome] || malhas[nome + "@aberto"]; if (m) m.material.color.set(c); return m; };
  liga("corpo", T); liga("carcela", T); liga("carcela-costura", escurecer(T, 0.25));
  liga("botoes", "#E8EAED");
  liga("gola", T); liga("mangas", T); liga("punhos", escurecer(T, 0.12));
  liga("pele-bracos", PELE); liga("pele-cabeca", PELE); liga("cabelo", CABELO); liga("calca", CALCA);
  liga("logo-peito-10-alta-branco", "#FFFFFF"); liga("logo-peito-10-alta-ouro", CORES.ouro);
  for (const [k, c] of Object.entries(BANDEIRA)) escalarEmblema(liga("bandeira-esq-" + k, c), ESCALA_BANDEIRA);
  escalarEmblema(liga("ufac-dir", "#FFFFFF"), ESCALA_UFAC);
  desenhar();
}

window.addEventListener("camisa-3d", (e) => {
  cor = e.detail && e.detail.cor === "preta" ? "preta" : "azul";
  iniciar().then(() => { ajustar(); aplicar(); }, () => {});
});
document.querySelectorAll("[data-vista]").forEach((b) => b.addEventListener("click", () => pronto && vista(b.dataset.vista)));
