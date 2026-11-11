// Vaihe 3: piirtäjä vastaa kävijän piirrokseen. Tämä tiedosto vain päättää, mitä piirretään ja mihin.
// Piirtäminen, käsialan heilunta ja paikan tarkistus (kortit, ruudun reunat) tehdään doodle.js:ssä.
//
// Vastaus on lista osia, jotka ovat joko
//   { d }                               SVG-polku suoraan näytön koordinaateissa, tai
//   { kuva, cx, cy, koko, kulma }       kuva tai sana kirjastosta (shapes.js), keskitettynä pisteeseen.
import { SHAPES, VASTAUSKUVAT, SANAT } from './shapes.js';

const kuva = (nimi) => SHAPES.find((s) => s.nimi === nimi) || VASTAUSKUVAT.find((s) => s.nimi === nimi);
const satunnainen = (a, b) => a + Math.random() * (b - a);
const f = (n) => n.toFixed(1);

// --- piirroksen tulkinta -----------------------------------------------------------------------------------

export function tulkitse(viivat) {
  const kaikki = viivat.flat();
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const [x, y] of kaikki) {
    x1 = Math.min(x1, x); y1 = Math.min(y1, y);
    x2 = Math.max(x2, x); y2 = Math.max(y2, y);
  }
  const w = x2 - x1;
  const h = y2 - y1;
  const koko = Math.max(w, h);
  let muste = 0;
  for (const v of viivat) for (let i = 1; i < v.length; i++) muste += Math.hypot(v[i][0] - v[i - 1][0], v[i][1] - v[i - 1][1]);
  const eka = viivat[0];
  const alku = eka[0];
  const loppu = eka[eka.length - 1];
  const janne = Math.hypot(loppu[0] - alku[0], loppu[1] - alku[1]);
  const yksi = viivat.length === 1;

  // Kuinka monta kertaa viiva vaihtaa pystysuuntaa (aaltoviivan tunnistamiseen).
  let kaannoksia = 0;
  let suunta = 0;
  let ref = eka[0][1];
  for (const [, y] of eka) {
    if (Math.abs(y - ref) < 6) continue;
    const s = Math.sign(y - ref);
    if (suunta && s !== suunta) kaannoksia++;
    suunta = s;
    ref = y;
  }

  const suljettu = yksi && koko >= 20 && janne < 0.25 * koko && muste > 2.2 * koko;
  let laji = 'muu';
  if (koko < 14) laji = 'piste';
  else if (suljettu) laji = 'silmukka';
  else if (yksi && onMaki(eka, { x1, y1, w, h }, kaannoksia)) laji = 'maki';
  else if (yksi && koko >= 60 && w > 1.8 * h && kaannoksia >= 2 && janne / muste > 0.45) laji = 'aalto';
  else if (yksi && koko >= 60 && janne / muste > 0.85) {
    // Suoran viivan kaltevuus vasemmalta oikealle: + = alamäki, − = ylämäki (ruudun y kasvaa alaspäin).
    const [vas, oik] = alku[0] <= loppu[0] ? [alku, loppu] : [loppu, alku];
    const kaltevuus = (Math.atan2(oik[1] - vas[1], oik[0] - vas[0]) * 180) / Math.PI;
    if (Math.abs(kaltevuus) > 70) laji = 'pysty';
    else if (kaltevuus > 20) laji = 'alamaki';
    else if (kaltevuus < -20) laji = 'ylamaki';
    // Pitkä vaakasuora viiva on "maa", jolle piirtäjä piirtää aurinkoa ja puita.
    else laji = w >= 150 && h < 0.27 * w ? 'maa' : 'viiva';
  }
  else if (onRisti(viivat)) laji = 'risti';
  else if (muste / (w + h + 1) > 3) laji = 'sotku';

  // Nuoli tarkistetaan ennen sotkua: varsi ja kärki voivat olla yksi tai useampi veto.
  const osoitin = laji === 'muu' || laji === 'sotku' || laji === 'viiva' ? tunnistaNuoli(viivat) : null;
  if (osoitin) laji = 'osoitin';
  const monikulmio = suljettu ? tunnistaMonikulmio(eka, koko) : null;

  return {
    laji, laatikko: { x1, y1, x2, y2 }, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, w, h, koko, viivat, alku, loppu, suljettu,
    osoitin, monikulmio,
  };
}

// --- apufunktiot tulkintaan ----------------------------------------------------------------------------------

const etaisyysPisteet = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function pituus(v) {
  let L = 0;
  for (let i = 1; i < v.length; i++) L += etaisyysPisteet(v[i], v[i - 1]);
  return L;
}
// Viiva on suora, jos sen päiden etäisyys on lähes sama kuin sen pituus.
const suora = (v, raja = 0.9) => {
  const L = pituus(v);
  return L > 0 && etaisyysPisteet(v[0], v[v.length - 1]) / L > raja;
};

// Mäki: yksi kaari, joka nousee ja laskee kerran (∩). Päät ovat suunnilleen samalla korkeudella alhaalla,
// ja korkein kohta on niiden välissä.
function onMaki(v, { x1, y1, w, h }, kaannoksia) {
  if (w < 50 || kaannoksia !== 1 || h < 0.2 * w || h > 1.3 * w) return false;
  const [a, b] = [v[0], v[v.length - 1]];
  if (a[1] < y1 + 0.6 * h || b[1] < y1 + 0.6 * h || Math.abs(a[1] - b[1]) > 0.4 * h) return false;
  if (Math.abs(a[0] - b[0]) < 0.8 * w) return false;
  const huippu = v.reduce((m, q) => (q[1] < m[1] ? q : m));
  const t = (huippu[0] - x1) / w;
  return t > 0.15 && t < 0.85;
}

