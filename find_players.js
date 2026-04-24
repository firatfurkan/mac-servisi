#!/usr/bin/env node
// Comprehensive player photo ID finder using squad-based search + fuzzy matching

const API_KEY = '7c1366cf6568e4f8f5f61dc52a662d46';
const BASE_URL = 'https://v3.football.api-sports.io';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function apiGet(endpoint) {
  await sleep(300); // rate limit respect
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${endpoint}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error('API Error:', data.errors);
  }
  return data;
}

// Normalize special chars for fuzzy matching
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/İ/g, 'i').replace(/Ç/g, 'c').replace(/Ş/g, 's')
    .replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e')
    .replace(/á/g, 'a').replace(/à/g, 'a').replace(/â/g, 'a').replace(/ã/g, 'a')
    .replace(/ó/g, 'o').replace(/ò/g, 'o').replace(/ô/g, 'o')
    .replace(/ú/g, 'u').replace(/ù/g, 'u').replace(/û/g, 'u')
    .replace(/í/g, 'i').replace(/ì/g, 'i').replace(/î/g, 'i')
    .replace(/ñ/g, 'n').replace(/ý/g, 'y').replace(/ø/g, 'o')
    .replace(/å/g, 'a').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
    .replace(/ž/g, 'z').replace(/š/g, 's').replace(/č/g, 'c')
    .replace(/ć/g, 'c').replace(/đ/g, 'd').replace(/ł/g, 'l')
    .replace(/ą/g, 'a').replace(/ę/g, 'e').replace(/ź/g, 'z').replace(/ń/g, 'n')
    .replace(/ï/g, 'i').replace(/ë/g, 'e').replace(/ü/g, 'u')
    .replace(/ā/g, 'a').replace(/ē/g, 'e').replace(/ī/g, 'i')
    .replace(/ō/g, 'o').replace(/ū/g, 'u')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function nameParts(name) {
  return normalize(name).split(/\s+/).filter(Boolean);
}

function nameMatch(apiName, searchName) {
  const apiNorm = normalize(apiName);
  const searchNorm = normalize(searchName);

  // Exact match
  if (apiNorm === searchNorm) return 100;

  // Contains full name
  if (apiNorm.includes(searchNorm) || searchNorm.includes(apiNorm)) return 90;

  const apiParts = nameParts(apiName);
  const searchParts = nameParts(searchName);

  // Last name match (most reliable for footballers)
  const apiLast = apiParts[apiParts.length - 1];
  const searchLast = searchParts[searchParts.length - 1];
  if (apiLast && searchLast && apiLast === searchLast) {
    // First name also matches
    if (apiParts[0] && searchParts[0] && (
      apiParts[0] === searchParts[0] ||
      apiParts[0].startsWith(searchParts[0].charAt(0)) ||
      searchParts[0].startsWith(apiParts[0].charAt(0))
    )) return 85;
    return 70;
  }

  // All search parts found in api name
  const allFound = searchParts.every(p => apiParts.some(ap => ap.includes(p) || p.includes(ap)));
  if (allFound && searchParts.length >= 2) return 80;

  // Single name player (like "Estêvão", "Antony", "Janderson")
  if (searchParts.length === 1 && apiParts.some(p => p.includes(searchParts[0]))) return 75;

  return 0;
}

