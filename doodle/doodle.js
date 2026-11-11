// Etusivun "salaperäinen piirtäjä": hetken kuluttua sivun avaamisesta kynä piirtää ruutupaperille pieniä
// kuvia (tähti, kissa, hymiö...). Vain työpöydällä hiirellä, ei kun käyttäjä on pyytänyt vähemmän liikettä.
// Kortit, logo ja alatunniste jätetään aina rauhaan. Ei evästeitä, ei tallennusta, ei verkkopyyntöjä.
import { SHAPES } from './shapes.js';

const ASETUKSET = {
  alkuviive: 4000, // ms sivun latautumisesta ensimmäiseen kuvaan
  tauko: [8000, 15000], // ms kuvien välillä
  enintaan: 8, // kuvaa per käynti
  koko: [56, 110], // px
  kaanto: 10, // ± astetta
  nopeus: 250, // px/s
  nosto: 170, // ms kynän nosto viivojen välillä
  reunus: 24, // px tyhjää suojattujen alueiden ja ruudun reunan ympärillä
  ruutu: 24, // ruutupaperin ruudun koko
  heilunta: 0.45, // px käsialan heilunta
};

const SUOJATUT = '.choice, header .logo, header small, footer .wrap > *';
const SVGNS = 'http://www.w3.org/2000/svg';

const sopii =
  window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (sopii) {
  const kaynnista = () => {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
    idle(() => ajastin.aseta(aloita, ASETUKSET.alkuviive));
  };
  if (document.readyState === 'complete') kaynnista();
  else window.addEventListener('load', kaynnista, { once: true });
}

// --- apuvälineet ---------------------------------------------------------------------------------------------

const satunnainen = (a, b) => a + Math.random() * (b - a);
const el = (nimi, attr = {}) => {
  const e = document.createElementNS(SVGNS, nimi);
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
  return e;
};

// Ajastin, joka pysähtyy kun välilehti on piilossa ja jatkaa siitä mihin jäi.
const ajastin = {
  id: 0,
  fn: null,
  jaljella: 0,
  alkoi: 0,
  aseta(fn, ms) {
    this.fn = fn;
    this.jaljella = ms;
    if (!document.hidden) this.kay();
  },
  kay() {
    clearTimeout(this.id);
    this.alkoi = performance.now();
    this.id = setTimeout(() => {
      const f = this.fn;
      this.fn = null;
      f && f();
    }, this.jaljella);
  },
  tauota() {
    if (!this.fn) return;
    clearTimeout(this.id);
    this.jaljella = Math.max(0, this.jaljella - (performance.now() - this.alkoi));
  },
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) ajastin.tauota();
  else if (ajastin.fn) ajastin.kay();
});

// --- tila --------------------------------------------------------------------------------------------------

let kerros = null; // <svg id="doodles">
let mittari = null; // piilotettu polku viivojen mittaamiseen
let kyna = null;
const piirretyt = []; // { g, laatikko }
let pussi = [];
let maara = 0;

function aloita() {
  kerros = el('svg', { id: 'doodles', 'aria-hidden': 'true', focusable: 'false' });
  mittari = el('path', { visibility: 'hidden', fill: 'none' });
  kerros.appendChild(mittari);
  kyna = teeKyna();
  kerros.appendChild(kyna);
  const sivu = document.querySelector('.page') || document.body;
  sivu.prepend(kerros);

  let viive = 0;
  window.addEventListener('resize', () => {
    clearTimeout(viive);
    viive = setTimeout(siivoaPeittavat, 200);
  });

  seuraava();
}

function seuraava() {
  if (maara >= ASETUKSET.enintaan) return;
  if (piirraKuva()) maara++;
  if (maara < ASETUKSET.enintaan) ajastin.aseta(seuraava, satunnainen(...ASETUKSET.tauko));
}

function seuraavaKuva() {
  if (!pussi.length) {
    pussi = SHAPES.slice();
    for (let i = pussi.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pussi[i], pussi[j]] = [pussi[j], pussi[i]];
    }
  }
  return pussi.pop();
}

// --- paikan valinta ----------------------------------------------------------------------------------------

function suojatutAlueet() {
  const r = ASETUKSET.reunus;
  return [...document.querySelectorAll(SUOJATUT)].map((e) => {
    const b = e.getBoundingClientRect();
    return { x1: b.left - r, y1: b.top - r, x2: b.right + r, y2: b.bottom + r };
  });
}

const leikkaa = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