// Kaksi suoraa, toisensa leikkaavaa ja eri suuntiin menevää vetoa: X.
function onRisti(viivat) {
  if (viivat.length !== 2) return false;
  const [a, b] = viivat;
  const La = pituus(a), Lb = pituus(b);
  if (La < 24 || Lb < 24 || Math.min(La, Lb) / Math.max(La, Lb) < 0.45 || !suora(a, 0.85) || !suora(b, 0.85)) return false;
  const [p1, p2, p3, p4] = [a[0], a[a.length - 1], b[0], b[b.length - 1]];
  const ristitulo = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const leikkaa = ristitulo(p1, p2, p3) * ristitulo(p1, p2, p4) < 0 && ristitulo(p3, p4, p1) * ristitulo(p3, p4, p2) < 0;
  if (!leikkaa) return false;
  const kulma = Math.abs(Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) - Math.atan2(p4[1] - p3[1], p4[0] - p3[0])) % Math.PI;
  return Math.min(kulma, Math.PI - kulma) > (40 * Math.PI) / 180;
}

// Kahden vedon (päätepisteiden välisten janojen) leikkauspiste tai null.
function leikkauspiste(viivat) {
  if (viivat.length !== 2) return null;
  const [a, b] = viivat;
  const [p1, p2, p3, p4] = [a[0], a[a.length - 1], b[0], b[b.length - 1]];
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (!d) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
}

// Nuoli: suora varsi ja sen toisessa päässä kärki, joka levenee varren molemmin puolin taaksepäin.
// Palauttaa { karki, suunta, pituus } tai null.
function tunnistaNuoli(viivat) {
  const yritykset = [];
  if (viivat.length === 1) {
    // Yksi veto: varsi ensin ja kärki perään, tai kärki ensin ja varsi perään.
    for (const v of [viivat[0], viivat[0].slice().reverse()]) {
      let i = 2;
      while (i < v.length && (pituus(v.slice(0, i + 1)) < 30 || suora(v.slice(0, i + 1), 0.95))) i++;
      yritykset.push({ varsi: v.slice(0, i), karki: [v.slice(i - 1)] });
    }
  } else if (viivat.length <= 3) {
    const jarjestys = viivat.slice().sort((a, b) => pituus(b) - pituus(a));
    yritykset.push({ varsi: jarjestys[0], karki: jarjestys.slice(1) });
  }
  for (const { varsi, karki } of yritykset) {
    const L = pituus(varsi);
    const muste = karki.reduce((s, v) => s + pituus(v), 0);
    if (L < 50 || !suora(varsi) || muste < 0.15 * L || muste > 1.3 * L) continue;
    const pisteet = karki.flat();
    for (const [karkiPiste, hanta] of [[varsi[varsi.length - 1], varsi[0]], [varsi[0], varsi[varsi.length - 1]]]) {
      const raja = Math.min(0.5 * L, 70);
      if (!pisteet.every((q) => etaisyysPisteet(q, karkiPiste) < raja)) continue;
      const j = etaisyysPisteet(karkiPiste, hanta);
      const u = [(karkiPiste[0] - hanta[0]) / j, (karkiPiste[1] - hanta[1]) / j];
      let taakse = 0, vasen = false, oikea = false;
      for (const q of pisteet) {
        const dx = q[0] - karkiPiste[0], dy = q[1] - karkiPiste[1];
        if (dx * u[0] + dy * u[1] < -3) taakse++;
        const sivu = u[0] * dy - u[1] * dx;
        if (sivu > 5) vasen = true;
        if (sivu < -5) oikea = true;
      }
      if (taakse > pisteet.length * 0.5 && vasen && oikea) return { karki: karkiPiste, suunta: u, pituus: L };
    }
  }
  return null;
}

// Suljetun vedon kulmat (Ramer–Douglas–Peucker ja suorien kohtien karsinta).
// Palauttaa { nimi: 'kolmio' | 'suorakulmio', kulmat } tai null.
function tunnistaMonikulmio(viiva, koko) {
  const eps = 0.07 * koko;
  const rdp = (v) => {
    if (v.length < 3) return v;
    const [a, b] = [v[0], v[v.length - 1]];
    const L = etaisyysPisteet(a, b) || 1;
    let suurin = 0, kohta = 0;
    for (let i = 1; i < v.length - 1; i++) {
      const d = Math.abs((b[0] - a[0]) * (a[1] - v[i][1]) - (a[0] - v[i][0]) * (b[1] - a[1])) / L;
      if (d > suurin) { suurin = d; kohta = i; }
    }
    if (suurin <= eps) return [a, b];
    return [...rdp(v.slice(0, kohta + 1)).slice(0, -1), ...rdp(v.slice(kohta))];
  };
  // Aloitetaan kauimmasta pisteestä, jotta alku ei osu keskelle sivua kahdesti.
  const alku = viiva[0];
  let kaukaisin = 0;
  viiva.forEach((q, i) => { if (etaisyysPisteet(q, alku) > etaisyysPisteet(viiva[kaukaisin], alku)) kaukaisin = i; });
  let kulmat = [...rdp(viiva.slice(0, kaukaisin + 1)).slice(0, -1), ...rdp(viiva.slice(kaukaisin))];
  if (etaisyysPisteet(kulmat[0], kulmat[kulmat.length - 1]) < 0.25 * koko) kulmat.pop();
  // Karsitaan kulmat, joissa viiva kääntyy vain vähän tai jotka ovat lähes päällekkäin.
  const kaanto = (k, i) => {
    const a = k[(i - 1 + k.length) % k.length], b = k[i], c = k[(i + 1) % k.length];
    const d = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
    return Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
  };
  let muuttui = true;
  while (muuttui && kulmat.length > 3) {
    muuttui = false;
    for (let i = 0; i < kulmat.length; i++) {
      const seuraava = kulmat[(i + 1) % kulmat.length];
      if (kaanto(kulmat, i) < (35 * Math.PI) / 180 || etaisyysPisteet(kulmat[i], seuraava) < 0.15 * koko) {
        kulmat.splice(i, 1);
        muuttui = true;
        break;
      }
    }
  }
  const aste = (180 / Math.PI);
  if (kulmat.length === 3 && kulmat.every((_, i) => 180 - kaanto(kulmat, i) * aste > 20)) return { nimi: 'kolmio', kulmat };
  if (kulmat.length === 4 && kulmat.every((_, i) => Math.abs(180 - kaanto(kulmat, i) * aste - 90) < 25)) return { nimi: 'suorakulmio', kulmat };
  return null;
}