// Players that need photoId
const MISSING_PLAYERS = [
  // Süper Lig
  { id: 302, name: 'Mattéo Guendouzi', team: 'Fenerbahçe SK' },
  { id: 303, name: 'Barış Alper Yılmaz', team: 'Galatasaray SK' },
  { id: 304, name: 'Orkun Kökçü', team: 'Beşiktaş JK' },
  { id: 305, name: 'Wilfried Singo', team: 'Galatasaray SK' },
  { id: 306, name: 'Noa Lang', team: 'Galatasaray SK' },
  { id: 310, name: 'Edson Álvarez', team: 'Fenerbahçe SK' },
  { id: 312, name: 'Dorgeles Nene', team: 'Fenerbahçe SK' },
  { id: 313, name: 'Sidiki Chérif', team: 'Fenerbahçe SK' },
  { id: 314, name: 'Emmanuel Agbadou', team: 'Beşiktaş JK' },
  { id: 317, name: 'Christ Inao Oulaï', team: 'Trabzonspor' },
  { id: 320, name: 'Hyeon-gyu Oh', team: 'Beşiktaş JK' },
  { id: 321, name: 'El Bilal Touré', team: 'Beşiktaş JK' },
  { id: 324, name: 'Yáser Asprilla', team: 'Galatasaray SK' },
  { id: 325, name: 'Ederson', team: 'Fenerbahçe SK' },
  { id: 326, name: 'Kristjan Asllani', team: 'Beşiktaş JK' },
  { id: 327, name: 'André Onana', team: 'Trabzonspor' },
  { id: 328, name: 'Jota Silva', team: 'Beşiktaş JK' },
  { id: 333, name: 'Ernest Muci', team: 'Trabzonspor' },
  { id: 335, name: 'Wilfred Ndidi', team: 'Beşiktaş JK' },
  { id: 336, name: 'Archie Brown', team: 'Fenerbahçe SK' },
  { id: 337, name: 'Juan', team: 'Göztepe' },
  { id: 338, name: 'Anthony Dennis', team: 'Göztepe' },
  { id: 340, name: 'Wagner Pina', team: 'Trabzonspor' },
  { id: 343, name: 'Amir Murillo', team: 'Beşiktaş JK' },
  { id: 345, name: 'Nélson Semedo', team: 'Fenerbahçe SK' },
  { id: 346, name: 'Chibuike Nwaiwu', team: 'Trabzonspor' },
  { id: 348, name: 'Maestro', team: 'Alanyaspor' },
  { id: 350, name: 'Eldor Shomurodov', team: 'İstanbul Başakşehir FK' },
  { id: 351, name: 'Tiago Djaló', team: 'Beşiktaş JK' },
  { id: 352, name: 'Abbosbek Fayzullaev', team: 'İstanbul Başakşehir FK' },
  { id: 355, name: 'Tim Jabol-Folcarelli', team: 'Trabzonspor' },
  { id: 356, name: 'Paul Onuachu', team: 'Trabzonspor' },
  { id: 357, name: 'Carlo Holse', team: 'Samsunspor' },
  { id: 358, name: 'Renato Nhaga', team: 'Galatasaray SK' },
  { id: 361, name: 'Anthony Musaba', team: 'Fenerbahçe SK' },
  { id: 362, name: 'Amine Harit', team: 'İstanbul Başakşehir FK' },
  { id: 363, name: 'Jerome Opoku', team: 'İstanbul Başakşehir FK' },
  { id: 364, name: 'Arda Okan Kurtulan', team: 'Göztepe' },
  { id: 365, name: 'Taha Altıkardeş', team: 'Göztepe' },
  { id: 367, name: 'Taylan Bulut', team: 'Beşiktaş JK' },
  { id: 368, name: 'Junior Olaitan', team: 'Beşiktaş JK' },
  { id: 369, name: 'Yasin Özcan', team: 'Beşiktaş JK' },
  { id: 370, name: 'Mustafa Hekimoğlu', team: 'Beşiktaş JK' },
  { id: 371, name: 'Cherif Ndiaye', team: 'Samsunspor' },
  { id: 373, name: 'Kacper Kozlowski', team: 'Gaziantep FK' },
  { id: 375, name: 'Yahia Fofana', team: 'Çaykur Rizespor' },
  { id: 376, name: 'Fedor Chalov', team: 'Kayserispor' },
  { id: 378, name: 'Benjamin Bouchouari', team: 'Trabzonspor' },
  { id: 379, name: 'Yiğit Efe Demir', team: 'Fenerbahçe SK' },
  { id: 380, name: 'Malcom Bokele', team: 'Göztepe' },
  { id: 381, name: 'Janderson', team: 'Göztepe' },
  { id: 382, name: "N'Golo Kanté", team: 'Fenerbahçe SK' },
  { id: 383, name: 'Marius Mouandilmadji', team: 'Samsunspor' },
  { id: 385, name: 'Mathias Løvik', team: 'Trabzonspor' },
  { id: 386, name: 'Rıdvan Yılmaz', team: 'Beşiktaş JK' },
  { id: 387, name: 'Milot Rashica', team: 'Beşiktaş JK' },
  { id: 388, name: 'Rick van Drongelen', team: 'Samsunspor' },
  { id: 389, name: 'Antoine Makoumbou', team: 'Samsunspor' },
  { id: 390, name: 'Christopher Operi', team: 'İstanbul Başakşehir FK' },
  { id: 392, name: 'Bertuğ Yıldırım', team: 'İstanbul Başakşehir FK' },
  { id: 393, name: 'Kazeem Olaigbe', team: 'Konyaspor' },
  { id: 394, name: 'Mohamed Bayo', team: 'Gaziantep FK' },
  { id: 395, name: 'Ümit Akdağ', team: 'Alanyaspor' },
  { id: 396, name: 'İrfan Can Kahveci', team: 'Kasımpaşa' },
  { id: 397, name: 'Deniz Ertaş', team: 'Konyaspor' },
  { id: 398, name: 'Filip Krastev', team: 'Göztepe' },
  { id: 399, name: 'Afonso Sousa', team: 'Samsunspor' },
  { id: 400, name: 'Festy Ebosele', team: 'İstanbul Başakşehir FK' },
  // International
  { id: 23, name: 'Hugo Ekitiké', team: 'Liverpool FC' },
  { id: 30, name: 'Estêvão', team: 'Chelsea FC' },
  { id: 34, name: 'Martín Zubimendi', team: 'Arsenal' },
  { id: 40, name: 'Yan Diomande', team: 'RB Leipzig' },
  { id: 45, name: 'Antoine Semenyo', team: 'Manchester City' },
  { id: 58, name: 'Nico Paz', team: 'Como 1907' },
  { id: 59, name: 'Dean Huijsen', team: 'Real Madrid' },
  { id: 61, name: 'Rayan Cherki', team: 'Manchester City' },
  { id: 64, name: 'Nick Woltemade', team: 'Newcastle United' },
  { id: 70, name: 'Viktor Gyökeres', team: 'Arsenal' },
  { id: 75, name: 'Luka Vuskovic', team: 'Hamburger SV' },
  { id: 76, name: 'Álvaro Carreras', team: 'Real Madrid' },
  { id: 90, name: 'Jérémy Jacquet', team: 'Stade Rennes' },
  { id: 93, name: 'Mohammed Kudus', team: 'Tottenham Hotspur' },
  { id: 96, name: 'Ayyoub Bouaddi', team: 'LOSC Lille' },
  { id: 101, name: "Nico O'Reilly", team: 'Manchester City' },
  { id: 102, name: 'Igor Thiago', team: 'Brentford FC' },
  { id: 103, name: 'Nico Williams', team: 'Athletic Bilbao' },
  { id: 106, name: 'Manu Koné', team: 'AS Roma' },
  { id: 107, name: 'Iliman Ndiaye', team: 'Everton FC' },
  { id: 126, name: 'Franco Mastantuono', team: 'Real Madrid' },
  { id: 127, name: 'Samu Aghehowa', team: 'FC Porto' },
  { id: 128, name: 'Ousmane Diomande', team: 'Sporting Lizbon' },
  { id: 129, name: 'Pio Esposito', team: 'Inter Milan' },
  { id: 130, name: 'Can Uzun', team: 'Eintracht Frankfurt' },
  { id: 131, name: 'Andrey Santos', team: 'Chelsea FC' },
  { id: 132, name: 'Jarrad Branthwaite', team: 'Everton FC' },
  { id: 133, name: 'Ilya Zabarnyi', team: 'Paris Saint-Germain' },
  { id: 136, name: 'Castello Lukeba', team: 'RB Leipzig' },
  { id: 139, name: 'Malick Thiaw', team: 'Newcastle United' },
  { id: 140, name: 'Amadou Onana', team: 'Aston Villa' },
  { id: 141, name: 'Nico González', team: 'Manchester City' },
  { id: 142, name: 'Morten Hjulmand', team: 'Sporting Lizbon' },
  { id: 143, name: 'Angelo Stiller', team: 'VfB Stuttgart' },
  { id: 144, name: 'Jørgen Strand Larsen', team: 'Manchester City' },
  { id: 149, name: 'Geovany Quenda', team: 'Sporting Lizbon' },
  { id: 150, name: 'Christian Kofane', team: 'Bayer 04 Leverkusen' },
  { id: 151, name: 'Rayan', team: 'AFC Bournemouth' },
  { id: 152, name: 'Yankuba Minteh', team: 'Brighton & Hove Albion' },
  { id: 153, name: 'Wesley', team: 'AS Roma' },
  { id: 154, name: 'Junior Kroupi', team: 'AFC Bournemouth' },
  { id: 156, name: 'Senny Mayulu', team: 'Paris Saint-Germain' },
  { id: 159, name: 'Alex Scott', team: 'AFC Bournemouth' },
  { id: 165, name: 'Alberto Moleiro', team: 'Villarreal CF' },
  { id: 168, name: 'Antony', team: 'Real Betis' },
  { id: 175, name: 'Gonçalo Inácio', team: 'Sporting Lizbon' },
  { id: 176, name: 'Jamie Leweling', team: 'VfB Stuttgart' },
  { id: 178, name: 'Pape Gueye', team: 'Villarreal CF' },
  { id: 182, name: 'Maxence Lacroix', team: 'Crystal Palace' },
  { id: 187, name: 'Diogo Costa', team: 'FC Porto' },
  { id: 196, name: 'Rodrigo Mora', team: 'FC Porto' },
  { id: 197, name: 'Vitor Roque', team: 'SE Palmeiras' },
  { id: 198, name: 'Said El Mala', team: '1.FC Köln' },
  { id: 199, name: 'Bazoumana Touré', team: 'TSG 1899 Hoffenheim' },
  { id: 200, name: 'Joaquín Panichelli', team: 'RC Strasbourg Alsace' },
  { id: 201, name: 'Konstantinos Karetsas', team: 'KRC Genk' },
  { id: 203, name: 'Mikel Jauregizar', team: 'Athletic Bilbao' },
  { id: 204, name: 'Johan Manzambi', team: 'SC Freiburg' },
  { id: 206, name: 'Archie Gray', team: 'Tottenham Hotspur' },
  { id: 208, name: 'Jorrel Hato', team: 'Chelsea FC' },
  { id: 210, name: 'Mateus Fernandes', team: 'West Ham United' },
  { id: 211, name: 'Santiago Castro', team: 'Bologna FC' },
  { id: 212, name: 'Valentín Barco', team: 'RC Strasbourg Alsace' },
  { id: 213, name: 'Ange-Yoan Bonny', team: 'Inter Milan' },
  { id: 214, name: 'Michael Kayode', team: 'Brentford FC' },
  { id: 215, name: 'Dango Ouattara', team: 'Brentford FC' },
  { id: 216, name: 'Abdukodir Khusanov', team: 'Manchester City' },
  { id: 217, name: 'João Gomes', team: 'Wolverhampton Wanderers' },
  { id: 218, name: 'Evanilson', team: 'AFC Bournemouth' },
  { id: 219, name: 'Nathaniel Brown', team: 'Eintracht Frankfurt' },
  { id: 221, name: 'Lewis Hall', team: 'Newcastle United' },
  { id: 223, name: 'Igor Paixão', team: 'Olympique Marsilya' },
  { id: 224, name: 'Cristhian Mosquera', team: 'Arsenal' },
  { id: 227, name: 'Strahinja Pavlović', team: 'AC Milan' },
  { id: 228, name: 'Oihan Sancet', team: 'Athletic Bilbao' },
  { id: 229, name: 'Yéremy Pino', team: 'Crystal Palace' },
  { id: 236, name: 'James Garner', team: 'Everton FC' },
  { id: 237, name: 'Jacob Ramsey', team: 'Newcastle United' },
  { id: 241, name: 'Kevin Schade', team: 'Brentford FC' },
  { id: 242, name: 'Brennan Johnson', team: 'Crystal Palace' },
  { id: 244, name: 'Lucas Paquetá', team: 'West Ham United' },
  { id: 249, name: 'Francisco Trincão', team: 'Sporting Lizbon' },
  { id: 250, name: 'Ismaïla Sarr', team: 'Crystal Palace' },
];

