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
  { nimi: 'nuoli', viivat: ['M8 74 Q40 12 86 40', 'M68 28 L87 41 L70 54'] },
  {
    nimi: 'etana',
    viivat: [spiraali(44, 58, 26, 2.4), 'M6 86 L80 86 Q94 86 92 72 L88 60', 'M88 60 L82 44', 'M91 62 L98 47'],
  },
  { nimi: 'paperilennokki', viivat: ['M6 50 L94 14 L60 90 L46 60 Z', 'M46 60 L94 14', 'M46 60 L42 80 L55 71'] },
  {
    nimi: 'hei',
    viivat: [
      'M8 14 L8 86', 'M8 58 Q20 40 30 56 L30 86',
      'M42 67 L62 67 Q62 50 52 50 Q40 50 40 68 Q40 86 54 86 Q60 86 64 80',
      'M74 52 L74 86', 'M73.6 36 L74.4 38.5',
      'M88 14 L88 66', 'M87.6 81 L88.4 83.5',
    ],
  },
];