// --- muodon tunnistus (matkija) ----------------------------------------------------------------------------
// Verrataan kävijän piirrosta malleihin pistepilvinä: molemmat skaalataan samaan ruutuun, ja etäisyys on
// pisteiden keskimääräinen etäisyys lähimpään vastinpisteeseen. Ei riipu siitä, mistä tai mihin suuntaan
// kävijä aloitti. Mallit (tähti, sydän ja vertailuksi ympyrä) näytteistää doodle.js.

function normalisoi(pisteet, n = 40) {
  const k = [0];
  for (let i = 1; i < pisteet.length; i++) k.push(k[i - 1] + Math.hypot(pisteet[i][0] - pisteet[i - 1][0], pisteet[i][1] - pisteet[i - 1][1]));
  const L = k[k.length - 1] || 1;
  const tasan = [];
  let j = 1;
  for (let i = 0; i < n; i++) {
    const m = (L * i) / n;
    while (j < k.length - 1 && k[j] < m) j++;
    const t = k[j] === k[j - 1] ? 0 : (m - k[j - 1]) / (k[j] - k[j - 1]);
    tasan.push([pisteet[j - 1][0] + (pisteet[j][0] - pisteet[j - 1][0]) * t, pisteet[j - 1][1] + (pisteet[j][1] - pisteet[j - 1][1]) * t]);
  }
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const [x, y] of tasan) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
  const s = Math.max(x2 - x1, y2 - y1) || 1;
  return tasan.map(([x, y]) => [(x - (x1 + x2) / 2) / s, (y - (y1 + y2) / 2) / s]);
}

function etaisyys(a, b) {
  const yksisuuntainen = (p, q) => p.reduce((sum, [x, y]) => sum + Math.min(...q.map(([u, v]) => Math.hypot(x - u, y - v))), 0) / p.length;
  return (yksisuuntainen(a, b) + yksisuuntainen(b, a)) / 2;
}

// mallit: { nimi: pistelista }. Palauttaa tunnistetun muodon nimen tai null.
export function tunnista(p, mallit) {
  if (!p.suljettu || p.koko < 30) return null;
  const oma = normalisoi(p.viivat[0]);
  const tulokset = Object.entries(mallit)
    .map(([nimi, pisteet]) => ({ nimi, d: etaisyys(oma, normalisoi(pisteet)) }))
    .sort((a, b) => a.d - b.d);
  const paras = tulokset[0];
  if (paras.nimi === 'ympyrä' || paras.d > 0.06) return null;
  return paras.nimi;
}

// --- vastaukset --------------------------------------------------------------------------------------------

const VASTAUKSET = {
  // Silmät ja hymy suljetun muodon sisään.
  kasvot(p) {
    if (p.koko < 40) return null;
    const { cx, cy, w, h } = p;
    const sx = w * 0.18, sy = h * 0.12, s = Math.max(4, h * 0.07);
    return [
      { d: `M${f(cx - sx)} ${f(cy - sy - s)} L${f(cx - sx)} ${f(cy - sy + s)}` },
      { d: `M${f(cx + sx)} ${f(cy - sy - s)} L${f(cx + sx)} ${f(cy - sy + s)}` },
      { d: `M${f(cx - w * 0.22)} ${f(cy + h * 0.1)} Q${f(cx)} ${f(cy + h * 0.32)} ${f(cx + w * 0.22)} ${f(cy + h * 0.1)}` },
    ];
  },
  // Kissan korvat päälle ja kasvot sisään.
  kissa(p) {
    if (p.koko < 50) return null;
    const { cx, w, h } = p;
    const yla = p.laatikko.y1 + h * 0.06;
    const k = Math.min(w, h) * 0.32;
    const korva = (suunta) => {
      const a = cx + suunta * w * 0.38;
      const b = cx + suunta * w * 0.12;
      return { d: `M${f(a)} ${f(yla + k * 0.25)} L${f((a + b) / 2 + suunta * k * 0.15)} ${f(yla - k)} L${f(b)} ${f(yla)}` };
    };
    const kasvot = VASTAUKSET.kasvot(p) || [];
    return [korva(-1), korva(1), ...kasvot.slice(0, 2), { d: `M${f(cx - 5)} ${f(p.cy + 2)} L${f(cx)} ${f(p.cy + 6)} L${f(cx + 5)} ${f(p.cy + 2)}` }];
  },
  // Auringon säteet ympärille.
  aurinko(p) {
    if (p.koko < 30 || p.koko > 260) return null;
    const rx = p.w / 2 + 9, ry = p.h / 2 + 9, pit = Math.max(12, p.koko * 0.18);
    const osat = [];
    const alku = satunnainen(0, Math.PI / 4);
    for (let i = 0; i < 8; i++) {
      const a = alku + (i * Math.PI) / 4;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      osat.push({ d: `M${f(p.cx + c * rx)} ${f(p.cy + s * ry)} L${f(p.cx + c * (rx + pit))} ${f(p.cy + s * (ry + pit))}` });
    }
    return osat;
  },
  // Nuolenkärki viivan loppupäähän.
  nuoli(p) {
    const v = p.viivat[0];
    const [ex, ey] = p.loppu;
    let i = v.length - 1;
    while (i > 0 && Math.hypot(v[i][0] - ex, v[i][1] - ey) < 16) i--;
    const kulma = Math.atan2(ey - v[i][1], ex - v[i][0]);
    const pit = 16;
    const kyljet = [kulma + Math.PI * 0.82, kulma - Math.PI * 0.82].map((a) => [ex + Math.cos(a) * pit, ey + Math.sin(a) * pit]);
    return [{ d: `M${f(kyljet[0][0])} ${f(kyljet[0][1])} L${f(ex)} ${f(ey)} L${f(kyljet[1][0])} ${f(kyljet[1][1])}` }];
  },
  // Etana kävelee viivalla.
  etana(p) {
    const v = p.viivat[0];
    const k = Math.floor(v.length / 2);
    const [ax, ay] = v[Math.max(0, k - 3)];
    const [bx, by] = v[Math.min(v.length - 1, k + 3)];
    let kulma = Math.atan2(by - ay, bx - ax);
    if (kulma > Math.PI / 2) kulma -= Math.PI;
    if (kulma < -Math.PI / 2) kulma += Math.PI;
    const koko = 58;
    // Etanan kuvassa "maa" on y = 86, eli 36 % koon verran keskikohdan alapuolella.
    const nx = Math.sin(kulma), ny = -Math.cos(kulma);
    const [mx, my] = v[k];
    const nosto = koko * 0.36 + 3;
    return [{ kuva: kuva('etana'), cx: mx + nx * nosto, cy: my + ny * nosto, koko, kulma }];
  },
  // Opettajan ympyrä ja 10/10.
  kymppi(p) {
    const osat = [ympyroi(p)];
    const oikealle = p.laatikko.x2 + 18;
    osat.push({ kuva: SANAT.kymppi, cx: oikealle + 36, cy: p.laatikko.y1 + 4, koko: 32, kulma: -0.12 });
    return osat;
  },
  vau(p) {
    return [{ kuva: SANAT.vau, cx: p.cx, cy: p.laatikko.y1 - 34, koko: 40, kulma: satunnainen(-0.12, 0.12) }];
  },
  // Puhekupla ja kysymysmerkki pisteen viereen.
  kysymys(p) {
    const x = p.cx + 18, y = p.cy - 62, lev = 46, kor = 40;
    const kupla =
      `M${f(x + 8)} ${f(y)} L${f(x + lev - 8)} ${f(y)} Q${f(x + lev)} ${f(y)} ${f(x + lev)} ${f(y + 8)} ` +
      `L${f(x + lev)} ${f(y + kor - 8)} Q${f(x + lev)} ${f(y + kor)} ${f(x + lev - 8)} ${f(y + kor)} ` +
      `L${f(x + 16)} ${f(y + kor)} L${f(p.cx + 6)} ${f(p.cy - 8)} L${f(x + 8)} ${f(y + kor)} ` +
      `Q${f(x)} ${f(y + kor)} ${f(x)} ${f(y + kor - 8)} L${f(x)} ${f(y + 8)} Q${f(x)} ${f(y)} ${f(x + 8)} ${f(y)} Z`;
    return [{ d: kupla }, { kuva: SANAT.kysymys, cx: x + lev / 2, cy: y + kor / 2, koko: 26, kulma: 0 }];
  },
  // Pieniä tähtiä piirroksen ympärille.
  tahdet(p) {
    const tahti = kuva('tähti');
    const kulmat = [[-1, -1], [1, -1], [1, 1], [-1, 1]].sort(() => Math.random() - 0.5).slice(0, 3);
    return kulmat.map(([sx, sy]) => ({
      kuva: tahti,
      cx: p.cx + sx * (p.w / 2 + satunnainen(14, 26)),
      cy: p.cy + sy * (p.h / 2 + satunnainen(10, 22)),
      koko: satunnainen(26, 34),
      kulma: satunnainen(-0.3, 0.3),
    }));
  },
};