// Team name to search term mapping
const TEAM_SEARCH_MAP = {
  'Fenerbahçe SK': 'Fenerbahce',
  'Galatasaray SK': 'Galatasaray',
  'Beşiktaş JK': 'Besiktas',
  'Trabzonspor': 'Trabzonspor',
  'Göztepe': 'Goztepe',
  'Samsunspor': 'Samsunspor',
  'İstanbul Başakşehir FK': 'Basaksehir',
  'Alanyaspor': 'Alanyaspor',
  'Gaziantep FK': 'Gaziantep',
  'Çaykur Rizespor': 'Rizespor',
  'Kayserispor': 'Kayserispor',
  'Konyaspor': 'Konyaspor',
  'Kasımpaşa': 'Kasimpasa',
  'Arsenal': 'Arsenal',
  'Liverpool FC': 'Liverpool',
  'Chelsea FC': 'Chelsea',
  'Manchester City': 'Manchester City',
  'Manchester United': 'Manchester United',
  'Real Madrid': 'Real Madrid',
  'FC Barcelona': 'Barcelona',
  'Bayern Munich': 'Bayern Munich',
  'Borussia Dortmund': 'Dortmund',
  'Paris Saint-Germain': 'Paris Saint-Germain',
  'Juventus': 'Juventus',
  'Inter Milan': 'Inter',
  'AC Milan': 'AC Milan',
  'Atletico Madrid': 'Atletico Madrid',
  'Tottenham Hotspur': 'Tottenham',
  'Newcastle United': 'Newcastle',
  'Aston Villa': 'Aston Villa',
  'Brighton & Hove Albion': 'Brighton',
  'West Ham United': 'West Ham',
  'Everton FC': 'Everton',
  'AFC Bournemouth': 'Bournemouth',
  'Brentford FC': 'Brentford',
  'Crystal Palace': 'Crystal Palace',
  'Wolverhampton Wanderers': 'Wolves',
  'RB Leipzig': 'RB Leipzig',
  'Bayer 04 Leverkusen': 'Leverkusen',
  'VfB Stuttgart': 'Stuttgart',
  'Eintracht Frankfurt': 'Frankfurt',
  'SC Freiburg': 'Freiburg',
  'Hamburger SV': 'Hamburg',
  'TSG 1899 Hoffenheim': 'Hoffenheim',
  '1.FC Köln': 'Köln',
  'Athletic Bilbao': 'Athletic Club',
  'Villarreal CF': 'Villarreal',
  'Real Betis': 'Real Betis',
  'LOSC Lille': 'Lille',
  'Stade Rennes': 'Rennes',
  'Olympique Marsilya': 'Marseille',
  'RC Strasbourg Alsace': 'Strasbourg',
  'Sporting Lizbon': 'Sporting CP',
  'FC Porto': 'Porto',
  'Como 1907': 'Como',
  'AS Roma': 'Roma',
  'Bologna FC': 'Bologna',
  'KRC Genk': 'Genk',
  'SE Palmeiras': 'Palmeiras',
};

