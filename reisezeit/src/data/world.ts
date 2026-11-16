// Alle Länder der Welt (UN-Mitglieder plus einige häufig bereiste Gebiete) für das Reiseprofil.
// Format je Kontinent: "ISO-Code:Name", durch Komma getrennt.

export const WORLD_CONTINENTS = ['Europa', 'Asien', 'Afrika', 'Nordamerika', 'Südamerika', 'Ozeanien'] as const;
export type WorldContinent = (typeof WORLD_CONTINENTS)[number];

export interface WorldCountry { code: string; name: string; continent: WorldContinent }

const RAW: Record<WorldContinent, string> = {
  Europa:
    'AL:Albanien,AD:Andorra,BE:Belgien,BA:Bosnien und Herzegowina,BG:Bulgarien,DK:Dänemark,DE:Deutschland,EE:Estland,FO:Färöer,FI:Finnland,FR:Frankreich,GR:Griechenland,IE:Irland,IS:Island,IT:Italien,XK:Kosovo,HR:Kroatien,LV:Lettland,LI:Liechtenstein,LT:Litauen,LU:Luxemburg,MT:Malta,MD:Moldau,MC:Monaco,ME:Montenegro,NL:Niederlande,MK:Nordmazedonien,NO:Norwegen,AT:Österreich,PL:Polen,PT:Portugal,RO:Rumänien,RU:Russland,SM:San Marino,SE:Schweden,CH:Schweiz,RS:Serbien,SK:Slowakei,SI:Slowenien,ES:Spanien,CZ:Tschechien,UA:Ukraine,HU:Ungarn,VA:Vatikanstadt,GB:Vereinigtes Königreich,BY:Belarus,CY:Zypern',
  Asien:
    'AF:Afghanistan,AM:Armenien,AZ:Aserbaidschan,BH:Bahrain,BD:Bangladesch,BT:Bhutan,BN:Brunei,CN:China,GE:Georgien,HK:Hongkong,IN:Indien,ID:Indonesien,IQ:Irak,IR:Iran,IL:Israel,JP:Japan,YE:Jemen,JO:Jordanien,KH:Kambodscha,KZ:Kasachstan,QA:Katar,KG:Kirgistan,KW:Kuwait,LA:Laos,LB:Libanon,MY:Malaysia,MV:Malediven,MN:Mongolei,MM:Myanmar,NP:Nepal,KP:Nordkorea,OM:Oman,TL:Osttimor,PK:Pakistan,PS:Palästina,PH:Philippinen,SA:Saudi-Arabien,SG:Singapur,LK:Sri Lanka,KR:Südkorea,SY:Syrien,TJ:Tadschikistan,TW:Taiwan,TH:Thailand,TR:Türkei,TM:Turkmenistan,UZ:Usbekistan,AE:Vereinigte Arabische Emirate,VN:Vietnam',
  Afrika:
    'EG:Ägypten,DZ:Algerien,AO:Angola,GQ:Äquatorialguinea,ET:Äthiopien,BJ:Benin,BW:Botswana,BF:Burkina Faso,BI:Burundi,CI:Elfenbeinküste,DJ:Dschibuti,ER:Eritrea,SZ:Eswatini,GA:Gabun,GM:Gambia,GH:Ghana,GN:Guinea,GW:Guinea-Bissau,CM:Kamerun,CV:Kap Verde,KE:Kenia,KM:Komoren,CD:Kongo (Dem. Rep.),CG:Kongo (Rep.),LS:Lesotho,LR:Liberia,LY:Libyen,MG:Madagaskar,MW:Malawi,ML:Mali,MA:Marokko,MR:Mauretanien,MU:Mauritius,MZ:Mosambik,NA:Namibia,NE:Niger,NG:Nigeria,RW:Ruanda,ZM:Sambia,ST:São Tomé und Príncipe,SN:Senegal,SC:Seychellen,SL:Sierra Leone,ZW:Simbabwe,SO:Somalia,ZA:Südafrika,SD:Sudan,SS:Südsudan,TZ:Tansania,TG:Togo,TD:Tschad,TN:Tunesien,UG:Uganda,CF:Zentralafrikanische Republik',
  Nordamerika:
    'AG:Antigua und Barbuda,BS:Bahamas,BB:Barbados,BZ:Belize,CR:Costa Rica,DM:Dominica,DO:Dominikanische Republik,SV:El Salvador,GD:Grenada,GL:Grönland,GT:Guatemala,HT:Haiti,HN:Honduras,JM:Jamaika,CA:Kanada,CU:Kuba,MX:Mexiko,NI:Nicaragua,PA:Panama,KN:St. Kitts und Nevis,LC:St. Lucia,VC:St. Vincent und die Grenadinen,TT:Trinidad und Tobago,US:USA',
  Südamerika:
    'AR:Argentinien,BO:Bolivien,BR:Brasilien,CL:Chile,EC:Ecuador,GY:Guyana,CO:Kolumbien,PY:Paraguay,PE:Peru,SR:Suriname,UY:Uruguay,VE:Venezuela',
  Ozeanien:
    'AU:Australien,FJ:Fidschi,PF:Französisch-Polynesien,KI:Kiribati,MH:Marshallinseln,FM:Mikronesien,NR:Nauru,NZ:Neuseeland,PW:Palau,PG:Papua-Neuguinea,SB:Salomonen,WS:Samoa,TO:Tonga,TV:Tuvalu,VU:Vanuatu',
};

export const WORLD: WorldCountry[] = WORLD_CONTINENTS.flatMap((continent) =>
  RAW[continent].split(',').map((entry) => {
    const [code, name] = entry.split(':');
    return { code, name, continent };
  }),
).sort((a, b) => a.name.localeCompare(b.name, 'de'));

export const WORLD_BY_CODE = new Map(WORLD.map((c) => [c.code, c]));

/** Inselstaaten für die Auszeichnung „Inselhüpfer“ */
export const ISLAND_NATIONS = new Set([
  'IS', 'IE', 'GB', 'MT', 'CY', 'FO', 'JP', 'PH', 'ID', 'SG', 'LK', 'MV', 'TW', 'BH', 'TL', 'BN', 'MG', 'MU', 'SC', 'CV', 'KM', 'ST',
  'CU', 'JM', 'HT', 'DO', 'BS', 'BB', 'TT', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'GL', 'AU', 'NZ', 'FJ', 'PF', 'KI', 'MH', 'FM', 'NR',
  'PW', 'PG', 'SB', 'WS', 'TO', 'TV', 'VU',
]);

/** Länder der App (kleine IDs) → ISO-Codes im Profil. Sammel-Einträge zählen als ihre Hauptländer. */
const APP_EXCEPTIONS: Record<string, string[]> = {
  ge: ['GE', 'AM'],
  me: ['ME', 'AL'],
  sn: ['SN', 'GM'],
  kg: ['KG', 'TJ'],
  ic: ['ES', 'PT'],
  re: ['FR'],
};
export function isoOfAppCountry(id: string): string[] {
  return APP_EXCEPTIONS[id] ?? [id.toUpperCase()];
}
