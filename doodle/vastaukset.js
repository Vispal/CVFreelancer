// Vaihe 3: piirtäjä vastaa kävijän piirrokseen. Tämä tiedosto vain päättää, mitä piirretään ja mihin.
// Piirtäminen, käsialan heilunta ja paikan tarkistus (kortit, ruudun reunat) tehdään doodle.js:ssä.
//
// Vastaus on lista osia, jotka ovat joko
//   { d }                               SVG-polku suoraan näytön koordinaateissa, tai
//   { kuva, cx, cy, koko, kulma }       kuva tai sana kirjastosta (shapes.js), keskitettynä pisteeseen.
import { SHAPES, SANAT } from './shapes.js';

const kuva = (nimi) => SHAPES.find((s) => s.nimi === nimi);
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
  else if (yksi && koko >= 60 && w > 1.8 * h && kaannoksia >= 2 && janne / muste > 0.45) laji = 'aalto';
  else if (yksi && koko >= 60 && janne / muste > 0.85) {
    // Pitkä vaakasuora viiva on "maa", jolle piirtäjä piirtää aurinkoa ja puita.
    laji = w >= 150 && h < 0.27 * w ? 'maa' : 'viiva';
  }
  else if (muste / (w + h + 1) > 3) laji = 'sotku';

  return { laji, laatikko: { x1, y1, x2, y2 }, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, w, h, koko, viivat, alku, loppu, suljettu };
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

// Mitkä vastaukset sopivat millekin piirrokselle, suosituimmuusjärjestyksessä (satunnaistetaan doodle.js:ssä).
const SOPIVAT = {
  silmukka: ['kasvot', 'kissa', 'aurinko', 'ilmapallo'],
  viiva: ['etana', 'nuoli'],
  maa: ['maisema'],
  aalto: ['vene'],
  sotku: ['kymppi', 'vau'],
  piste: ['kysymys'],
  muu: ['tahdet', 'vau', 'kymppi', 'kehys'],
};
// Jos mikään sopiva ei mahdu, kokeillaan näitä.
const VARAT = { maa: ['etana', 'nuoli'], aalto: ['tahdet'] };

// Palauttaa ehdokkaat [{ nimi, osat }] siinä järjestyksessä kuin niitä kannattaa kokeilla.
export function ehdokkaat(p, edellinen) {
  const nimet = SOPIVAT[p.laji].slice().sort(() => Math.random() - 0.5);
  // Ei samaa vastausta kahdesti peräkkäin, jos muutakin on tarjolla.
  nimet.sort((a, b) => (a === edellinen) - (b === edellinen));
  // Moniviivainen iso piirros saa useimmiten kehyksen.
  if (p.laji === 'muu' && p.viivat.length >= 3 && p.koko >= 70 && edellinen !== 'kehys' && Math.random() < 0.6) nimet.unshift('kehys');
  // Tunnistettu tähti tai sydän: matkija ensin.
  if (p.muoto) nimet.unshift('matkija');
  nimet.push(...(VARAT[p.laji] || []));
  if (!nimet.includes('tahdet') && p.laji !== 'piste') nimet.push('tahdet');
  return [...new Set(nimet)].map((nimi) => ({ nimi, osat: VASTAUKSET[nimi](p) })).filter((e) => e.osat && e.osat.length);
}

// Sydän piirtäjän oman kuvan ja kävijän piirroksen väliin.
export function sydanValiin(p, oma) {
  const cx = (p.cx + oma.cx) / 2, cy = (p.cy + oma.cy) / 2;
  return { nimi: 'sydän', osat: [{ kuva: kuva('sydän'), cx, cy, koko: 34, kulma: satunnainen(-0.2, 0.2) }] };
}

export const KIITOS = SANAT.kiitos;