// Known team IDs from API (season 2024)
const KNOWN_TEAM_IDS = {
  'Galatasaray SK': 1924,
  'Fenerbahçe SK': 611,
  'Beşiktaş JK': 609,
  'Trabzonspor': 636,
  'Göztepe': 593,
  'Samsunspor': 635,
  'İstanbul Başakşehir FK': 2282,
  'Arsenal': 42,
  'Liverpool FC': 40,
  'Chelsea FC': 49,
  'Manchester City': 50,
  'Tottenham Hotspur': 47,
  'Newcastle United': 34,
  'Aston Villa': 66,
  'Brighton & Hove Albion': 51,
  'West Ham United': 48,
  'Everton FC': 45,
  'AFC Bournemouth': 35,
  'Brentford FC': 55,
  'Crystal Palace': 52,
  'Wolverhampton Wanderers': 39,
  'Real Madrid': 541,
  'FC Barcelona': 529,
  'Atletico Madrid': 530,
  'Real Betis': 543,
  'Athletic Bilbao': 531,
  'Villarreal CF': 533,
  'Paris Saint-Germain': 85,
  'LOSC Lille': 79,
  'Stade Rennes': 111,
  'Olympique Marsilya': 81,
  'RC Strasbourg Alsace': 95,
  'Bayern Munich': 157,
  'Borussia Dortmund': 165,
  'RB Leipzig': 173,
  'Bayer 04 Leverkusen': 168,
  'VfB Stuttgart': 172,
  'Eintracht Frankfurt': 169,
  'SC Freiburg': 160,
  'Hamburger SV': 171,
  'TSG 1899 Hoffenheim': 167,
  '1.FC Köln': 163,
  'Inter Milan': 505,
  'AC Milan': 489,
  'Juventus': 496,
  'AS Roma': 497,
  'Bologna FC': 500,
  'Sporting Lizbon': 228,
  'FC Porto': 212,
  'KRC Genk': 240,
  'Como 1907': 517,
  'SE Palmeiras': 121,
};

