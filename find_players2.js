#!/usr/bin/env node
// Corrected player finder - strict name matching + league-based search

const API_KEY = '7c1366cf6568e4f8f5f61dc52a662d46';
const BASE_URL = 'https://v3.football.api-sports.io';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function apiGet(endpoint) {
  await sleep(350);
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${endpoint}`);
  const data = await res.json();
  return data;
}

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
    .replace(/ï/g, 'i').replace(/ë/g, 'e')
    .replace(/ā/g, 'a').replace(/ē/g, 'e').replace(/ī/g, 'i')
    .replace(/ō/g, 'o').replace(/ū/g, 'u').replace(/ř/g, 'r')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// STRICT name matching - no loose "allFound" logic
function strictNameMatch(apiName, searchName) {
  const an = normalize(apiName);
  const sn = normalize(searchName);

  if (an === sn) return 100;
  if (an.includes(sn) || sn.includes(an)) return 95;

  const aParts = an.split(' ').filter(Boolean);
  const sParts = sn.split(' ').filter(Boolean);

  const aLast = aParts[aParts.length - 1];
  const sLast = sParts[sParts.length - 1];

  // Last name must match exactly and be 4+ chars
  if (aLast && sLast && aLast.length >= 4 && sLast.length >= 4 && aLast === sLast) {
    const aFirst = aParts[0];
    const sFirst = sParts[0];
    if (aFirst && sFirst) {
      if (aFirst === sFirst) return 92;
      if (aFirst.length === 1 && sFirst.startsWith(aFirst)) return 88; // API: "M." search: "Matteo"
      if (sFirst.length === 1 && aFirst.startsWith(sFirst)) return 88;
      if (aFirst[0] === sFirst[0]) return 83;
    }
    return 75; // last name match only
  }

  // Single-name players (Maestro, Antony, Estêvão, etc.)
  if (sParts.length === 1 && sn.length >= 4) {
    if (an === sn || an.includes(sn) || sn.includes(an)) return 100;
    if (aParts.includes(sn)) return 90;
  }

  return 0;
}

// Get all players for a team (handle pagination)
async function getTeamPlayers(teamId) {
  const players = [];
  let page = 1;
  while (true) {
    const data = await apiGet(`/players?team=${teamId}&season=2024&page=${page}`);
    if (!data.response || data.response.length === 0) break;
    for (const entry of data.response) {
      players.push({
        id: entry.player.id,
        name: entry.player.name,
        firstname: entry.player.firstname || '',
        lastname: entry.player.lastname || '',
      });
    }
    if (data.paging && page >= data.paging.total) break;
    page++;
  }
  return players;
}

// Search player by name within a league
async function searchInLeague(name, leagueId) {
  const normName = normalize(name);
  const parts = normName.split(' ').filter(Boolean);

  // Try last name, then first name
  const candidates = [];
  if (parts.length > 0) candidates.push(parts[parts.length - 1]);
  if (parts.length > 1) candidates.push(parts[0]);

  // Also try the full normalized name without special chars
  const simpleForm = name
    .replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/İ/g, 'I')
    .replace(/é/g, 'e').replace(/è/g, 'e').replace(/á/g, 'a')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
    .replace(/ø/g, 'o').replace(/ő/g, 'o').replace(/ř/g, 'r')
    .replace(/['-]/g, '');
  const simpleParts = simpleForm.split(' ').filter(Boolean);
  if (simpleParts.length > 0) candidates.push(simpleParts[simpleParts.length - 1]);
  if (simpleParts.length > 1) candidates.push(simpleParts[0]);

  const seen = new Set();
  const uniqueCandidates = candidates.filter(c => {
    if (c.length < 3) return false;
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });

  for (const searchTerm of uniqueCandidates) {
    // Check alphanumeric only
    const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    if (cleanTerm.length < 3) continue;

    const data = await apiGet(`/players?search=${encodeURIComponent(cleanTerm)}&league=${leagueId}&season=2024`);
    if (!data.response) continue;

    let best = null, bestScore = 0;
    for (const entry of data.response) {
      const pName = entry.player.name || '';
      const fullName = `${entry.player.firstname || ''} ${entry.player.lastname || ''}`.trim();

      const s1 = strictNameMatch(pName, name);
      const s2 = strictNameMatch(fullName, name);
      const score = Math.max(s1, s2);
      if (score > bestScore) {
        bestScore = score;
        best = { id: entry.player.id, name: pName, score };
      }
    }
    if (best && bestScore >= 75) return best;
  }
  return null;
}

// Find team ID by searching
async function findTeamId(searchName, country) {
  const data = await apiGet(`/teams?search=${encodeURIComponent(searchName)}&country=${encodeURIComponent(country)}`);
  if (data.response && data.response.length > 0) {
    return { id: data.response[0].team.id, name: data.response[0].team.name };
  }
  return null;
}

// ===== CONFIRMED GOOD RESULTS FROM FIRST RUN (score >= 85) =====
const CONFIRMED = {
  302: 1454,    // Mattéo Guendouzi → M. Guendouzi
  310: 2869,    // Edson Álvarez → E. Álvarez
  313: 421875,  // Sidiki Chérif → S. Cherif
  325: 617,     // Ederson → Ederson
  336: 161661,  // Archie Brown → A. Brown
  345: 130,     // Nélson Semedo → Nélson Semedo
  361: 37380,   // Anthony Musaba → A. Musaba
  379: 364594,  // Yiğit Efe Demir → Y. Demir
  382: 2290,    // N'Golo Kanté → N. Kanté
  348: 237120,  // Maestro → Maestro
  395: 367637,  // Ümit Akdağ → Ü. Akdağ
  375: 64190,   // Yahia Fofana → Y. Fofana
  376: 843,     // Fedor Chalov → F. Chalov
  393: 167659,  // Kazeem Olaigbe → K. Olaigbe
  397: 402493,  // Deniz Ertaş → D. Ertaş
  23: 174565,   // Hugo Ekitiké
  30: 425733,   // Estêvão
  34: 47315,    // Martín Zubimendi
  40: 513776,   // Yan Diomande
  45: 19281,    // Antoine Semenyo
  59: 361497,   // Dean Huijsen
  61: 156477,   // Rayan Cherki
  64: 158054,   // Nick Woltemade
  70: 18979,    // Viktor Gyökeres
  93: 15911,    // Mohammed Kudus
  96: 438688,   // Ayyoub Bouaddi
  102: 196156,  // Igor Thiago (as "Thiago" at Brentford)
  103: 183799,  // Nico Williams
  106: 22147,   // Manu Koné
  107: 18592,   // Iliman Ndiaye
  126: 449249,  // Franco Mastantuono
  127: 358628,  // Samu Aghehowa (as "Samu")
  128: 354753,  // Ousmane Diomande
  130: 339887,  // Can Uzun
  131: 305834,  // Andrey Santos
  132: 17661,   // Jarrad Branthwaite
  133: 161671,  // Ilya Zabarnyi
  136: 162761,  // Castello Lukeba
  139: 163189,  // Malick Thiaw
  140: 162714,  // Amadou Onana
  141: 161933,  // Nico González
  142: 7712,    // Morten Hjulmand
  143: 137210,  // Angelo Stiller
  149: 419582,  // Geovany Quenda
  150: 505295,  // Christian Kofane
  151: 407806,  // Rayan (Bournemouth)
  152: 383685,  // Yankuba Minteh
  153: 349001,  // Wesley (Roma)
  156: 409216,  // Senny Mayulu
  159: 304853,  // Alex Scott
  165: 182519,  // Alberto Moleiro
  168: 9971,    // Antony
  175: 265595,  // Gonçalo Inácio
  176: 128533,  // Jamie Leweling
  178: 20696,   // Pape Gueye
  182: 20995,   // Maxence Lacroix
  187: 369,     // Diogo Costa
  196: 404097,  // Rodrigo Mora
  197: 340279,  // Vitor Roque
  199: 387643,  // Bazoumana Touré
  200: 390742,  // Joaquín Panichelli
  203: 383780,  // Mikel Jauregizar
  204: 406244,  // Johan Manzambi
  206: 328089,  // Archie Gray
  208: 341642,  // Jorrel Hato
  210: 336585,  // Mateus Fernandes
  211: 311067,  // Santiago Castro
  212: 319572,  // Valentín Barco
  213: 275651,  // Ange-Yoan Bonny
  214: 342022,  // Michael Kayode
  215: 284797,  // Dango Ouattara
  216: 360114,  // Abdukodir Khusanov
  217: 195103,  // João Gomes
  218: 152856,  // Evanilson
  219: 280074,  // Nathaniel Brown
  221: 284492,  // Lewis Hall
  223: 9363,    // Igor Paixão
  224: 333682,  // Cristhian Mosquera
  227: 45826,   // Strahinja Pavlović
  228: 128398,  // Oihan Sancet
  229: 184226,  // Yeremy Pino
  236: 895,     // James Garner
  237: 19192,   // Jacob Ramsey
  241: 178077,  // Kevin Schade
  242: 129711,  // Brennan Johnson
  249: 41112,   // Francisco Trincão (as "Trincão")
  250: 2218,    // Ismaïla Sarr
};

// Players needing fresh search (Turkish teams had wrong squad IDs)
// AND players that were "not found" in first run
const NEED_SEARCH = [
  // Turkish team players - wrong squad IDs
  { id: 303, name: 'Barış Alper Yılmaz', team: 'Galatasaray', teamId: 1924, league: 203 },
  { id: 305, name: 'Wilfried Singo', team: 'Galatasaray', teamId: 1924, league: 203 },
  { id: 306, name: 'Noa Lang', team: 'Galatasaray', teamId: 1924, league: 203 },
  { id: 324, name: 'Yáser Asprilla', team: 'Galatasaray', teamId: 1924, league: 203 },
  { id: 358, name: 'Renato Nhaga', team: 'Galatasaray', teamId: 1924, league: 203 },
  { id: 304, name: 'Orkun Kökçü', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 314, name: 'Emmanuel Agbadou', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 320, name: 'Hyeon-gyu Oh', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 321, name: 'El Bilal Touré', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 326, name: 'Kristjan Asllani', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 328, name: 'Jota Silva', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 335, name: 'Wilfred Ndidi', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 343, name: 'Amir Murillo', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 351, name: 'Tiago Djaló', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 367, name: 'Taylan Bulut', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 368, name: 'Junior Olaitan', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 369, name: 'Yasin Özcan', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 370, name: 'Mustafa Hekimoğlu', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 386, name: 'Rıdvan Yılmaz', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 387, name: 'Milot Rashica', team: 'Beşiktaş', teamId: 609, league: 203 },
  { id: 317, name: 'Christ Inao Oulaï', team: 'Trabzonspor', teamId: 636, league: 203 },
  { id: 327, name: 'André Onana', team: 'Trabzonspor', teamId: 636, league: 203 },
  { id: 333, name: 'Ernest Muci', team: 'Trabzonspor', teamId: 636, league: 203 },
  { id: 340, name: 'Wagner Pina', team: 'Trabzonspor', teamId: 636, league: 203 },
  { id: 346, name: 'Chibuike Nwaiwu', team: 'Trabzonspor', teamId: 636, league: 203 },
  { id: 355, name: 'Tim Jabol-Folcarelli', team: 'Trabzonspor', teamId: 636, league: 203 },
  { id: 356, name: 'Paul Onuachu', team: 'Trabzonspor', teamId: 636, league: 203 },
  { id: 378, name: 'Benjamin Bouchouari', team: 'Trabzonspor', teamId: 636, league: 203 },
  { id: 385, name: 'Mathias Løvik', team: 'Trabzonspor', teamId: 636, league: 203 },
  { id: 337, name: 'Juan', team: 'Göztepe', teamId: 593, league: 203 },
  { id: 338, name: 'Anthony Dennis', team: 'Göztepe', teamId: 593, league: 203 },
  { id: 364, name: 'Arda Okan Kurtulan', team: 'Göztepe', teamId: 593, league: 203 },
  { id: 365, name: 'Taha Altıkardeş', team: 'Göztepe', teamId: 593, league: 203 },
  { id: 380, name: 'Malcom Bokele', team: 'Göztepe', teamId: 593, league: 203 },
  { id: 381, name: 'Janderson', team: 'Göztepe', teamId: 593, league: 203 },
  { id: 398, name: 'Filip Krastev', team: 'Göztepe', teamId: 593, league: 203 },
  { id: 350, name: 'Eldor Shomurodov', team: 'Başakşehir', teamId: 2282, league: 203 },
  { id: 352, name: 'Abbosbek Fayzullaev', team: 'Başakşehir', teamId: 2282, league: 203 },
  { id: 362, name: 'Amine Harit', team: 'Başakşehir', teamId: 2282, league: 203 },
  { id: 363, name: 'Jerome Opoku', team: 'Başakşehir', teamId: 2282, league: 203 },
  { id: 390, name: 'Christopher Operi', team: 'Başakşehir', teamId: 2282, league: 203 },
  { id: 392, name: 'Bertuğ Yıldırım', team: 'Başakşehir', teamId: 2282, league: 203 },
  { id: 400, name: 'Festy Ebosele', team: 'Başakşehir', teamId: 2282, league: 203 },
  { id: 357, name: 'Carlo Holse', team: 'Samsunspor', teamId: 635, league: 203 },
  { id: 371, name: 'Cherif Ndiaye', team: 'Samsunspor', teamId: 635, league: 203 },
  { id: 383, name: 'Marius Mouandilmadji', team: 'Samsunspor', teamId: 635, league: 203 },
  { id: 388, name: 'Rick van Drongelen', team: 'Samsunspor', teamId: 635, league: 203 },
  { id: 389, name: 'Antoine Makoumbou', team: 'Samsunspor', teamId: 635, league: 203 },
  { id: 399, name: 'Afonso Sousa', team: 'Samsunspor', teamId: 635, league: 203 },
  { id: 394, name: 'Mohamed Bayo', team: 'Gaziantep', teamId: 1008, league: 203 },
  { id: 373, name: 'Kacper Kozlowski', team: 'Gaziantep', teamId: 1008, league: 203 },
  { id: 396, name: 'İrfan Can Kahveci', team: 'Kasımpaşa', teamId: null, league: 203 },
  // International - wrong matches in first run
  { id: 76, name: 'Álvaro Carreras', team: 'Real Madrid', teamId: 541, league: 140 },
  { id: 90, name: 'Jérémy Jacquet', team: 'Stade Rennes', teamId: 111, league: 61 },
  { id: 129, name: 'Pio Esposito', team: 'Inter Milan', teamId: 505, league: 135 },
  { id: 144, name: 'Jørgen Strand Larsen', team: 'Manchester City', teamId: 50, league: 39 },
  { id: 154, name: 'Junior Kroupi', team: 'AFC Bournemouth', teamId: 35, league: 39 },
  { id: 201, name: 'Konstantinos Karetsas', team: 'KRC Genk', teamId: 240, league: 144 },
  { id: 244, name: 'Lucas Paquetá', team: 'West Ham United', teamId: 48, league: 39 },
  { id: 312, name: 'Dorgeles Nene', team: 'Fenerbahçe', teamId: 611, league: 203 },
  // International not found in first run
  { id: 101, name: "Nico O'Reilly", team: 'Manchester City', teamId: 50, league: 39 },
  { id: 58, name: 'Nico Paz', team: 'Como 1907', teamId: 517, league: 135 },
  { id: 75, name: 'Luka Vuskovic', team: 'Hamburger SV', teamId: 171, league: 78 },
  { id: 198, name: 'Said El Mala', team: '1.FC Köln', teamId: 163, league: 78 },
];

async function main() {
  const results = { ...CONFIRMED };
  const notFound = [];

  console.log('=== PHASE 1: Team-based player search ===\n');

  // Group by team for efficient fetching
  const teamGroups = {};
  for (const p of NEED_SEARCH) {
    if (!teamGroups[p.team]) teamGroups[p.team] = { teamId: p.teamId, league: p.league, players: [] };
    teamGroups[p.team].players.push(p);
  }

  for (const [teamName, { teamId, league, players }] of Object.entries(teamGroups)) {
    console.log(`\n--- ${teamName} (${players.length} players) ---`);

    if (!teamId) {
      // Search for team ID
      console.log(`  Searching for team ID...`);
      const found = await findTeamId(teamName, teamName.includes('Başakşehir') ? 'Turkey' : 'Turkey');
      if (found) {
        console.log(`  Found: ${found.name} (id=${found.id})`);
        // Use found.id
        const teamPlayers = await getTeamPlayers(found.id);
        console.log(`  Players fetched: ${teamPlayers.length}`);
        matchTeamPlayers(players, teamPlayers, results, notFound);
      } else {
        // Fall back to league search
        for (const p of players) {
          const r = await searchInLeague(p.name, league);
          if (r) {
            console.log(`  ✓ id:${p.id} "${p.name}" → ${r.id} "${r.name}" (score:${r.score})`);
            results[p.id] = r.id;
          } else {
            console.log(`  ✗ id:${p.id} "${p.name}" - NOT FOUND`);
            notFound.push(p);
          }
        }
      }
      continue;
    }

    // Fetch team players
    const teamPlayers = await getTeamPlayers(teamId);
    console.log(`  Players fetched: ${teamPlayers.length}`);

    if (teamPlayers.length === 0) {
      console.log(`  No players found, falling back to league search`);
      for (const p of players) {
        const r = await searchInLeague(p.name, league);
        if (r) {
          console.log(`  ✓ id:${p.id} "${p.name}" → ${r.id} "${r.name}" (score:${r.score})`);
          results[p.id] = r.id;
        } else {
          console.log(`  ✗ id:${p.id} "${p.name}" - NOT FOUND`);
          notFound.push(p);
        }
      }
      continue;
    }

    // Match players from team roster
    const unmatched = matchTeamPlayers(players, teamPlayers, results, notFound);

    // For unmatched, try league search
    for (const p of unmatched) {
      console.log(`  Trying league search for "${p.name}"...`);
      const r = await searchInLeague(p.name, league);
      if (r) {
        console.log(`  ✓ id:${p.id} "${p.name}" → ${r.id} "${r.name}" (score:${r.score})`);
        results[p.id] = r.id;
        // Remove from notFound if it was added
        const idx = notFound.findIndex(x => x.id === p.id);
        if (idx >= 0) notFound.splice(idx, 1);
      }
    }
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`Total confirmed from run 1: ${Object.keys(CONFIRMED).length}`);
  console.log(`New finds this run: ${Object.keys(results).length - Object.keys(CONFIRMED).length}`);
  console.log(`Total found: ${Object.keys(results).length}`);
  console.log(`Still missing: ${notFound.length}`);

  console.log('\n=== NEW TYPESCRIPT UPDATE LINES (to patch on existing) ===');
  for (const [fileId, apiId] of Object.entries(results)) {
    if (!CONFIRMED[fileId]) {
      console.log(`id:${fileId} → photoId: ${apiId}`);
    }
  }

  console.log('\n=== ALL UPDATE LINES ===');
  for (const [fileId, apiId] of Object.entries(results)) {
    console.log(`id:${fileId} → photoId: ${apiId}`);
  }

  if (notFound.length > 0) {
    console.log('\n=== STILL NOT FOUND ===');
    for (const p of notFound) {
      console.log(`  { id: ${p.id}, name: '${p.name}', team: '${p.team}' }`);
    }
  }

  // Save JSON
  const { writeFileSync } = await import('fs');
  writeFileSync('photo_ids_result.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to photo_ids_result.json');
}

function matchTeamPlayers(searchPlayers, teamPlayers, results, notFound) {
  const unmatched = [];
  for (const p of searchPlayers) {
    let best = null, bestScore = 0;
    for (const tp of teamPlayers) {
      const s1 = strictNameMatch(tp.name, p.name);
      const fullName = `${tp.firstname} ${tp.lastname}`.trim();
      const s2 = fullName.length > 2 ? strictNameMatch(fullName, p.name) : 0;
      const score = Math.max(s1, s2);
      if (score > bestScore) {
        bestScore = score;
        best = tp;
      }
    }
    if (best && bestScore >= 75) {
      console.log(`  ✓ id:${p.id} "${p.name}" → ${best.id} "${best.name}" (score:${bestScore})`);
      results[p.id] = best.id;
    } else {
      console.log(`  ✗ id:${p.id} "${p.name}" - not matched (best: ${best ? best.name : 'none'} score:${bestScore})`);
      unmatched.push(p);
    }
  }
  return unmatched;
}

main().catch(console.error);