function ympyroi(p) {
  const rx = p.w / 2 + 14, ry = p.h / 2 + 12;
  const askelia = 40;
  const alku = satunnainen(-2.6, -2.2);
  let d = '';
  for (let i = 0; i <= askelia; i++) {
    const a = alku + (i / askelia) * Math.PI * 2.12; // vähän yli kierroksen, kuten käsin
    const r = 1 + 0.04 * Math.sin(i * 0.5);
    d += `${i ? 'L' : 'M'}${f(p.cx + Math.cos(a) * rx * r)} ${f(p.cy + Math.sin(a) * ry * r)} `;
  }
  return { d: d.trim() };
}

// Kävijän viivan y-koordinaatti kohdassa x (lähin piste).
function viivanY(viiva, x) {
  let paras = viiva[0];
  for (const q of viiva) if (Math.abs(q[0] - x) < Math.abs(paras[0] - x)) paras = q;
  return paras[1];
}

const PUU = {
  nimi: 'puu',
  leveys: 100,
  viivat: [
    'M45 96 L46 64', 'M55 96 L54 64',
    'M46 64 Q24 66 26 46 Q22 26 40 22 Q50 6 64 18 Q82 20 78 42 Q84 62 54 64',
  ],
};

Object.assign(VASTAUKSET, {
  // Paperivene seilaa aaltoviivalla.
  vene(p) {
    const vene = kuva('paperivene');
    const koko = 56;
    const x = p.cx + satunnainen(-0.2, 0.2) * p.w;
    // Veneen pohja on kuvassa y = 74, eli 24 % koosta keskikohdan alapuolella.
    const y = viivanY(p.viivat[0], x) - 0.24 * koko - 2;
    return [{ kuva: { ...vene, viivat: vene.viivat.slice(0, 2) }, cx: x, cy: y, koko, kulma: satunnainen(-0.08, 0.08) }];
  },
  // Taulun kehys, naula ja naru isomman piirroksen ympärille.
  kehys(p) {
    if (p.viivat.length < 3 || p.koko < 70) return null;
    const r = 16;
    const x1 = p.laatikko.x1 - r, y1 = p.laatikko.y1 - r, x2 = p.laatikko.x2 + r, y2 = p.laatikko.y2 + r;
    const naula = [p.cx, y1 - 24];
    return [
      { d: `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x1)} ${f(y2)} Z` },
      { d: `M${f(x1 + 7)} ${f(y1 + 7)} L${f(x2 - 7)} ${f(y1 + 7)} L${f(x2 - 7)} ${f(y2 - 7)} L${f(x1 + 7)} ${f(y2 - 7)} Z` },
      { d: `M${f(x1 + p.w * 0.2)} ${f(y1)} L${f(naula[0])} ${f(naula[1])} L${f(x2 - p.w * 0.2)} ${f(y1)}` },
      { d: `M${f(naula[0] - 3)} ${f(naula[1] - 3)} L${f(naula[0] + 3)} ${f(naula[1] + 3)}` },
    ];
  },
  // Aurinko ja puita "maan" päälle.
  maisema(p) {
    const v = p.viivat[0];
    const vasen = p.laatikko.x1, lev = p.w;
    const puolet = Math.random() < 0.5;
    const auringonX = vasen + lev * (puolet ? 0.78 : 0.22);
    const osat = [{ kuva: kuva('aurinko'), cx: auringonX, cy: viivanY(v, auringonX) - 150, koko: 66, kulma: 0 }];
    const puut = lev > 260 ? [0.3, 0.48] : [0.42];
    for (const t of puut) {
      const x = vasen + lev * (puolet ? t : 1 - t);
      const koko = satunnainen(80, 100);
      // Puun juuret ovat kuvassa y = 96.
      osat.push({ kuva: PUU, cx: x, cy: viivanY(v, x) - 0.46 * koko + 1, koko, kulma: 0 });
    }
    return osat;
  },
  // Naru ja rusetti pienen silmukan alle: siitä tulee ilmapallo.
  ilmapallo(p) {
    if (p.koko > 110) return null;
    const x = p.cx, y = p.laatikko.y2;
    return [
      { d: `M${f(x - 5)} ${f(y + 7)} L${f(x)} ${f(y + 1)} L${f(x + 5)} ${f(y + 7)} Z` },
      { d: `M${f(x)} ${f(y + 7)} Q${f(x - 9)} ${f(y + 26)} ${f(x)} ${f(y + 44)} Q${f(x + 9)} ${f(y + 62)} ${f(x)} ${f(y + 80)}` },
    ];
  },
  // Kävijä piirsi tähden tai sydämen: piirtäjä piirtää pienen samanlaisen viereen.
  matkija(p) {
    if (!p.muoto) return null;
    const koko = Math.max(28, Math.min(54, p.koko * 0.55));
    const oikealle = Math.random() < 0.5 ? 1 : -1;
    const x = oikealle > 0 ? p.laatikko.x2 + 14 + koko / 2 : p.laatikko.x1 - 14 - koko / 2;
    return [{ kuva: kuva(p.muoto), cx: x, cy: p.cy + satunnainen(-0.2, 0.2) * p.h, koko, kulma: satunnainen(-0.25, 0.25) }];
  },
});