const SEASON = 2024;

async function getTeamId(teamName) {
  if (KNOWN_TEAM_IDS[teamName]) return KNOWN_TEAM_IDS[teamName];

  const searchTerm = TEAM_SEARCH_MAP[teamName] || teamName;
  const data = await apiGet(`/teams?search=${encodeURIComponent(searchTerm)}`);
  if (data.response && data.response.length > 0) {
    const team = data.response[0];
    console.log(`  Team found: ${team.team.name} (id=${team.team.id})`);
    return team.team.id;
  }
  console.log(`  Team NOT found: ${teamName}`);
  return null;
}

async function getTeamSquad(teamId) {
  const data = await apiGet(`/players/squads?team=${teamId}`);
  if (data.response && data.response.length > 0) {
    return data.response[0].players || [];
  }
  return [];
}

async function searchPlayerByName(name, league) {
  // Try direct name search
  const normalized = name.replace(/[çşğıöü]/gi, c => ({ ç:'c',ş:'s',ğ:'g',ı:'i',ö:'o',ü:'u',Ç:'C',Ş:'S',Ğ:'G',İ:'I',Ö:'O',Ü:'U' }[c] || c));

  const searches = [name, normalized];

  // Try last name only
  const parts = name.split(' ');
  if (parts.length > 1) {
    searches.push(parts[parts.length - 1]);
    searches.push(parts[0]);
  }

  for (const search of searches) {
    if (search.length < 3) continue;
    const data = await apiGet(`/players?search=${encodeURIComponent(search)}&season=${SEASON}`);
    if (data.response && data.response.length > 0) {
      // Find best match
      let best = null, bestScore = 0;
      for (const entry of data.response) {
        const score = nameMatch(entry.player.name, name);
        if (score > bestScore) {
          bestScore = score;
          best = entry;
        }
        // Also check firstname+lastname combo
        const fullName = `${entry.player.firstname || ''} ${entry.player.lastname || ''}`.trim();
        const score2 = nameMatch(fullName, name);
        if (score2 > bestScore) {
          bestScore = score2;
          best = entry;
        }
      }
      if (best && bestScore >= 70) {
        return { id: best.player.id, name: best.player.name, score: bestScore };
      }
    }
  }
  return null;
}