function etsiPaikka(koko) {
  const { reunus, ruutu } = ASETUKSET;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w - 2 * reunus < koko || h - 2 * reunus < koko) return null;
  const esteet = suojatutAlueet().concat(
    piirretyt.map(({ laatikko: l }) => ({ x1: l.x1 - 12, y1: l.y1 - 12, x2: l.x2 + 12, y2: l.y2 + 12 }))
  );
  for (let i = 0; i < 30; i++) {
    let x = satunnainen(reunus, w - reunus - koko);
    let y = satunnainen(reunus, h - reunus - koko);
    // Löyhästi ruudukkoon, jotta kuva istuu vihkoon.
    x = Math.min(w - reunus - koko, Math.max(reunus, Math.round(x / ruutu) * ruutu + satunnainen(-3, 3)));
    y = Math.min(h - reunus - koko, Math.max(reunus, Math.round(y / ruutu) * ruutu + satunnainen(-3, 3)));
    const l = { x1: x, y1: y, x2: x + koko, y2: y + koko };
    if (!esteet.some((e) => leikkaa(l, e))) return l;
  }
  return null;
}

function siivoaPeittavat() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const esteet = suojatutAlueet();
  for (let i = piirretyt.length - 1; i >= 0; i--) {
    const { g, laatikko: l } = piirretyt[i];
    const ulkona = l.x2 > w || l.y2 > h;
    if (ulkona || esteet.some((e) => leikkaa(l, e))) {
      piirretyt.splice(i, 1);
      g.classList.add('pois');
      setTimeout(() => g.remove(), 600);
    }
  }
}

// --- viivojen muuttaminen käsin piirretyiksi ---------------------------------------------------------------

function kasinPiirretty(d, muunna) {
  mittari.setAttribute('d', d);
  const pituus = mittari.getTotalLength();
  const n = Math.max(8, Math.ceil(pituus / 3));
  const pisteet = [];
  for (let i = 0; i <= n; i++) {
    const p = mittari.getPointAtLength((pituus * i) / n);
    pisteet.push(muunna(p.x, p.y));
  }
  const alku = pisteet[0];
  const loppu = pisteet[pisteet.length - 1];
  const suljettu = Math.hypot(alku[0] - loppu[0], alku[1] - loppu[1]) < 1.5 && n > 12;
  if (suljettu) {
    // Oikea kynä menee vähän alkukohdan yli.
    const yli = Math.ceil(n * satunnainen(0.04, 0.08));
    for (let i = 1; i <= yli; i++) pisteet.push([pisteet[i][0] + i * 0.25, pisteet[i][1] - i * 0.2]);
  }
  // Pehmeä heilunta viivan suuntaan nähden kohtisuoraan.
  const a = ASETUKSET.heilunta;
  const [f1, f2, v1, v2] = [satunnainen(0.04, 0.09), satunnainen(0.13, 0.22), satunnainen(0, 7), satunnainen(0, 7)];
  const heiluva = pisteet.map(([x, y], i) => {
    const s = i * 3;
    return [x + a * Math.sin(s * f1 + v1) + a * 0.4 * Math.sin(s * f2 + v2), y + a * Math.cos(s * f1 + v2) + a * 0.4 * Math.cos(s * f2 + v1)];
  });
  return heiluva;
}

function polku(pisteet) {
  // Toisen asteen käyrä pisteiden keskikohtien kautta.
  let d = `M${pisteet[0][0].toFixed(1)} ${pisteet[0][1].toFixed(1)}`;
  for (let i = 1; i < pisteet.length - 1; i++) {
    const [x, y] = pisteet[i];
    const [nx, ny] = pisteet[i + 1];
    d += ` Q${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`;
  }
  const v = pisteet[pisteet.length - 1];
  d += ` L${v[0].toFixed(1)} ${v[1].toFixed(1)}`;
  return d;
}

function kertymat(pisteet) {
  const k = [0];
  for (let i = 1; i < pisteet.length; i++) {
    k.push(k[i - 1] + Math.hypot(pisteet[i][0] - pisteet[i - 1][0], pisteet[i][1] - pisteet[i - 1][1]));
  }
  return k;
}

function pisteMatkalla(pisteet, k, matka) {
  let i = 1;
  while (i < k.length - 1 && k[i] < matka) i++;
  const osuus = k[i] === k[i - 1] ? 0 : (matka - k[i - 1]) / (k[i] - k[i - 1]);
  const [ax, ay] = pisteet[i - 1];
  const [bx, by] = pisteet[i];
  return [ax + (bx - ax) * Math.min(1, Math.max(0, osuus)), ay + (by - ay) * Math.min(1, Math.max(0, osuus))];
}