// Kävijän suoran viivan päät: yläpää ja alapää, sekä piste viivalla osuuden t kohdalla yläpäästä.
function rinne(p) {
  const v = p.viivat[0];
  const [yla, ala] = p.alku[1] <= p.loppu[1] ? [p.alku, p.loppu] : [p.loppu, p.alku];
  const L = etaisyysPisteet(yla, ala);
  const u = [(ala[0] - yla[0]) / L, (ala[1] - yla[1]) / L]; // alamäen suunta
  // Normaali, joka osoittaa ylöspäin (viivan "yläpuolelle").
  let n = [-u[1], u[0]];
  if (n[1] > 0) n = [-n[0], -n[1]];
  const kohta = (t) => {
    const x = yla[0] + (ala[0] - yla[0]) * t, y = yla[1] + (ala[1] - yla[1]) * t;
    let paras = v[0];
    for (const q of v) if (Math.hypot(q[0] - x, q[1] - y) < Math.hypot(paras[0] - x, paras[1] - y)) paras = q;
    return paras;
  };
  return { yla, ala, L, u, n, kohta };
}

// Loppupiste hieman alun yläpuolella, jotta kaari piirtyy täytenä ympyränä (pyöristys ei saa yhdistää niitä).
const ympyraPolku = (cx, cy, r) => `M${f(cx + r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 1 ${f(cx + r)} ${f(cy - 0.2)}`;
const lippu = (x, y, suunta) =>
  [{ d: `M${f(x)} ${f(y)} L${f(x)} ${f(y - 36)}` }, { d: `M${f(x)} ${f(y - 36)} L${f(x + suunta * 20)} ${f(y - 30)} L${f(x)} ${f(y - 24)}` }];

