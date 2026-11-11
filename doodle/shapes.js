// Piirtäjän kuvakirjasto. Jokainen kuva on lista yhtenäisiä viivoja 100 × 100 -ruudussa (SVG-polun d-merkkijono,
// yksi M-komento per viiva). doodle.js skaalaa, kääntää ja heiluttaa viivat käsin piirretyn näköisiksi.
// Uusi kuva = uusi rivi tähän listaan.

const ympyra = (cx, cy, r) => `M${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy - 0.01}`;

const spiraali = (cx, cy, r, kierrokset) => {
  const askelia = Math.round(kierrokset * 36);
  let d = '';
  for (let i = 0; i <= askelia; i++) {
    const t = i / askelia;
    const a = t * kierrokset * Math.PI * 2;
    const rr = r * t;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return d.trim();
};

const terälehti = (cx, cy, kulma, pituus) => {
  const a = (kulma * Math.PI) / 180;
  const k = 0.55;
  const p = (dist, sivu) => {
    const x = cx + Math.cos(a) * dist - Math.sin(a) * sivu;
    const y = cy + Math.sin(a) * dist + Math.cos(a) * sivu;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  };
  return `M${p(0, 0)} Q${p(pituus, -pituus * k)} ${p(pituus, 0)} Q${p(pituus, pituus * k)} ${p(0, 0)}`;
};

const säde = (cx, cy, kulma, r1, r2) => {
  const a = (kulma * Math.PI) / 180;
  return `M${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)} L${(cx + Math.cos(a) * r2).toFixed(1)} ${(cy + Math.sin(a) * r2).toFixed(1)}`;
};

const pikkutahti = (cx, cy, r) => {
  let d = '';
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return d.trim();
};

export const SHAPES = [
  { nimi: 'tähti', viivat: ['M50 6 L61 38 L95 38 L67 58 L78 92 L50 71 L22 92 L33 58 L5 38 L39 38 Z'] },
  { nimi: 'sydän', viivat: ['M50 88 C20 66 4 48 8 30 C12 12 38 8 50 30 C62 8 88 12 92 30 C96 48 80 66 50 88 Z'] },
  { nimi: 'hymiö', viivat: [ympyra(50, 50, 44), 'M36 34 L36 44', 'M64 34 L64 44', 'M27 60 Q50 84 73 60'] },
  { nimi: 'aurinko', viivat: [ympyra(50, 50, 20), ...[0, 45, 90, 135, 180, 225, 270, 315].map((k) => säde(50, 50, k, 28, 44))] },
  {
    nimi: 'kissa',
    viivat: [
      'M22 42 L26 10 L42 28 Q50 26 58 28 L74 10 L78 42 Q86 64 70 78 Q50 90 30 78 Q14 64 22 42',
      'M38 48 L38 54', 'M62 48 L62 54',
      'M45 61 L50 65 L55 61', 'M50 65 Q45 72 39 68', 'M50 65 Q55 72 61 68',
      'M30 62 L8 58', 'M30 67 L9 72', 'M70 62 L92 58', 'M70 67 L91 72',
    ],
  },
  {
    nimi: 'nukkuva kissa',
    viivat: [
      'M10 86 Q6 58 30 52 L32 36 L42 46 Q48 44 54 46 L62 36 L64 54 Q92 58 90 86 Z',
      'M90 82 Q102 64 86 60',
      'M36 64 Q40 67 44 64', 'M52 64 Q56 67 60 64',
      'M70 12 L80 12 L70 22 L80 22', 'M84 2 L90 2 L84 8 L90 8',
    ],
  },
  {
    nimi: 'kukka',
    viivat: [
      ympyra(50, 32, 7),
      ...[0, 72, 144, 216, 288].map((k) => terälehti(50, 32, k - 90, 24)),
      'M50 40 Q46 68 50 98',
      'M49 74 Q30 62 28 74 Q38 82 49 78',
    ],
  },
  { nimi: 'pilvi', viivat: ['M20 72 Q4 72 8 58 Q11 45 24 47 Q26 27 46 31 Q58 16 72 31 Q90 29 90 47 Q100 59 88 69 Q84 73 76 72 Z'] },
  {
    nimi: 'talo',
    viivat: ['M15 94 L15 46 L50 12 L85 46 L85 94 Z', 'M42 94 L42 68 L58 68 L58 94', 'M24 54 L36 54 L36 66 L24 66 Z', 'M66 30 L66 16 L74 16 L74 38'],
  },
  {
    nimi: 'raketti',
    viivat: ['M50 4 Q72 30 66 72 L34 72 Q28 30 50 4 Z', ympyra(50, 36, 7), 'M35 54 L20 80 L34 72', 'M65 54 L80 80 L66 72', 'M40 76 Q44 88 50 97 Q56 88 60 76'],
  },
  { nimi: 'spiraali', viivat: [spiraali(50, 50, 44, 3.2)] },
  {
    nimi: 'etana',
    viivat: [spiraali(44, 58, 26, 2.4), 'M6 86 L80 86 Q94 86 92 72 L88 60', 'M88 60 L82 44', 'M91 62 L98 47'],
  },
  { nimi: 'paperilennokki', viivat: ['M6 50 L94 14 L60 90 L46 60 Z', 'M46 60 L94 14', 'M46 60 L42 80 L55 71'] },
  {
    nimi: 'moi',
    viivat: [
      'M6 86 L6 52 Q8 48 14 48 Q24 48 24 60 L24 86',
      'M24 60 Q26 48 34 48 Q42 48 42 60 L42 86',
      'M62 50 Q74 50 74 68 Q74 86 62 86 Q50 86 50 68 Q50 50 62 50',
      'M84 52 L84 86', 'M83.6 36 L84.4 38.5',
      'M96 14 L96 66', 'M95.6 81 L96.4 83.5',
    ],
  },
  {
    nimi: 'kahvikuppi',
    viivat: [
      'M22 44 L26 88 Q27 94 34 94 L62 94 Q69 94 70 88 L74 44 Z',
      'M73 54 Q90 54 89 66 Q88 78 71 78',
      'M36 36 Q30 28 36 20 Q42 12 36 4', 'M50 36 Q44 28 50 20 Q56 12 50 4', 'M64 36 Q58 28 64 20 Q70 12 64 4',
    ],
  },
  {
    // Kaksi ensimmäistä viivaa ovat vene; vastaukset.js käyttää niitä ilman aaltoja.
    nimi: 'paperivene',
    viivat: [
      'M10 56 L90 56 L74 74 L26 74 Z',
      'M30 56 L50 16 L70 56',
      'M4 84 Q14 78 24 84 Q34 90 44 84 Q54 78 64 84 Q74 90 84 84 Q90 80 96 84',
    ],
  },
  {
    nimi: 'hehkulamppu',
    viivat: [
      'M40 72 Q40 60 32 52 Q22 42 24 30 Q28 10 50 10 Q72 10 76 30 Q78 42 68 52 Q60 60 60 72 Z',
      'M42 80 L58 80', 'M44 88 L56 88',
      'M44 62 L44 48 L50 54 L56 48 L56 62',
      ...[-160, -125, -55, -20].map((k) => säde(50, 34, k, 36, 46)),
    ],
  },
  {
    nimi: 'kuu ja tähdet',
    viivat: ['M58 8 Q18 16 20 50 Q24 88 64 90 Q34 78 34 50 Q34 22 58 8 Z', pikkutahti(76, 30, 10), pikkutahti(84, 64, 7)],
  },
  {
    nimi: 'lintu',
    viivat: [
      ympyra(48, 50, 22),
      'M56 42 L56.6 44', 'M69 46 L80 50 L69 54', 'M30 56 Q36 68 50 64 Q44 54 30 56', 'M27 44 L14 38 L22 50',
      'M44 72 L42 82', 'M54 72 L54 82',
      'M4 84 Q50 80 96 86', 'M80 85 Q86 76 93 80 Q88 88 80 85',
    ],
  },
];

// Piirtäjän käsin kirjoittamat sanat vastauksiin. Leveys kertoo ruudun leveyden (korkeus aina 100).
export const SANAT = {
  kysymys: { nimi: '?', leveys: 100, viivat: ['M30 30 Q30 10 50 10 Q70 10 70 30 Q70 45 50 52 L50 66', 'M49.6 82 L50.4 84.5'] },
  vau: {
    nimi: 'vau!',
    leveys: 150,
    viivat: [
      'M5 40 L22 88 L40 40',
      'M78 50 Q72 40 62 40 Q48 40 48 64 Q48 88 62 88 Q74 88 78 70', 'M78 40 L78 88',
      'M92 40 L92 72 Q92 88 106 88 Q120 88 120 72', 'M120 40 L120 88',
      'M140 10 L140 66', 'M139.6 82 L140.4 84.5',
    ],
  },
  kymppi: {
    nimi: '10/10',
    leveys: 230,
    viivat: [
      'M10 26 L24 12 L24 88',
      'M70 12 Q90 12 90 50 Q90 88 70 88 Q50 88 50 50 Q50 12 70 12',
      'M100 88 L130 12',
      'M142 26 L156 12 L156 88',
      'M202 12 Q222 12 222 50 Q222 88 202 88 Q182 88 182 50 Q182 12 202 12',
    ],
  },
  kiitos: {
    nimi: 'kiitos!',
    leveys: 210,
    viivat: [
      'M8 10 L8 88', 'M36 46 L8 70', 'M18 62 L38 88',
      'M52 46 L52 88', 'M51.6 30 L52.4 32.5',
      'M68 46 L68 88', 'M67.6 30 L68.4 32.5',
      'M86 18 L86 80 Q86 88 96 88', 'M76 46 L98 46',
      'M124 44 Q140 44 140 66 Q140 88 124 88 Q108 88 108 66 Q108 44 124 44',
      'M176 50 Q170 44 162 44 Q150 44 152 56 Q154 64 164 66 Q178 70 176 80 Q174 88 162 88 Q152 88 148 82',
      'M196 10 L196 66', 'M195.6 82 L196.4 84.5',
    ],
  },
};