// --- piirtäminen -------------------------------------------------------------------------------------------

function piirraKuva() {
  const kuva = seuraavaKuva();
  const koko = Math.round(satunnainen(...ASETUKSET.koko));
  const laatikko = etsiPaikka(koko);
  if (!laatikko) return false;

  const cx = laatikko.x1 + koko / 2;
  const cy = laatikko.y1 + koko / 2;
  const kulma = (satunnainen(-ASETUKSET.kaanto, ASETUKSET.kaanto) * Math.PI) / 180;
  const s = koko / 100;
  const [cos, sin] = [Math.cos(kulma), Math.sin(kulma)];
  const muunna = (x, y) => {
    const dx = (x - 50) * s;
    const dy = (y - 50) * s;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  };

  const g = el('g', { class: 'piirros', 'data-kuva': kuva.nimi, 'stroke-width': satunnainen(3.2, 3.8).toFixed(2) });
  kerros.insertBefore(g, kyna);
  piirretyt.push({ g, laatikko });

  const viivat = kuva.viivat.map((d) => {
    const pisteet = kasinPiirretty(d, muunna);
    const k = kertymat(pisteet);
    const pituus = k[k.length - 1];
    const p = el('path', { d: polku(pisteet), 'stroke-dasharray': `${pituus + 2} ${pituus + 2}` });
    p.style.strokeDashoffset = pituus + 2;
    g.appendChild(p);
    return { p, pisteet, k, pituus };
  });

  animoi(viivat);
  return true;
}

function animoi(viivat) {
  let i = 0;
  let matka = 0;
  let nosto = -1; // ms jäljellä nostossa, -1 = piirretään
  let nostoAlku = null;
  let edellinen = performance.now();
  const ensimmainen = viivat[0].pisteet[0];
  asetaKyna(ensimmainen[0], ensimmainen[1]);
  kyna.classList.add('nakyy');

  const askel = (nyt) => {
    const dt = Math.min(50, nyt - edellinen); // piilossa ollut välilehti ei hyppää eteenpäin
    edellinen = nyt;
    const v = viivat[i];

    if (nosto >= 0) {
      nosto -= dt;
      const seur = viivat[i].pisteet[0];
      const t = 1 - Math.max(0, nosto) / ASETUKSET.nosto;
      const hyppy = Math.sin(t * Math.PI) * 6; // kynä nousee hieman paperista
      asetaKyna(nostoAlku[0] + (seur[0] - nostoAlku[0]) * t, nostoAlku[1] + (seur[1] - nostoAlku[1]) * t - hyppy);
      if (nosto < 0) matka = 0;
      requestAnimationFrame(askel);
      return;
    }

    matka = Math.min(v.pituus, matka + (ASETUKSET.nopeus * dt) / 1000);
    v.p.style.strokeDashoffset = v.pituus + 2 - matka;
    const [x, y] = pisteMatkalla(v.pisteet, v.k, matka);
    asetaKyna(x, y);

    if (matka >= v.pituus) {
      v.p.style.strokeDashoffset = 0;
      i++;
      if (i >= viivat.length) {
        kyna.classList.remove('nakyy');
        return;
      }
      nostoAlku = [x, y];
      nosto = ASETUKSET.nosto;
    }
    requestAnimationFrame(askel);
  };
  requestAnimationFrame(askel);
}

// --- kynä --------------------------------------------------------------------------------------------------

function teeKyna() {
  // Kärki origossa, runko osoittaa ylös oikealle.
  const g = el('g', { class: 'kyna' });
  const sisa = el('g', { transform: 'rotate(-48)' });
  sisa.append(
    el('path', { d: 'M0 0 L8 -3.2 L8 3.2 Z', fill: '#E9CFA6', stroke: '#33383E', 'stroke-width': '1' }),
    el('path', { d: 'M0 0 L3 -1.2 L3 1.2 Z', fill: '#1B1D20' }),
    el('rect', { x: '8', y: '-3.2', width: '20', height: '6.4', fill: '#C8372F', stroke: '#33383E', 'stroke-width': '1' }),
    el('rect', { x: '28', y: '-3.2', width: '3', height: '6.4', fill: '#B9BEC4', stroke: '#33383E', 'stroke-width': '1' }),
    el('rect', { x: '31', y: '-3.2', width: '4.5', height: '6.4', rx: '1.5', fill: '#FFB3C6', stroke: '#33383E', 'stroke-width': '1' })
  );
  g.appendChild(sisa);
  return g;
}

function asetaKyna(x, y) {
  kyna.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
}
