#!/usr/bin/env node
// Phase 5: Try season=2025 for Turkish teams + show full rosters

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
    .replace(/ö/g,'o').replace(/ü/g,'u').replace(/İ/g,'i')
    .replace(/é/g,'e').replace(/è/g,'e').replace(/ê/g,'e')
    .replace(/á/g,'a').replace(/à/g,'a').replace(/â/g,'a').replace(/ã/g,'a')
    .replace(/ó/g,'o').replace(/ò/g,'o').replace(/ô/g,'o')
    .replace(/ú/g,'u').replace(/ù/g,'u').replace(/û/g,'u')
    .replace(/í/g,'i').replace(/ì/g,'i').replace(/î/g,'i')
    .replace(/ñ/g,'n').replace(/ý/g,'y').replace(/ø/g,'o')
    .replace(/å/g,'a').replace(/æ/g,'ae').replace(/ß/g,'ss')
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

async function getTeamPlayers(teamId, season) {
  const players = [];
  let page = 1;
  while (true) {
    const data = await apiGet(`/players?team=${teamId}&season=${season}&page=${page}`);
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

// Correct Turkish team IDs from Phase 4
const TURKISH_TEAMS = {
  'Galatasaray':  645,
  'Beşiktaş':     549,
  'Trabzonspor':  998,
  'Başakşehir':   564,
  'Samsunspor':   3603,
  'Gaziantep':    3573,
  'Göztepe':      994,
};

const TURKISH_MISSING = {
  'Galatasaray': [
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
    { id: 340, name: 'Wagner Pina' },
    { id: 346, name: 'Chibuike Nwaiwu' },
    { id: 356, name: 'Paul Onuachu' },
    { id: 378, name: 'Benjamin Bouchouari' },
    { id: 385, name: 'Mathias Løvik' },
  ],
  'Başakşehir': [
    { id: 350, name: 'Eldor Shomurodov' },
    { id: 352, name: 'Abbosbek Fayzullaev' },
    { id: 362, name: 'Amine Harit' },
    { id: 392, name: 'Bertuğ Yıldırım' },
  ],
  'Samsunspor': [
    { id: 371, name: 'Cherif Ndiaye' },
    { id: 389, name: 'Antoine Makoumbou' },
    { id: 399, name: 'Afonso Sousa' },
  ],
  'Gaziantep': [
    { id: 394, name: 'Mohamed Bayo' },
  ],
  'Göztepe': [
    { id: 381, name: 'Janderson' },
    { id: 398, name: 'Filip Krastev' },
  ],
};

async function main() {
  const results = {};
  const notFound = [];

  // Try both season=2024 and season=2025 for Turkish teams
  for (const [teamName, players] of Object.entries(TURKISH_MISSING)) {
    const teamId = TURKISH_TEAMS[teamName];
    console.log(`\n=== ${teamName} (id:${teamId}) ===`);

    // Try season=2025 first, then 2024
    let allPlayers = [];
    for (const season of [2025, 2024]) {
      const p = await getTeamPlayers(teamId, season);
      if (p.length > 0) {
        console.log(`  season ${season}: ${p.length} players`);
        // Add unique players
        for (const pl of p) {
          if (!allPlayers.find(x => x.id === pl.id)) allPlayers.push(pl);
        }
      }
    }
    console.log(`  Total unique: ${allPlayers.length}`);
    // Show all players
    for (const p of allPlayers) {
      console.log(`    ${p.id}: "${p.name}" (${p.firstname} ${p.lastname})`);
    }

    for (const p of players) {
      let best = null, bestScore = 0;
      for (const tp of allPlayers) {
        const fn = `${tp.firstname} ${tp.lastname}`.trim();
        const s = Math.max(strictMatch(tp.name, p.name), fn.length > 2 ? strictMatch(fn, p.name) : 0);
        if (s > bestScore) { bestScore=s; best=tp; }
      }
      if (best && bestScore >= 83) {
        console.log(`  ✓ id:${p.id} "${p.name}" → ${best.id} "${best.name}" (score:${bestScore})`);
        results[p.id] = best.id;
      } else {
        if (best) console.log(`  ✗ id:${p.id} "${p.name}" - best: "${best.name}" (${best.id}) score:${bestScore}`);
        else console.log(`  ✗ id:${p.id} "${p.name}" - no match`);
        notFound.push(p);
      }
    }
  }

  // International fixes - search with multiple seasons
  console.log('\n=== International players ===');
  const INTL = [
    { id: 76, name: 'Álvaro Carreras', teamId: 541 },   // Real Madrid
    { id: 154, name: 'Junior Kroupi', teamId: 35 },       // Bournemouth
    { id: 312, name: 'Dorgeles Nene', teamId: 611 },      // Fenerbahçe
    { id: 58, name: 'Nico Paz', teamId: 517 },            // Como
    { id: 75, name: 'Luka Vuskovic', teamId: 171 },       // Hamburg
    { id: 198, name: 'Said El Mala', teamId: 163 },       // Köln
    { id: 129, name: 'Pio Esposito', teamId: 505 },       // Inter
  ];

  for (const p of INTL) {
    let allPlayers = [];
    for (const season of [2025, 2024]) {
      const pl = await getTeamPlayers(p.teamId, season);
      for (const tp of pl) {
        if (!allPlayers.find(x => x.id === tp.id)) allPlayers.push(tp);
      }
    }
    console.log(`\n"${p.name}" team=${p.teamId} total=${allPlayers.length}`);

    let best = null, bestScore = 0;
    for (const tp of allPlayers) {
      const fn = `${tp.firstname} ${tp.lastname}`.trim();
      const s = Math.max(strictMatch(tp.name, p.name), fn.length > 2 ? strictMatch(fn, p.name) : 0);
      if (s > bestScore) { bestScore=s; best=tp; }
    }

    // Also show partial matches
    for (const tp of allPlayers) {
      const fn = `${tp.firstname} ${tp.lastname}`.trim();
      const sn = normalize(p.name);
      const an = normalize(tp.name);
      const afn = normalize(fn);
      // Check if any word from search appears in API name
      const words = sn.split(' ').filter(w => w.length >= 4);
      if (words.some(w => an.includes(w) || afn.includes(w))) {
        const s = Math.max(strictMatch(tp.name, p.name), fn.length > 2 ? strictMatch(fn, p.name) : 0);
        console.log(`  partial: ${tp.id} "${tp.name}" / "${fn}" score:${s}`);
      }
    }

    if (best && bestScore >= 76) {
      console.log(`  ✓ id:${p.id} "${p.name}" → ${best.id} "${best.name}" (score:${bestScore})`);
      results[p.id] = best.id;
    } else {
      console.log(`  ✗ NOT FOUND`);
      notFound.push(p);
    }
  }

  console.log('\n\n=== PHASE 5 RESULTS ===');
  for (const [id, photoId] of Object.entries(results)) {
    console.log(`id:${id} → photoId: ${photoId}`);
  }
  console.log(`\nFound: ${Object.keys(results).length}, Not found: ${notFound.length}`);
  for (const p of notFound) {
    console.log(`  STILL MISSING: id:${p.id} "${p.name}"`);
  }

  const { writeFileSync } = await import('fs');
  writeFileSync('photo_ids_phase5.json', JSON.stringify(results, null, 2));
  console.log('Saved to photo_ids_phase5.json');
}

main().catch(console.error);
