// Etusivun "salaperäinen piirtäjä": hetken kuluttua sivun avaamisesta kynä piirtää ruutupaperille pieniä
// kuvia (tähti, kissa, hymiö...). Vain työpöydällä hiirellä, ei kun käyttäjä on pyytänyt vähemmän liikettä.
// Kävijä voi piirtää itse hiirellä muualle kuin korttien päälle. Kortit, logo ja alatunniste jätetään piirtäjältä
// aina rauhaan. Kun kävijä piirtää, piirtäjä vastaa hetken päästä piirtämällä jotain sen ympärille (vastaukset.js).
// Ei evästeitä, ei tallennusta, ei verkkopyyntöjä.
import { SHAPES, VASTAUSKUVAT } from './shapes.js';
import { tulkitse, tunnista, ehdokkaat, sydanValiin, KIITOS } from './vastaukset.js';

const ASETUKSET = {
  alkuviive: 4000, // ms sivun latautumisesta ensimmäiseen kuvaan
  tauko: [6000, 10000], // ms kuvien välillä
  enintaan: 8, // kuvaa per käynti
  koko: [56, 110], // px
  kaanto: 10, // ± astetta
  nopeus: 250, // px/s
  nosto: 170, // ms kynän nosto viivojen välillä
  reunus: 24, // px tyhjää suojattujen alueiden ja ruudun reunan ympärillä
  ruutu: 24, // ruutupaperin ruudun koko
  heilunta: 0.45, // px käsialan heilunta
  korttireunus: 6, // px: kävijän viiva katkeaa näin lähellä korttia
  enintaanViivoja: 300, // kävijän viivoja sivulla; vanhimmat häivytetään
  ohjaimet: false, // alatunnisteen vihje sekä pyyhi- ja hiljaa-painikkeet; piilotettu toistaiseksi
  vastausviive: [1500, 3000], // ms kävijän viimeisestä viivasta piirtäjän vastaukseen
  keskustelutauko: 10000, // ms: piirtäjän omat kuvat odottavat näin kauan kävijän viimeisestä viivasta
  enintaanVastauksia: 10, // sen jälkeen piirtäjä kirjoittaa "kiitos!" ja lopettaa vastaamisen
};

const SUOJATUT = '.choice, header .logo, header small, footer .wrap > *';
const KORTIT = '.choice';
// Näistä ei aloiteta piirtoa: linkit ja painikkeet toimivat, ja ylä- ja alatunnisteen tekstin voi yhä valita.
const EI_ALOITUSTA = '.choice, a, button, input, textarea, select, label, header .wrap > *, footer .wrap > *';
const SVGNS = 'http://www.w3.org/2000/svg';

