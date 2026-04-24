#!/usr/bin/env node
// Phase 4: Get correct Turkish team IDs + find all remaining players

const API_KEY = '7c1366cf6568e4f8f5f61dc52a662d46';
const BASE_URL = 'https://v3.football.api-sports.io';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function apiGet(endpoint) {
  await sleep(400);
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${endpoint}`);
  return res.json();
}

function normalize(str) {
  return str.toLowerCase()
    .replace(/ç/g,'c').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ı/g,'i')
    .replace(/ö/g,'o').replace(/ü/g,'u').replace(/İ/g,'i').replace(/Ç/g,'c')
    .replace(/Ş/g,'s').replace(/Ğ/g,'g').replace(/é/g,'e').replace(/è/g,'e')
    .replace(/ê/g,'e').replace(/á/g,'a').replace(/à/g,'a').replace(/â/g,'a')
    .replace(/ã/g,'a').replace(/ó/g,'o').replace(/ò/g,'o').replace(/ô/g,'o')
    .replace(/ú/g,'u').replace(/ù/g,'u').replace(/û/g,'u').replace(/í/g,'i')
    .replace(/ì/g,'i').replace(/î/g,'i').replace(/ñ/g,'n').replace(/ý/g,'y')
    .replace(/ø/g,'o').replace(/å/g,'a').replace(/æ/g,'ae').replace(/ß/g,'ss')
    .replace(/ž/g,'z').replace(/š/g,'s').replace(/č/g,'c').replace(/ć/g,'c')
    .replace(/đ/g,'d').replace(/ł/g,'l').replace(/ą/g,'a').replace(/ę/g,'e')
    .replace(/ź/g,'z').replace(/ń/g,'n').replace(/ï/g,'i').replace(/ë/g,'e')
    .replace(/ā/g,'a').replace(/ē/g,'e').replace(/ī/g,'i').replace(/ō/g,'o')
    .replace(/ū/g,'u').replace(/ř/g,'r').replace(/ő/g,'o').replace(/ű/g,'u')
    .replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
}

function strictMatch(apiName, searchName) {
  const an = normalize(apiName);
  const sn = normalize(searchName);
  if (an === sn) return 100;
  if (an.includes(sn) || sn.includes(an)) return 95;
  const ap = an.split(' ').filter(Boolean);
  const sp = sn.split(' ').filter(Boolean);
  const al = ap[ap.length-1];
  const sl = sp[sp.length-1];
  if (al && sl && al === sl && al.length >= 5) {
    const af = ap[0]; const sf = sp[0];
    if (af && sf) {
      if (af === sf) return 92;
      if ((af.length===1 && sf.startsWith(af)) || (sf.length===1 && af.startsWith(sf))) return 88;
      if (af[0] === sf[0]) return 83;
    }
    return 76;
  }
  if (sp.length===1 && sn.length>=4 && (an===sn || ap.some(p=>p===sn))) return 95;
  return 0;
}

async function getTeamPlayers(teamId) {
  const players = [];
  let page = 1;
  while (true) {
    const data = await apiGet(`/players?team=${teamId}&season=2024&page=${page}`);
    if (!data.response || data.response.length === 0) break;
    for (const e of data.response) {
      players.push({
        id: e.player.id,
        name: e.player.name,
        firstname: e.player.firstname || '',
        lastname: e.player.lastname || '',
      });
    }
    if (data.paging && page >= data.paging.total) break;
    page++;
  }
  return players;
}

async function searchPlayerInTeam(players, searchName, minScore = 83) {
  let best = null, bestScore = 0;
  for (const p of players) {
    const fn = `${p.firstname} ${p.lastname}`.trim();
    const s = Math.max(strictMatch(p.name, searchName), fn.length > 2 ? strictMatch(fn, searchName) : 0);
    if (s > bestScore) { bestScore=s; best=p; }
  }
  return best && bestScore >= minScore ? { ...best, score: bestScore } : null;
}

async function main() {
  // Step 1: Get all Süper Lig teams
  console.log('=== Step 1: Get Süper Lig (league=203) teams ===');
  const teamsData = await apiGet('/teams?league=203&season=2024');
  const turkTeams = {};
  if (teamsData.response) {
    for (const t of teamsData.response) {
      const name = t.team.name;
      const id = t.team.id;
      turkTeams[name] = id;
      console.log(`  ${id}: ${name}`);
    }
  }
  console.log(`Total teams: ${Object.keys(turkTeams).length}`);

  // Build name → ID mapping (fuzzy)
  function findTurkTeamId(searchName) {
    const sn = normalize(searchName);
    for (const [name, id] of Object.entries(turkTeams)) {
      if (normalize(name).includes(sn) || sn.includes(normalize(name))) return id;
    }
    // Try partial
    for (const [name, id] of Object.entries(turkTeams)) {
      const parts = sn.split(' ');
      if (parts.some(p => p.length >= 5 && normalize(name).includes(p))) return id;
    }
    return null;
  }

  // Step 2: Players by team
  const TURKISH_MISSING = {
    'Galatasaray': [
      { id: 303, name: 'Barış Alper Yılmaz' },
      { id: 305, name: 'Wilfried Singo' },
      { id: 306, name: 'Noa Lang' },
      { id: 324, name: 'Yáser Asprilla' },
      { id: 358, name: 'Renato Nhaga' },
    ],
    'Beşiktaş': [
      { id: 304, name: 'Orkun Kökçü' },
      { id: 314, name: 'Emmanuel Agbadou' },
      { id: 320, name: 'Hyeon-gyu Oh' },
      { id: 321, name: 'El Bilal Touré' },
      { id: 326, name: 'Kristjan Asllani' },
      { id: 328, name: 'Jota Silva' },
      { id: 335, name: 'Wilfred Ndidi' },
      { id: 343, name: 'Amir Murillo' },
      { id: 351, name: 'Tiago Djaló' },
      { id: 367, name: 'Taylan Bulut' },
      { id: 368, name: 'Junior Olaitan' },
      { id: 386, name: 'Rıdvan Yılmaz' },
    ],
    'Trabzonspor': [
      { id: 317, name: 'Christ Inao Oulaï' },
      { id: 327, name: 'André Onana' },
      { id: 333, name: 'Ernest Muci' },
      { id: 340, name: 'Wagner Pina' },
      { id: 346, name: 'Chibuike Nwaiwu' },
      { id: 355, name: 'Tim Jabol-Folcarelli' },
      { id: 356, name: 'Paul Onuachu' },
      { id: 378, name: 'Benjamin Bouchouari' },
      { id: 385, name: 'Mathias Løvik' },
    ],
    'Başakşehir': [
      { id: 350, name: 'Eldor Shomurodov' },
      { id: 352, name: 'Abbosbek Fayzullaev' },
      { id: 362, name: 'Amine Harit' },
      { id: 363, name: 'Jerome Opoku' },
      { id: 390, name: 'Christopher Operi' },
      { id: 392, name: 'Bertuğ Yıldırım' },
      { id: 400, name: 'Festy Ebosele' },
    ],
    'Samsunspor': [
      { id: 371, name: 'Cherif Ndiaye' },
      { id: 383, name: 'Marius Mouandilmadji' },
      { id: 388, name: 'Rick van Drongelen' },
      { id: 389, name: 'Antoine Makoumbou' },
      { id: 399, name: 'Afonso Sousa' },
    ],
    'Gaziantep': [
      { id: 394, name: 'Mohamed Bayo' },
      { id: 373, name: 'Kacper Kozlowski' },
    ],
    'Göztepe': [
      { id: 338, name: 'Anthony Dennis' },
      { id: 365, name: 'Taha Altıkardeş' },
      { id: 380, name: 'Malcom Bokele' },
      { id: 381, name: 'Janderson' },
      { id: 398, name: 'Filip Krastev' },
    ],
  };

  const results = {};
  const notFound = [];
  const teamPlayerCache = {};

  console.log('\n=== Step 2: Turkish team players search ===');
  for (const [teamSearch, players] of Object.entries(TURKISH_MISSING)) {
    const teamId = findTurkTeamId(teamSearch);
    console.log(`\n--- ${teamSearch} (id:${teamId}) ---`);

    if (!teamId) {
      console.log(`  Team ID not found! Skipping...`);
      for (const p of players) notFound.push(p);
      continue;
    }

    if (!teamPlayerCache[teamId]) {
      teamPlayerCache[teamId] = await getTeamPlayers(teamId);
    }
    const teamPlayers = teamPlayerCache[teamId];
    console.log(`  ${teamPlayers.length} players in squad`);

    // Show first 20 players for reference
    for (const p of teamPlayers.slice(0, 20)) {
      console.log(`    ${p.id}: ${p.name} (${p.firstname} ${p.lastname})`);
    }

    for (const p of players) {
      const match = await searchPlayerInTeam(teamPlayers, p.name);
      if (match) {
        console.log(`  ✓ id:${p.id} "${p.name}" → ${match.id} "${match.name}" (score:${match.score})`);
        results[p.id] = match.id;
      } else {
        // Show closest match
        let best = null, bestScore = 0;
        for (const tp of teamPlayers) {
          const fn = `${tp.firstname} ${tp.lastname}`.trim();
          const s = Math.max(strictMatch(tp.name, p.name), fn.length > 2 ? strictMatch(fn, p.name) : 0);
          if (s > bestScore) { bestScore=s; best=tp; }
        }
        if (best) console.log(`  ✗ id:${p.id} "${p.name}" - closest: "${best.name}" (${best.id}) score:${bestScore}`);
        else console.log(`  ✗ id:${p.id} "${p.name}" - no match`);
        notFound.push(p);
      }
    }
  }

  // Step 3: International not-found
  console.log('\n=== Step 3: International not-found players ===');
  const INTL_MISSING = [
    { id: 76, name: 'Álvaro Carreras', teamId: 541, altSearch: 'Carreras' },
    { id: 129, name: 'Pio Esposito', teamId: 505, altSearch: 'Esposito' },
    { id: 154, name: 'Junior Kroupi', teamId: 35, altSearch: 'Kroupi' },
    { id: 312, name: 'Dorgeles Nene', teamId: 611, altSearch: 'Dorgeles' },
    { id: 58, name: 'Nico Paz', teamId: 517, altSearch: 'Nico' },
    { id: 75, name: 'Luka Vuskovic', teamId: 171, altSearch: 'Vuskovic' },
    { id: 198, name: 'Said El Mala', teamId: 163, altSearch: 'Mala' },
  ];

  for (const p of INTL_MISSING) {
    let teamPlayers = teamPlayerCache[p.teamId];
    if (!teamPlayers) {
      teamPlayers = await getTeamPlayers(p.teamId);
      teamPlayerCache[p.teamId] = teamPlayers;
    }
    console.log(`\n"${p.name}" - team has ${teamPlayers.length} players`);

    // Show all players for small teams or relevant matches
    for (const tp of teamPlayers) {
      const fn = `${tp.firstname} ${tp.lastname}`.trim();
      const s = Math.max(strictMatch(tp.name, p.name), fn.length>2 ? strictMatch(fn, p.name):0);
      if (s > 0 || normalize(tp.name).includes(normalize(p.altSearch)) || normalize(fn).includes(normalize(p.altSearch))) {
        console.log(`  MATCH: ${tp.id}: "${tp.name}" (${fn}) score:${s}`);
      }
    }

    const match = await searchPlayerInTeam(teamPlayers, p.name, 76);
    if (match) {
      console.log(`  ✓ id:${p.id} "${p.name}" → ${match.id} "${match.name}" (score:${match.score})`);
      results[p.id] = match.id;
    } else {
      console.log(`  ✗ NOT FOUND`);
      notFound.push(p);
    }
  }

  // Output
  console.log('\n\n=== PHASE 4 RESULTS ===');
  const foundList = Object.entries(results).filter(([,v]) => v > 0);
  console.log(`Found this phase: ${foundList.length}`);
  for (const [id, photoId] of foundList) {
    console.log(`id:${id} → photoId: ${photoId}`);
  }
  console.log(`\nNot found (${notFound.length}):`);
  for (const p of notFound) {
    console.log(`  id:${p.id} "${p.name}"`);
  }

  const { writeFileSync } = await import('fs');
  writeFileSync('photo_ids_phase4.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to photo_ids_phase4.json');
}

main().catch(console.error);