async function main() {
  const results = {}; // playerFileId -> apiPlayerId
  const notFound = [];

  // Group players by team for squad search
  const teamGroups = {};
  for (const p of MISSING_PLAYERS) {
    if (!teamGroups[p.team]) teamGroups[p.team] = [];
    teamGroups[p.team].push(p);
  }

  console.log(`\n=== SQUAD-BASED SEARCH ===\n`);

  for (const [teamName, players] of Object.entries(teamGroups)) {
    console.log(`\n--- ${teamName} (${players.length} players to find) ---`);

    const teamId = await getTeamId(teamName);
    if (!teamId) {
      console.log(`  Skipping - no team ID`);
      for (const p of players) notFound.push(p);
      continue;
    }

    // Get full squad
    const squad = await getTeamSquad(teamId);
    console.log(`  Squad size: ${squad.length}`);

    for (const player of players) {
      let found = false;
      let bestMatch = null, bestScore = 0;

      for (const squadPlayer of squad) {
        const score = nameMatch(squadPlayer.name, player.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = squadPlayer;
        }
      }

      if (bestMatch && bestScore >= 70) {
        console.log(`  ✓ id:${player.id} "${player.name}" → ${bestMatch.id} "${bestMatch.name}" (score:${bestScore})`);
        results[player.id] = bestMatch.id;
        found = true;
      }

      if (!found) {
        console.log(`  ✗ id:${player.id} "${player.name}" - not in squad (best: ${bestMatch ? bestMatch.name : 'none'} score:${bestScore})`);
        notFound.push(player);
      }
    }
  }

  console.log(`\n=== DIRECT NAME SEARCH FOR NOT-FOUND (${notFound.length}) ===\n`);

  const stillNotFound = [];
  for (const player of notFound) {
    console.log(`  Searching: "${player.name}"...`);
    const found = await searchPlayerByName(player.name);
    if (found) {
      console.log(`  ✓ id:${player.id} "${player.name}" → ${found.id} "${found.name}" (score:${found.score})`);
      results[player.id] = found.id;
    } else {
      console.log(`  ✗ id:${player.id} "${player.name}" - NOT FOUND`);
      stillNotFound.push(player);
    }
  }

  // Output results
  console.log(`\n\n=== RESULTS SUMMARY ===`);
  console.log(`Found: ${Object.keys(results).length}/${MISSING_PLAYERS.length}`);
  console.log(`Still missing: ${stillNotFound.length}`);

  console.log(`\n=== TYPESCRIPT UPDATE LINES ===`);
  for (const [fileId, apiId] of Object.entries(results)) {
    console.log(`id:${fileId} → photoId: ${apiId}`);
  }

  if (stillNotFound.length > 0) {
    console.log(`\n=== STILL NOT FOUND ===`);
    for (const p of stillNotFound) {
      console.log(`  { id: ${p.id}, name: '${p.name}', team: '${p.team}' }`);
    }
  }

  // Output as JSON for easy processing
  const fs = await import('fs');
  fs.writeFileSync('/c/Users/firat/macapp/photo_ids_result.json', JSON.stringify(results, null, 2));
  console.log(`\nResults saved to photo_ids_result.json`);
}

main().catch(console.error);