const sopii =
  window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (sopii) {
  const kaynnista = () => {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
    idle(() => {
      aloita();
      ajastin.aseta(seuraava, ASETUKSET.alkuviive);
    });
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
const piirretyt = []; // { g, laatikko, tyyppi: 'piirtaja' | 'kavija', viivat? }
let pussi = [];
let maara = 0;
let hiljaa = false; // kävijä pysäytti piirtäjän
let piirtaa = false; // piirtäjän kynä liikkuu juuri nyt
let ryhma = []; // kävijän viivat, joihin ei ole vielä vastattu
let vastausId = 0;
let vastauksia = 0;
let edellinenVastaus = '';
let ohjaimet = null;

function aloita() {
  kerros = el('svg', { id: 'doodles', 'aria-hidden': 'true', focusable: 'false' });
  mittari = el('path', { visibility: 'hidden', fill: 'none' });
  kerros.appendChild(mittari);
  kyna = teeKyna();
  kerros.appendChild(kyna);
  const sivu = document.querySelector('.page') || document.body;
  sivu.prepend(kerros);
  kavijanKyna();
  teeOhjaimet();

  let viive = 0;
  window.addEventListener('resize', () => {
    clearTimeout(viive);
    viive = setTimeout(siivoaPeittavat, 200);
  });
}

function seuraava() {
  if (hiljaa || maara >= ASETUKSET.enintaan) return;
  if (piirtaa) {
    ajastin.aseta(seuraava, 2000);
    return;
  }
  if (piirraKuva()) {
    maara++;
    naytaOhjaimet();
  }
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

function etsiPaikka(koko, korkeus = koko) {
  const { reunus, ruutu } = ASETUKSET;
  const leveys = koko;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w - 2 * reunus < leveys || h - 2 * reunus < korkeus) return null;
  const esteet = suojatutAlueet().concat(
    piirretyt.map(({ laatikko: l }) => ({ x1: l.x1 - 12, y1: l.y1 - 12, x2: l.x2 + 12, y2: l.y2 + 12 }))
  );
  for (let i = 0; i < 30; i++) {
    let x = satunnainen(reunus, w - reunus - leveys);
    let y = satunnainen(reunus, h - reunus - korkeus);
    // Löyhästi ruudukkoon, jotta kuva istuu vihkoon.
    x = Math.min(w - reunus - leveys, Math.max(reunus, Math.round(x / ruutu) * ruutu + satunnainen(-3, 3)));
    y = Math.min(h - reunus - korkeus, Math.max(reunus, Math.round(y / ruutu) * ruutu + satunnainen(-3, 3)));
    const l = { x1: x, y1: y, x2: x + leveys, y2: y + korkeus };
    if (!esteet.some((e) => leikkaa(l, e))) return l;
  }
  return null;
}

function siivoaPeittavat() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const esteet = suojatutAlueet();
  const kortit = korttiAlueet();
  for (let i = piirretyt.length - 1; i >= 0; i--) {
    const { laatikko: l, tyyppi } = piirretyt[i];
    const poista =
      tyyppi === 'kavija' ? kortit.some((e) => leikkaa(l, e)) : l.x2 > w || l.y2 > h || esteet.some((e) => leikkaa(l, e));
    if (poista) hayta(i);
  }
}

// Häivyttää ja poistaa piirroksen kohdasta i.
function hayta(i) {
  const [{ g }] = piirretyt.splice(i, 1);
  g.classList.add('pois');
  setTimeout(() => g.remove(), 600);
}

// --- viivojen muuttaminen käsin piirretyiksi ---------------------------------------------------------------

// Kuvan tai sanan koordinaatit (leveys × 100) näytölle: keskikohta (cx, cy), korkeus koko px, kulma radiaaneina.
function muunnin(cx, cy, koko, kulma, leveys = 100) {
  const s = koko / 100;
  const [cos, sin] = [Math.cos(kulma), Math.sin(kulma)];
  return (x, y) => {
    const dx = (x - leveys / 2) * s;
    const dy = (y - 50) * s;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  };
}
const suoraan = (x, y) => [x, y];

function kasinPiirretty(d, muunna) {
  return heiluta(naytteet(d, muunna));
}

function naytteet(d, muunna) {
  mittari.setAttribute('d', d);
  const pituus = mittari.getTotalLength();
  const n = Math.max(8, Math.ceil(pituus / 3));
  const pisteet = [];
  for (let i = 0; i <= n; i++) {
    const p = mittari.getPointAtLength((pituus * i) / n);
    pisteet.push(muunna(p.x, p.y));
  }
  return pisteet;
}

function heiluta(pisteet) {
  const n = pisteet.length - 1;
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
  const kulma = (satunnainen(-ASETUKSET.kaanto, ASETUKSET.kaanto) * Math.PI) / 180;
  const muunna = muunnin(laatikko.x1 + koko / 2, laatikko.y1 + koko / 2, koko, kulma);
  piirra(kuva.viivat.map((d) => naytteet(d, muunna)), kuva.nimi, laatikko);
  return true;
}

// Piirtää valmiiksi näytteistetyt viivat (pistelistat näytön koordinaateissa) piirtäjän kynällä.
function piirra(pistelistat, nimi, laatikko, lisa = {}) {
  const g = el('g', { class: 'piirros', 'data-kuva': nimi, 'stroke-width': satunnainen(3.2, 3.8).toFixed(2) });
  kerros.insertBefore(g, kyna);
  piirretyt.push({ g, laatikko, tyyppi: 'piirtaja', ...lisa });

  const viivat = pistelistat.map((raaka) => {
    const pisteet = heiluta(raaka);
    const k = kertymat(pisteet);
    const pituus = k[k.length - 1];
    const p = el('path', { d: polku(pisteet), 'stroke-dasharray': `${pituus + 2} ${pituus + 2}` });
    p.style.strokeDashoffset = pituus + 2;
    g.appendChild(p);
    return { p, pisteet, k, pituus };
  });

  animoi(viivat, g);
}

function animoi(viivat, g) {
  let i = 0;
  let matka = 0;
  let nosto = -1; // ms jäljellä nostossa, -1 = piirretään
  let nostoAlku = null;
  let edellinen = performance.now();
  const ensimmainen = viivat[0].pisteet[0];
  asetaKyna(ensimmainen[0], ensimmainen[1]);
  kyna.classList.add('nakyy');
  piirtaa = true;
  const valmis = () => {
    kyna.classList.remove('nakyy');
    piirtaa = false;
  };

  const askel = (nyt) => {
    if (!g.isConnected || g.classList.contains('pois')) {
      valmis(); // paperi pyyhittiin kesken piirron
      return;
    }
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
        valmis();
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

// --- kävijän kynä ------------------------------------------------------------------------------------------

let veto = null; // meneillään oleva piirto: { g, viivat, viiva, laatikko, pituus, alueet, piirto }

function korttiAlueet() {
  const r = ASETUKSET.korttireunus;
  return [...document.querySelectorAll(KORTIT)].map((e) => {
    const b = e.getBoundingClientRect();
    return { x1: b.left - r, y1: b.top - r, x2: b.right + r, y2: b.bottom + r };
  });
}

const sisalla = (x, y, alueet) => alueet.some((a) => x > a.x1 && x < a.x2 && y > a.y1 && y < a.y2);

function kavijanKyna() {
  document.documentElement.classList.add('voi-piirtaa');
  document.addEventListener('pointerdown', alkaa);
}

function alkaa(e) {
  if (veto || e.button !== 0 || !e.isPrimary || e.pointerType === 'touch') return;
  if (!(e.target instanceof Element) || e.target.closest(EI_ALOITUSTA)) return;
  const alueet = korttiAlueet();
  if (sisalla(e.clientX, e.clientY, alueet)) return;
  e.preventDefault(); // ei tekstin valintaa eikä kuvan raahausta
  clearTimeout(vastausId); // kävijä piirtää yhä: vastataan vasta kun hän pitää tauon
  if (ajastin.fn && !hiljaa) ajastin.aseta(seuraava, ASETUKSET.keskustelutauko);
  try {
    document.body.setPointerCapture(e.pointerId);
  } catch {}

  const g = el('g', { class: 'kavija' });
  kerros.insertBefore(g, kyna);
  veto = { g, viivat: [], viiva: null, alueet, pituus: 0, viimeinen: [e.clientX, e.clientY], laatikko: { x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY } };
  uusiViiva(e.clientX, e.clientY);
  window.addEventListener('pointermove', liikkuu);
  window.addEventListener('pointerup', loppuu);
  window.addEventListener('pointercancel', loppuu);
  window.addEventListener('blur', loppuu);
}

function uusiViiva(x, y) {
  const p = el('path');
  veto.g.appendChild(p);
  veto.viiva = { p, pisteet: [[x, y]] };
  veto.viivat.push(veto.viiva);
  piirraVeto();
}

function liikkuu(e) {
  if (!veto) return;
  const tapahtumat = (e.getCoalescedEvents && e.getCoalescedEvents()) || [e];
  const naytteet = [];
  for (const t of tapahtumat.length ? tapahtumat : [e]) {
    // Pitkä hyppy jaetaan pieniin askeliin, jotta viiva katkeaa tarkasti kortin reunalla.
    const [lx, ly] = veto.viimeinen;
    const askelia = Math.max(1, Math.ceil(Math.hypot(t.clientX - lx, t.clientY - ly) / 4));
    for (let i = 1; i <= askelia; i++) naytteet.push([lx + ((t.clientX - lx) * i) / askelia, ly + ((t.clientY - ly) * i) / askelia]);
    veto.viimeinen = [t.clientX, t.clientY];
  }
  for (const [x, y] of naytteet) {
    if (sisalla(x, y, veto.alueet)) {
      veto.viiva = null; // viiva katkeaa kortin kohdalla ja jatkuu sen jälkeen
      continue;
    }
    if (!veto.viiva) {
      uusiViiva(x, y);
      continue;
    }
    const pisteet = veto.viiva.pisteet;
    const [px, py] = pisteet[pisteet.length - 1];
    const d = Math.hypot(x - px, y - py);
    if (d < 2) continue;
    pisteet.push([x, y]);
    veto.pituus += d;
    const l = veto.laatikko;
    l.x1 = Math.min(l.x1, x);
    l.y1 = Math.min(l.y1, y);
    l.x2 = Math.max(l.x2, x);
    l.y2 = Math.max(l.y2, y);
  }
  piirraVeto();
}

let vetoKehys = 0;
function piirraVeto() {
  if (vetoKehys) return;
  vetoKehys = requestAnimationFrame(() => {
    vetoKehys = 0;
    if (veto && veto.viiva) veto.viiva.p.setAttribute('d', polku(veto.viiva.pisteet));
  });
}

function loppuu() {
  if (!veto) return;
  window.removeEventListener('pointermove', liikkuu);
  window.removeEventListener('pointerup', loppuu);
  window.removeEventListener('pointercancel', loppuu);
  window.removeEventListener('blur', loppuu);
  const v = veto;
  veto = null;
  cancelAnimationFrame(vetoKehys);
  vetoKehys = 0;
  for (const viiva of v.viivat) viiva.p.setAttribute('d', polku(viiva.pisteet));
  if (v.pituus < 4) {
    v.g.remove(); // pelkkä napsautus
    return;
  }
  const merkinta = { g: v.g, laatikko: v.laatikko, tyyppi: 'kavija', viivat: v.viivat.map((x) => x.pisteet) };
  piirretyt.push(merkinta);
  karsi();
  naytaOhjaimet();
  ryhma.push(merkinta);
  ajastaVastaus(satunnainen(...ASETUKSET.vastausviive));
}

// Pitää kävijän viivojen määrän kohtuullisena: vanhimmat häipyvät ensin.
function karsi() {
  let viivoja = piirretyt.reduce((n, p) => n + (p.tyyppi === 'kavija' ? p.viivat.length : 0), 0);
  for (let i = 0; i < piirretyt.length && viivoja > ASETUKSET.enintaanViivoja; ) {
    if (piirretyt[i].tyyppi === 'kavija') {
      viivoja -= piirretyt[i].viivat.length;
      hayta(i);
    } else i++;
  }
}

// --- vihje ja painikkeet alatunnisteessa -------------------------------------------------------------------

function teeOhjaimet() {
  if (!ASETUKSET.ohjaimet) return;
  const wrap = document.querySelector('footer .wrap');
  if (!wrap) return;
  ohjaimet = document.createElement('span');
  ohjaimet.className = 'ohjaimet';
  const vihje = document.createElement('span');
  vihje.className = 'vihje hand';
  vihje.textContent = 'Saat piirtää sinäkin';
  const pyyhi = nappi('pyyhi', 'Pyyhi piirrokset', () => {
    for (let i = piirretyt.length - 1; i >= 0; i--) hayta(i);
  });
  const hiljaaNappi = nappi('hiljaa', 'Pysäytä piirtäjä', () => {
    hiljaa = !hiljaa;
    hiljaaNappi.textContent = hiljaa ? 'jatka' : 'hiljaa';
    hiljaaNappi.setAttribute('aria-label', hiljaa ? 'Jatka piirtäjää' : 'Pysäytä piirtäjä');
    if (hiljaa) {
      ajastin.tauota();
      ajastin.fn = null;
    } else if (maara < ASETUKSET.enintaan) ajastin.aseta(seuraava, 1500);
  });
  ohjaimet.append(vihje, pyyhi, hiljaaNappi);
  wrap.insertBefore(ohjaimet, wrap.lastElementChild);
}

function nappi(teksti, nimi, fn) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = teksti;
  b.setAttribute('aria-label', nimi);
  b.addEventListener('click', fn);
  return b;
}

function naytaOhjaimet() {
  if (ohjaimet) ohjaimet.classList.add('nakyy');
}

// --- piirtäjä vastaa kävijälle -----------------------------------------------------------------------------

function ajastaVastaus(ms) {
  clearTimeout(vastausId);
  vastausId = setTimeout(vastaa, ms);
}

function vastaa() {
  if (hiljaa || veto || document.hidden) return ajastaVastaus(1500);
  if (piirtaa) return ajastaVastaus(600);
  const merkinnat = ryhma.filter((m) => m.g.isConnected && !m.g.classList.contains('pois'));
  ryhma = [];
  if (!merkinnat.length || vastauksia > ASETUKSET.enintaanVastauksia) return;

  if (vastauksia === ASETUKSET.enintaanVastauksia) {
    vastauksia++;
    kiitos();
    return;
  }

  const viivat = merkinnat.flatMap((m) => m.viivat).filter((v) => v.length > 0);
  if (!viivat.length) return;
  const p = tulkitse(viivat);
  p.muoto = tunnista(p, mallit());

  // Jos kävijä piirsi piirtäjän oman kuvan viereen, piirtäjä vastaa joskus sydämellä niiden väliin.
  const omat = piirretyt.filter((m) => m.tyyppi === 'piirtaja' && !m.vastaus);
  const lahin = omat
    .map((m) => ({ cx: (m.laatikko.x1 + m.laatikko.x2) / 2, cy: (m.laatikko.y1 + m.laatikko.y2) / 2 }))
    .map((o) => ({ ...o, etaisyys: Math.hypot(o.cx - p.cx, o.cy - p.cy) }))
    .sort((a, b) => a.etaisyys - b.etaisyys)[0];
  const lista = ehdokkaat(p, edellinenVastaus);
  if (lahin && lahin.etaisyys < 220 && lahin.etaisyys > 60 && edellinenVastaus !== 'sydän' && Math.random() < 0.5) {
    lista.unshift(sydanValiin(p, lahin));
  }

  for (const ehdokas of lista) {
    const valmis = valmistele(ehdokas.osat);
    if (!valmis || !mahtuu(valmis.laatikko, p.laatikko)) continue;
    piirra(valmis.pistelistat, ehdokas.nimi, valmis.laatikko, { vastaus: true });
    edellinenVastaus = ehdokas.nimi;
    vastauksia++;
    return;
  }
}

// Tähden, sydämen ja ympyrän pistepilvet matkijaa varten (lasketaan kerran).
let malliVarasto = null;
function mallit() {
  if (!malliVarasto) {
    const d = (nimi) => [...SHAPES, ...VASTAUSKUVAT].find((s) => s.nimi === nimi).viivat[0];
    malliVarasto = {
      tähti: naytteet(d('tähti'), suoraan),
      sydän: naytteet(d('sydän'), suoraan),
      ympyrä: naytteet('M90 50 A40 40 0 1 1 90 49.99', suoraan),
    };
  }
  return malliVarasto;
}

// Muuttaa vastauksen osat pistelistoiksi näytön koordinaateissa ja laskee niiden laatikon.
function valmistele(osat) {
  const pistelistat = [];
  for (const osa of osat) {
    if (osa.kuva) {
      const muunna = muunnin(osa.cx, osa.cy, osa.koko, osa.kulma || 0, osa.kuva.leveys || 100);
      for (const d of osa.kuva.viivat) pistelistat.push(naytteet(d, muunna));
    } else pistelistat.push(naytteet(osa.d, suoraan));
  }
  if (!pistelistat.length) return null;
  const l = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (const [x, y] of pistelistat.flat()) {
    l.x1 = Math.min(l.x1, x - 3);
    l.y1 = Math.min(l.y1, y - 3);
    l.x2 = Math.max(l.x2, x + 3);
    l.y2 = Math.max(l.y2, y + 3);
  }
  return { pistelistat, laatikko: l };
}

// Vastaus saa koskea kävijän piirrokseen (se piirretään sen ympärille), mutta ei kortteihin, logoon,
// alatunnisteeseen eikä ruudun reunan yli.
function mahtuu(l, oma) {
  const r = 8;
  if (l.x1 < r || l.y1 < r || l.x2 > window.innerWidth - r || l.y2 > window.innerHeight - r) return false;
  const esteet = [...document.querySelectorAll(SUOJATUT)].map((e) => {
    const b = e.getBoundingClientRect();
    return { x1: b.left - r, y1: b.top - r, x2: b.right + r, y2: b.bottom + r };
  });
  return !esteet.some((e) => leikkaa(l, e));
}

function kiitos() {
  const korkeus = 44;
  const leveys = (KIITOS.leveys / 100) * korkeus;
  const paikka = etsiPaikka(leveys, korkeus);
  if (!paikka) return;
  const muunna = muunnin(paikka.x1 + leveys / 2, paikka.y1 + korkeus / 2, korkeus, satunnainen(-0.08, 0.08), KIITOS.leveys);
  piirra(KIITOS.viivat.map((d) => naytteet(d, muunna)), KIITOS.nimi, paikka, { vastaus: true });
}
