// Erzeugt die 13 Landschafts-Illustrationen (aus dem Mockup) als SVG-Dateien in public/img/scenes/.
// Aufruf: node scripts/make-scenes.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const E = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`;
const R = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
const P = (d, f, s, w) => ({ d, f: f || 'none', s: s || 'none', w: w || 0 });

const SCENES = {
  beach: [P(R(0,0,160,100),'#BFE3F2'),P(C(126,24,11),'#F6C453'),P(R(0,56,160,24),'#3AA7C4'),P('M0 74Q80 64 160 74V100H0z','#F1DDB0'),P('M38 92Q42 66 52 44',null,'#6B4F2A',3),P('M52 44Q38 36 26 44M52 44Q44 30 34 28M52 44Q62 32 74 34M52 44Q66 42 72 54',null,'#2E7D4F',4)],
  lagoon: [P(R(0,0,160,100),'#D4F0F4'),P(C(30,22,9),'#F6C453'),P(R(0,50,160,50),'#44C1C4'),P(E(104,62,30,6),'#F1DDB0'),P('M100 60Q102 46 108 36',null,'#6B4F2A',2.5),P('M108 36Q98 30 90 36M108 36Q104 26 96 24M108 36Q116 28 124 30',null,'#2E7D4F',3.5),P('M30 78h22l-4-8H34z','#9C6B3F'),P('M34 78v10M48 78v10',null,'#6B4F2A',2),P('M0 92Q40 86 80 92T160 92V100H0z','#2FA3AA')],
  temple: [P(R(0,0,160,100),'#F7DDBD'),P(C(40,34,14),'#F2A65A'),P(R(0,80,160,20),'#6E8F4E'),P(R(84,66,32,14),'#8A3A2B'),P('M76 66H124L116 58H84z','#8A3A2B'),P(R(88,48,24,10),'#8A3A2B'),P('M80 48H120L112 41H88z','#8A3A2B'),P(R(92,33,16,8),'#8A3A2B'),P('M86 33H114L106 27H94z','#8A3A2B'),P('M100 27V14',null,'#8A3A2B',2)],
  mountain: [P(R(0,0,160,100),'#CFE4F5'),P('M0 80L40 34L70 64L104 22L160 78V100H0z','#8FA9C2'),P('M104 22L94 36L102 33L108 38L114 31z','#FFFFFF'),P('M40 34L32 44L40 41L46 45z','#FFFFFF'),P('M0 86Q50 70 100 84T160 82V100H0z','#5E8C5A')],
  safari: [P(R(0,0,160,100),'#F6D7A7'),P(C(112,52,22),'#EE8B3A'),P(R(0,72,160,28),'#C9A15B'),P('M0 72Q80 68 160 72',null,'#A9823F',2),P('M44 74L46 50',null,'#4A3424',3),P(E(46,47,24,6),'#3F5B2C'),P('M128 74V64',null,'#4A3424',2),P(E(128,62,10,3),'#3F5B2C'),P('M80 74V58l3-10M83 48l2-3',null,'#7A5528',2.5),P(E(76,62,7,4),'#7A5528')],
  desert: [P(R(0,0,160,100),'#F9E3C0'),P(C(120,26,10),'#F4B942'),P('M0 70Q40 50 80 66T160 60V100H0z','#E0A867'),P('M0 84Q60 66 120 82T160 80V100H0z','#C98447')],
  city: [P(R(0,0,160,100),'#DCE6F2'),P(C(132,22,8),'#F6C453'),P(R(10,52,16,40),'#6B7C99'),P(R(28,36,14,56),'#4C5D78'),P(R(44,60,18,32),'#6B7C99'),P(R(64,24,12,68),'#3F4E68'),P('M70 24V12',null,'#3F4E68',2),P(R(78,46,20,46),'#4C5D78'),P(R(100,58,16,34),'#6B7C99'),P(R(118,40,14,52),'#4C5D78'),P(R(134,64,20,28),'#6B7C99'),P(R(0,90,160,10),'#3A475C')],
  rice: [P(R(0,0,160,100),'#DFF0E2'),P(C(124,20,9),'#F6C453'),P('M0 44Q80 30 160 46V100H0z','#8CC084'),P('M0 60Q80 46 160 62V100H0z','#6BAA6A'),P('M0 76Q80 62 160 78V100H0z','#4E9157'),P('M0 90Q80 78 160 92V100H0z','#3A7A47')],
  fjord: [P(R(0,0,160,100),'#D6E6F2'),P('M0 100V30L30 16L60 62V100z','#5E7E74'),P('M160 100V24L128 12L98 64V100z','#4E6E66'),P('M44 100L62 62H96L116 100z','#3D8FB0'),P('M30 16L23 27L31 25L37 29z','#FFFFFF'),P('M128 12L121 23L129 21L135 25z','#FFFFFF'),P('M72 80h14l-2 4H74z','#C9413A')],
  snow: [P(R(0,0,160,100),'#1F2D4F'),P('M0 34Q40 12 80 30T160 22',null,'#5FD3A0',6),P('M0 44Q50 26 100 42T160 34',null,'#3FAF8A',3),P(C(18,12,1),'#FFFFFF'),P(C(64,8,1),'#FFFFFF'),P(C(140,10,1),'#FFFFFF'),P('M0 72Q50 56 100 70T160 64V100H0z','#EEF3F7'),P('M28 76L35 56L42 76z','#1E4636'),P('M118 72L126 50L134 72z','#1E4636'),P('M138 74L144 60L150 74z','#1E4636'),P(R(70,64,16,10),'#B5452F'),P('M68 64L78 56L88 64z','#EEF3F7'),P(R(76,67,4,4),'#F6C453')],
  coast: [P(R(0,0,160,100),'#CDE7F6'),P(C(132,20,9),'#F6C453'),P(R(0,60,160,40),'#2F80B8'),P('M0 100V52Q34 44 72 50L104 100z','#E7D8BF'),P(R(10,38,16,14),'#FFFFFF'),P(R(30,34,14,16),'#FFFFFF'),P(R(48,40,16,12),'#FFFFFF'),P(C(37,34,6),'#2F6FB0'),P(R(14,42,4,5),'#2F6FB0'),P(R(52,44,4,5),'#2F6FB0')],
  saltflat: [P(R(0,0,160,100),'#BFD9EE'),P(C(30,20,8),'#F6C453'),P('M0 58L30 44L52 52L80 36L110 50L136 42L160 52V60H0z','#9C8FA8'),P(R(0,60,160,40),'#F4F6F7'),P('M0 60L30 74L52 66L80 82L110 70L136 78L160 68V60z','#DCE5EE'),P('M0 86L160 80',null,'#E2E8EC',1.5)],
  jungle: [P(R(0,0,160,100),'#CFE8D6'),P(R(0,56,160,30),'#2A5A37'),P(C(14,52,16),'#2F6B3E'),P(C(40,44,18),'#3E8A4E'),P(C(70,52,16),'#2F6B3E'),P(C(98,42,20),'#4E9A57'),P(C(130,50,18),'#3E8A4E'),P(C(156,44,14),'#2F6B3E'),P('M0 82Q60 72 90 86T160 80V100H0z','#8C7A4B')],
};

const dir = path.join(root, 'public/img/scenes');
fs.mkdirSync(dir, { recursive: true });
for (const [id, parts] of Object.entries(SCENES)) {
  const body = parts
    .map((x) => `<path d="${x.d}" fill="${x.f}"${x.s !== 'none' ? ` stroke="${x.s}" stroke-width="${x.w}" stroke-linecap="round"` : ''}/>`)
    .join('');
  fs.writeFileSync(
    path.join(dir, `${id}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">${body}</svg>\n`,
  );
}
console.log(`${Object.keys(SCENES).length} Szenen geschrieben`);