Object.assign(VASTAUKSET, {
  // Alamäki: pallo vierii alas vauhtiviivojen kanssa, ja vieressä lukee "jeee!".
  pallo(p) {
    const { u, n, kohta } = rinne(p);
    const r = 9;
    const [px, py] = kohta(0.68);
    const c = [px + n[0] * (r + 2), py + n[1] * (r + 2)];
    const osat = [{ d: ympyraPolku(c[0], c[1], r) }];
    for (const [o, pit] of [[-4, 16], [1, 24], [6, 14]]) {
      const ax = c[0] - u[0] * (r + 6) + n[0] * o, ay = c[1] - u[1] * (r + 6) + n[1] * o;
      osat.push({ d: `M${f(ax)} ${f(ay)} L${f(ax - u[0] * pit)} ${f(ay - u[1] * pit)}` });
    }
    osat.push({ kuva: SANAT.jeee, cx: c[0] + n[0] * 30 + u[0] * 6, cy: c[1] - 30, koko: 32, kulma: satunnainen(-0.1, 0.1) });
    return osat;
  },
  // Ylämäki: tikku-ukko kiipeää viivaa ylös, ja yläpäässä on lippu.
  kiipeilija(p) {
    const { yla, u, kohta } = rinne(p);
    const s = Math.sign(yla[0] - p.cx) || 1; // ylämäen suunta vaakatasossa
    const [px, py] = kohta(0.5);
    const m = 1.4; // ukon koko
    const jalka = (k) => [px - u[0] * 7 * m * k, py - u[1] * 7 * m * k - 1];
    const [j1, j2] = [jalka(1), jalka(-1)];
    const lantio = [px + s * 3 * m, py - 18 * m];
    const kaula = [lantio[0] + s * 6 * m, lantio[1] - 15 * m];
    const paa = [kaula[0] + s * 2 * m, kaula[1] - 7 * m];
    return [
      { d: `M${f(j1[0])} ${f(j1[1])} L${f(lantio[0])} ${f(lantio[1])} L${f(j2[0])} ${f(j2[1])}` },
      { d: `M${f(lantio[0])} ${f(lantio[1])} L${f(kaula[0])} ${f(kaula[1])}` },
      { d: ympyraPolku(paa[0], paa[1], 6 * m) },
      { d: `M${f(kaula[0] - s * 9 * m)} ${f(kaula[1] + 9 * m)} L${f(kaula[0])} ${f(kaula[1])} L${f(kaula[0] + s * 11 * m)} ${f(kaula[1] - 6 * m)}` },
      ...lippu(yla[0], yla[1] - 1, s),
    ];
  },
  // Pystysuora viiva: kukan varsi. Kukka päähän ja lehdet sivuille.
  kukkavarsi(p) {
    const { yla, L, kohta } = rinne(p);
    const k = Math.max(0.7, Math.min(1.2, L / 120));
    const c = [yla[0], yla[1] - 21 * k];
    const osat = [{ d: ympyraPolku(c[0], c[1], 6 * k) }];
    // Terälehdet yhtenä yhtenäisenä viivana: pyöreä kaari kärjestä toiseen, ja lehtien välissä kolo lähellä keskustaa.
    const alku = (satunnainen(0, 72) * Math.PI) / 180;
    const piste = (r, a) => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
    const kolo = (i) => piste(8 * k, alku + ((i - 0.5) * 2 * Math.PI) / 5);
    let terat = `M${f(kolo(0)[0])} ${f(kolo(0)[1])}`;
    for (let i = 0; i < 5; i++) {
      const a = alku + (i * 2 * Math.PI) / 5;
      const [c1, c2, loppu] = [piste(31 * k, a - 0.62), piste(31 * k, a + 0.62), kolo(i + 1)];
      terat += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(loppu[0])} ${f(loppu[1])}`;
    }
    osat.push({ d: terat });
    for (const [t, s] of [[0.55, -1], [0.75, 1]]) {
      const [x, y] = kohta(t);
      osat.push({ d: `M${f(x)} ${f(y)} Q${f(x + s * 10 * k)} ${f(y - 18 * k)} ${f(x + s * 26 * k)} ${f(y - 16 * k)} Q${f(x + s * 20 * k)} ${f(y - 2 * k)} ${f(x)} ${f(y)}` });
    }
    return osat;
  },
  // X: katkoviivapolku kompassilta aarteen luo.
  aarre(p) {
    const kulma = satunnainen(0, Math.PI * 2);
    const D = 150 + p.koko / 2;
    const k = [p.cx + Math.cos(kulma) * D, p.cy + Math.sin(kulma) * D];
    const osat = [
      { d: ympyraPolku(k[0], k[1], 15) },
      { d: `M${f(k[0])} ${f(k[1] - 12)} L${f(k[0] + 4)} ${f(k[1] - 4)} L${f(k[0] + 12)} ${f(k[1])} L${f(k[0] + 4)} ${f(k[1] + 4)} L${f(k[0])} ${f(k[1] + 12)} L${f(k[0] - 4)} ${f(k[1] + 4)} L${f(k[0] - 12)} ${f(k[1])} L${f(k[0] - 4)} ${f(k[1] - 4)} Z` },
      { d: `M${f(k[0] - 4)} ${f(k[1] - 22)} L${f(k[0] - 4)} ${f(k[1] - 32)} L${f(k[0] + 4)} ${f(k[1] - 22)} L${f(k[0] + 4)} ${f(k[1] - 32)}` },
    ];
    // Kaareva polku kompassin reunasta X:n reunaan.
    const ux = (p.cx - k[0]) / D, uy = (p.cy - k[1]) / D;
    // Polku alkaa kompassin reunasta, ja ylöspäin lähtiessä N-kirjaimen yläpuolelta.
    const alkuun = 22 + Math.max(0, -uy) * 16;
    const a = [k[0] + ux * alkuun, k[1] + uy * alkuun];
    // Polku päättyy X:n viivojen leikkauskohtaan.
    const b = leikkauspiste(p.viivat) || [p.cx, p.cy];
    const taivutus = satunnainen(30, 50) * (Math.random() < 0.5 ? 1 : -1);
    const c = [(a[0] + b[0]) / 2 - uy * taivutus, (a[1] + b[1]) / 2 + ux * taivutus];
    const piste = (t) => [
      (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
      (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
    ];
    const katkoja = Math.max(5, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 18));
    for (let i = 0; i < katkoja; i++) {
      // Viimeinen katko päättyy täsmälleen leikkauskohtaan.
      const [s, e] = [piste((i + 0.45) / katkoja), piste((i + 1) / katkoja)];
      osat.push({ d: `M${f(s[0])} ${f(s[1])} L${f(e[0])} ${f(e[1])}` });
    }
    return osat;
  },
  // Kolmio kärki ylöspäin: vuori, jolla on lumihuippu ja lippu.
  vuori(p) {
    if (p.monikulmio?.nimi !== 'kolmio') return null;
    const k = p.monikulmio.kulmat.slice().sort((a, b) => a[1] - b[1]);
    const [huippu, ...juuret] = k;
    if (juuret.some((q) => q[1] < huippu[1] + 0.4 * p.h)) return null;
    const [vas, oik] = juuret.sort((a, b) => a[0] - b[0]);
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const A = lerp(huippu, vas, 0.33), B = lerp(huippu, oik, 0.33);
    const z = [A, ...[0.25, 0.5, 0.75].map((t, i) => { const q = lerp(A, B, t); return [q[0], q[1] + (i === 1 ? 1 : 9)]; }), B];
    return [{ d: 'M' + z.map((q) => `${f(q[0])} ${f(q[1])}`).join(' L') }, ...lippu(huippu[0], huippu[1] - 2, 1)];
  },
  // Suorakulmio: lahjapaketti, jossa on nauha ja rusetti.
  lahja(p) {
    if (p.monikulmio?.nimi !== 'suorakulmio') return null;
    const { x1, y1, x2, y2 } = p.laatikko;
    const { cx, cy } = p;
    const b = Math.max(12, Math.min(26, p.w * 0.22));
    return [
      { d: `M${f(cx - 4)} ${f(y1)} L${f(cx - 4)} ${f(y2)}` },
      { d: `M${f(cx + 4)} ${f(y1)} L${f(cx + 4)} ${f(y2)}` },
      { d: `M${f(x1)} ${f(cy - 4)} L${f(x2)} ${f(cy - 4)}` },
      { d: `M${f(x1)} ${f(cy + 4)} L${f(x2)} ${f(cy + 4)}` },
      { d: `M${f(cx)} ${f(y1)} Q${f(cx - 1.6 * b)} ${f(y1 - 1.3 * b)} ${f(cx - 1.1 * b)} ${f(y1 - 0.1 * b)} Q${f(cx - 0.6 * b)} ${f(y1 + 0.2 * b)} ${f(cx)} ${f(y1)}` },
      { d: `M${f(cx)} ${f(y1)} Q${f(cx + 1.6 * b)} ${f(y1 - 1.3 * b)} ${f(cx + 1.1 * b)} ${f(y1 - 0.1 * b)} Q${f(cx + 0.6 * b)} ${f(y1 + 0.2 * b)} ${f(cx)} ${f(y1)}` },
    ];
  },
  // Kävijän nuoli: maalitaulu sinne, minne nuoli osoittaa.
  maalitaulu(p) {
    if (!p.osoitin) return null;
    const { karki, suunta, pituus: L } = p.osoitin;
    const R = Math.max(22, Math.min(36, L * 0.35));
    const c = [karki[0] + suunta[0] * (R + 8), karki[1] + suunta[1] * (R + 8)];
    return [{ d: ympyraPolku(c[0], c[1], R) }, { d: ympyraPolku(c[0], c[1], R * 0.62) }, { d: ympyraPolku(c[0], c[1], R * 0.24) }];
  },
});

// Mäen huippu, juuren korkeus ja mäen pinnan korkeus kohdassa x.
function maki(p) {
  const v = p.viivat[0];
  const huippu = v.reduce((m, q) => (q[1] < m[1] ? q : m));
  const pohja = Math.max(p.alku[1], p.loppu[1]);
  return { v, huippu, pohja, pinta: (x) => viivanY(v, x) };
}

// Lammas: kiharainen villa, pää alhaalla syömässä ja neljä jalkaa maassa.
function lammas(x, pinta, suunta) {
  const m = 1.6; // lampaan koko
  const maa = pinta(x);
  const c = [x, maa - 20 * m];
  let villa = '';
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const r = 1 + 0.1 * Math.abs(Math.sin(a * 4));
    villa += `${i ? 'L' : 'M'}${f(c[0] + Math.cos(a) * 15 * m * r)} ${f(c[1] + Math.sin(a) * 10 * m * r)} `;
  }
  const paa = [c[0] + suunta * 17 * m, c[1] + 6 * m];
  const osat = [
    { d: villa.trim() },
    { d: `M${f(paa[0] + 6 * m)} ${f(paa[1])} A${f(6 * m)} ${f(4.5 * m)} 0 1 1 ${f(paa[0] + 6 * m)} ${f(paa[1] - 0.2)}` },
    { d: `M${f(paa[0] - suunta * 2 * m)} ${f(paa[1] - 4 * m)} L${f(paa[0] - suunta * 7 * m)} ${f(paa[1] - 9 * m)}` },
  ];
  for (const dx of [-9, -4, 4, 9]) {
    const jx = c[0] + dx * m;
    osat.push({ d: `M${f(jx)} ${f(c[1] + 8 * m)} L${f(jx)} ${f(pinta(jx))}` });
  }
  return osat;
}

Object.assign(VASTAUKSET, {
  // Mökki mäen päälle, savua piipusta.
  mokki(p) {
    if (p.w < 70) return null;
    const { huippu } = maki(p);
    const koko = Math.max(36, Math.min(60, p.w * 0.3));
    const s = koko / 100;
    const cx = huippu[0], cy = huippu[1] - 0.44 * koko + 2; // talon pohja on kuvassa y = 94
    const [sx, sy] = [cx + 20 * s, cy - 34 * s]; // piipun yläpää
    const savu = `M${f(sx)} ${f(sy - 3)} Q${f(sx - 7)} ${f(sy - 11)} ${f(sx)} ${f(sy - 18)} Q${f(sx + 7)} ${f(sy - 25)} ${f(sx + 1)} ${f(sy - 32)} Q${f(sx - 5)} ${f(sy - 38)} ${f(sx + 3)} ${f(sy - 44)}`;
    return [{ kuva: kuva('talo'), cx, cy, koko, kulma: 0 }, { d: savu }];
  },
  // Puu mäen päälle ja lammas rinteelle.
  puulammas(p) {
    if (p.w < 90) return null;
    const { huippu, pinta } = maki(p);
    const koko = Math.max(60, Math.min(90, p.w * 0.4));
    const puoli = Math.random() < 0.5 ? -1 : 1;
    const lx = huippu[0] + puoli * Math.max(40, (puoli > 0 ? p.laatikko.x2 - huippu[0] : huippu[0] - p.laatikko.x1) * 0.6);
    return [
      { kuva: PUU, cx: huippu[0], cy: huippu[1] - 0.46 * koko + 2, koko, kulma: 0 },
      ...lammas(lx, pinta, puoli),
    ];
  },
  // Tunnelin suu mäen juurelle ja pieni juna tulossa ulos.
  tunneli(p) {
    if (p.w < 80) return null;
    const { pohja, pinta } = maki(p);
    const puoli = Math.random() < 0.5 ? -1 : 1; // kummalle puolelle juna tulee
    const r = Math.max(9, Math.min(15, p.h * 0.22));
    const reuna = puoli < 0 ? p.laatikko.x1 : p.laatikko.x2;
    // Tunnelin paikka: ensimmäinen kohta reunasta sisäänpäin, jossa koko tunnelin suu mahtuu mäen sisään.
    let tx = reuna - puoli * (r + 4);
    const mahtuu = (x) => pohja - pinta(x - r) >= 1.6 * r + 14 && pohja - pinta(x + r) >= 1.6 * r + 14;
    while (Math.abs(tx - reuna) < p.w / 2 && !mahtuu(tx)) tx -= puoli * 3;
    if (!mahtuu(tx)) return null;
    const osat = [{ d: `M${f(tx - r)} ${f(pohja)} L${f(tx - r)} ${f(pohja - r * 0.6)} A${f(r)} ${f(r)} 0 0 1 ${f(tx + r)} ${f(pohja - r * 0.6)} L${f(tx + r)} ${f(pohja)}` }];
    // Kiskot tunnelista ulos ja veturi niiden päällä.
    const ulos = tx + puoli * r;
    osat.push({ d: `M${f(ulos)} ${f(pohja)} L${f(reuna + puoli * 100)} ${f(pohja)}` });
    const m = 1.3; // veturin koko
    // Veturi on juuri ulkona mäen juurelta, ettei se peitä rinnettä, ja kulkee poispäin tunnelista.
    const taka = (puoli < 0 ? Math.min(ulos, p.laatikko.x1) : Math.max(ulos, p.laatikko.x2)) + puoli * 6;
    const etu = taka + puoli * 56 * m;
    const y = pohja - 6 * m;
    osat.push(
      { d: `M${f(taka)} ${f(y)} L${f(taka)} ${f(y - 26 * m)} L${f(taka + puoli * 16 * m)} ${f(y - 26 * m)} L${f(taka + puoli * 16 * m)} ${f(y - 15 * m)} L${f(etu)} ${f(y - 15 * m)} L${f(etu)} ${f(y)} Z` },
      { d: `M${f(etu - puoli * 12 * m)} ${f(y - 15 * m)} L${f(etu - puoli * 12 * m)} ${f(y - 24 * m)} L${f(etu - puoli * 6 * m)} ${f(y - 24 * m)} L${f(etu - puoli * 6 * m)} ${f(y - 15 * m)}` },
      { d: `M${f(taka + puoli * 4 * m)} ${f(y - 22 * m)} L${f(taka + puoli * 12 * m)} ${f(y - 22 * m)} L${f(taka + puoli * 12 * m)} ${f(y - 17 * m)} L${f(taka + puoli * 4 * m)} ${f(y - 17 * m)} Z` },
    );
    for (const t of [0.18, 0.5, 0.82]) {
      const wx = taka + (etu - taka) * t;
      osat.push({ d: ympyraPolku(wx, y + 1, 5 * m) });
    }
    return osat;
  },
  // Pieni mäki on myyränkeko: myyrä kurkistaa huipulta.
  myyra(p) {
    if (p.w > 160) return null;
    const { huippu, pinta } = maki(p);
    const r = Math.max(10, Math.min(17, p.w * 0.14));
    const [x, y] = [huippu[0], huippu[1] + 2];
    const osat = [
      { d: `M${f(x - r)} ${f(pinta(x - r))} Q${f(x - r * 1.05)} ${f(y - r * 1.7)} ${f(x)} ${f(y - r * 1.75)} Q${f(x + r * 1.05)} ${f(y - r * 1.7)} ${f(x + r)} ${f(pinta(x + r))}` },
      { d: `M${f(x - r * 0.4)} ${f(y - r * 1.15)} L${f(x - r * 0.4)} ${f(y - r * 1.0)}` },
      { d: `M${f(x + r * 0.4)} ${f(y - r * 1.15)} L${f(x + r * 0.4)} ${f(y - r * 1.0)}` },
      { d: ympyraPolku(x, y - r * 0.7, r * 0.2) },
    ];
    // Kaksi tassua, kummassakin kolme kynttä, mäen pinnalla pään vieressä.
    for (const s of [-1, 1]) {
      const px = x + s * r * 1.55, py = pinta(px);
      for (const k of [-1, 0, 1]) osat.push({ d: `M${f(px - s * 2)} ${f(py - 1)} L${f(px + s * 3 + k * 3)} ${f(py - 7)}` });
    }
    return osat;
  },
});

// Mitkä vastaukset sopivat millekin piirrokselle, suosituimmuusjärjestyksessä (satunnaistetaan doodle.js:ssä).
const SOPIVAT = {
  silmukka: ['kasvot', 'kissa', 'aurinko', 'ilmapallo'],
  viiva: ['etana', 'nuoli'],
  maa: ['maisema'],
  aalto: ['vene'],
  sotku: ['kymppi', 'vau'],
  piste: ['kysymys'],
  muu: ['tahdet', 'vau', 'kymppi', 'kehys'],
  alamaki: ['pallo'],
  ylamaki: ['kiipeilija'],
  pysty: ['kukkavarsi'],
  risti: ['aarre'],
  osoitin: ['maalitaulu'],
  maki: ['mokki', 'puulammas', 'tunneli', 'myyra'],
};
// Jos mikään sopiva ei mahdu, kokeillaan näitä.
const VARAT = {
  maa: ['etana', 'nuoli'], aalto: ['tahdet'], alamaki: ['etana', 'nuoli'], ylamaki: ['etana', 'nuoli'], pysty: ['nuoli'],
};
// Näitä kokeillaan useamman kerran, koska ne arpovat paikkansa (esim. kompassin suunta).
const YRITYKSET = { aarre: 6 };

// Nämä vastaukset piirretään korkeintaan kerran sivun latauksen aikana.
const KERRAN = ['vau'];

// Palauttaa ehdokkaat [{ nimi, osat }] siinä järjestyksessä kuin niitä kannattaa kokeilla.
export function ehdokkaat(p, edellinen, kaytetyt = new Set()) {
  const nimet = SOPIVAT[p.laji].slice().sort(() => Math.random() - 0.5);
  // Ei samaa vastausta kahdesti peräkkäin, jos muutakin on tarjolla.
  nimet.sort((a, b) => (a === edellinen) - (b === edellinen));
  // Moniviivainen iso piirros saa useimmiten kehyksen.
  if (p.laji === 'muu' && p.viivat.length >= 3 && p.koko >= 70 && edellinen !== 'kehys' && Math.random() < 0.6) nimet.unshift('kehys');
  // Tunnistettu tähti tai sydän: matkija ensin.
  if (p.muoto) nimet.unshift('matkija');
  // Kolmiosta tulee vuori ja suorakulmiosta lahja.
  if (p.monikulmio?.nimi === 'kolmio') nimet.unshift('vuori');
  if (p.monikulmio?.nimi === 'suorakulmio') nimet.unshift('lahja');
  nimet.push(...(VARAT[p.laji] || []));
  if (!nimet.includes('tahdet') && p.laji !== 'piste') nimet.push('tahdet');
  return [...new Set(nimet)]
    .filter((nimi) => !(KERRAN.includes(nimi) && kaytetyt.has(nimi)))
    .flatMap((nimi) => Array.from({ length: YRITYKSET[nimi] || 1 }, () => ({ nimi, osat: VASTAUKSET[nimi](p) })))
    .filter((e) => e.osat && e.osat.length);
}

// Sydän piirtäjän oman kuvan ja kävijän piirroksen väliin.
export function sydanValiin(p, oma) {
  const cx = (p.cx + oma.cx) / 2, cy = (p.cy + oma.cy) / 2;
  return { nimi: 'sydän', osat: [{ kuva: kuva('sydän'), cx, cy, koko: 34, kulma: satunnainen(-0.2, 0.2) }] };
}

export const KIITOS = SANAT.kiitos;
