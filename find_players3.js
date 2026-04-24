#!/usr/bin/env node
// Phase 3: Fix wrong matches + find remaining players
// Focus: Trabzonspor correct ID, Gaziantep, suspicious matches

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
    .replace(/Ş/g,'s').replace(/é/g,'e').replace(/è/g,'e').replace(/ê/g,'e')
    .replace(/á/g,'a').replace(/à/g,'a').replace(/â/g,'a').replace(/ã/g,'a')
    .replace(/ó/g,'o').replace(/ò/g,'o').replace(/ô/g,'o').replace(/ú/g,'u')
    .replace(/ù/g,'u').replace(/û/g,'u').replace(/í/g,'i').replace(/ì/g,'i')
    .replace(/î/g,'i').replace(/ñ/g,'n').replace(/ý/g,'y').replace(/ø/g,'o')
    .replace(/å/g,'a').replace(/æ/g,'ae').replace(/ß/g,'ss').replace(/ž/g,'z')
    .replace(/š/g,'s').replace(/č/g,'c').replace(/ć/g,'c').replace(/đ/g,'d')
    .replace(/ł/g,'l').replace(/ą/g,'a').replace(/ę/g,'e').replace(/ź/g,'z')
    .replace(/ń/g,'n').replace(/ï/g,'i').replace(/ë/g,'e').replace(/ā/g,'a')
    .replace(/ē/g,'e').replace(/ī/g,'i').replace(/ō/g,'o').replace(/ū/g,'u')
    .replace(/ř/g,'r').replace(/ő/g,'o').replace(/ű/g,'u')
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
  // Last name match (strict: 5+ chars to avoid false positives like "Silva", "Onana")
  if (al && sl && al === sl) {
    if (al.length < 5) return 0; // Too common, skip
    const af = ap[0]; const sf = sp[0];
    if (af && sf) {
      if (af === sf) return 92;
      if (af.length===1 && sf.startsWith(af)) return 88;
      if (sf.length===1 && af.startsWith(sf)) return 88;
      if (af[0] === sf[0]) return 83;
    }
    return 76;
  }
  // Single-name players
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

async function searchLeague(name, leagueId, minScore = 83) {
  const n = normalize(name);
  const parts = n.split(' ').filter(p => p.length >= 3);
  const simpleForm = name.replace(/[çşğıöüİÇŞÖÜéèáàóòúùíìñøøłřőű'-]/gi,
    c => ({ç:'c',ş:'s',ğ:'g',ı:'i',ö:'o',ü:'u',İ:'i',é:'e',è:'e',á:'a',à:'a',
           ó:'o',ò:'o',ú:'u',ù:'u',í:'i',ì:'i',ñ:'n',ø:'o',ł:'l',ř:'r',ő:'o',ű:'u'}[c]||''));
  const simpleParts = simpleForm.split(' ').filter(p => p.length >= 3);

  const candidates = [...new Set([...parts, ...simpleParts])];

  for (const term of candidates) {
    const clean = term.replace(/[^a-zA-Z0-9]/g,'').trim();
    if (clean.length < 3) continue;
    const data = await apiGet(`/players?search=${encodeURIComponent(clean)}&league=${leagueId}&season=2024`);
    if (!data.response) continue;
    let best = null, bestScore = 0;
    for (const e of data.response) {
      const pn = e.player.name || '';
      const fn = `${e.player.firstname||''} ${e.player.lastname||''}`.trim();
      const s = Math.max(strictMatch(pn,name), strictMatch(fn,name));
      if (s > bestScore) { bestScore=s; best={id:e.player.id,name:pn,score:s}; }
    }
    if (best && bestScore >= minScore) return best;
  }
  return null;
}

async function main() {
  const results = {};

  // === Step 1: Find correct Trabzonspor team ID ===
  console.log('=== Finding Trabzonspor team ID ===');
  const tsData = await apiGet('/teams?search=Trabzonspor&country=Turkey');
  let trabzonsporId = null;
  if (tsData.response && tsData.response.length > 0) {
    for (const t of tsData.response) {
      console.log(`  ${t.team.name} - id:${t.team.id}`);
      if (t.team.name.toLowerCase().includes('trabzonspor')) {
        trabzonsporId = t.team.id;
        break;
      }
    }
  }
  console.log(`Trabzonspor ID: ${trabzonsporId}`);

  // === Step 2: Find correct Gaziantep team ID ===
  console.log('\n=== Finding Gaziantep team ID ===');
  const gzData = await apiGet('/teams?search=Gaziantep&country=Turkey');
  let gaziantepId = null;
  if (gzData.response && gzData.response.length > 0) {
    for (const t of gzData.response) {
      console.log(`  ${t.team.name} - id:${t.team.id}`);
      if (t.team.name.toLowerCase().includes('gaziantep')) {
        gaziantepId = t.team.id;
        break;
      }
    }
  }
  console.log(`Gaziantep ID: ${gaziantepId}`);

  // === Step 3: Fetch Trabzonspor players ===
  console.log('\n=== Trabzonspor players ===');
  const TRABZONSPOR_PLAYERS = [
    { id: 317, name: 'Christ Inao Oulaï' },
    { id: 327, name: 'André Onana' },
    { id: 333, name: 'Ernest Muci' }, // Already found: 3638
    { id: 340, name: 'Wagner Pina' },
    { id: 346, name: 'Chibuike Nwaiwu' },
    { id: 355, name: 'Tim Jabol-Folcarelli' },
    { id: 356, name: 'Paul Onuachu' },
    { id: 378, name: 'Benjamin Bouchouari' },
    { id: 385, name: 'Mathias Løvik' },
  ];

  let tsPlayers = [];
  if (trabzonsporId) {
    tsPlayers = await getTeamPlayers(trabzonsporId);
    console.log(`  Fetched ${tsPlayers.length} Trabzonspor players`);
    for (const p of tsPlayers.slice(0, 30)) {
      console.log(`    ${p.id}: ${p.name}`);
    }
  }

  for (const p of TRABZONSPOR_PLAYERS) {
    let best = null, bestScore = 0;
    for (const tp of tsPlayers) {
      const fn = `${tp.firstname} ${tp.lastname}`.trim();
      const s = Math.max(strictMatch(tp.name, p.name), strictMatch(fn, p.name));
      if (s > bestScore) { bestScore=s; best=tp; }
    }
    if (best && bestScore >= 83) {
      console.log(`  ✓ id:${p.id} "${p.name}" → ${best.id} "${best.name}" (score:${bestScore})`);
      results[p.id] = best.id;
    } else {
      // Try league search
      console.log(`  Team miss for "${p.name}", trying league...`);
      const r = await searchLeague(p.name, 203, 83);
      if (r) {
        console.log(`  ✓ id:${p.id} "${p.name}" → ${r.id} "${r.name}" (score:${r.score})`);
        results[p.id] = r.id;
      } else {
        console.log(`  ✗ id:${p.id} "${p.name}" - NOT FOUND`);
        // Try even looser search to at least find approximate
        const r2 = await searchLeague(p.name, 203, 76);
        if (r2) {
          console.log(`  ~ id:${p.id} "${p.name}" → ${r2.id} "${r2.name}" (score:${r2.score}) [approximate]`);
          results[p.id] = r2.id;
        }
      }
    }
  }

  // === Step 4: Gaziantep players ===
  console.log('\n=== Gaziantep players ===');
  const GAZIANTEP_PLAYERS = [
    { id: 394, name: 'Mohamed Bayo' },
    { id: 373, name: 'Kacper Kozlowski' },
  ];

  let gzPlayers = [];
  if (gaziantepId) {
    gzPlayers = await getTeamPlayers(gaziantepId);
    console.log(`  Fetched ${gzPlayers.length} Gaziantep players`);
    for (const p of gzPlayers.slice(0, 20)) {
      console.log(`    ${p.id}: ${p.name}`);
    }
  }

  for (const p of GAZIANTEP_PLAYERS) {
    let best = null, bestScore = 0;
    for (const tp of gzPlayers) {
      const fn = `${tp.firstname} ${tp.lastname}`.trim();
      const s = Math.max(strictMatch(tp.name, p.name), strictMatch(fn, p.name));
      if (s > bestScore) { bestScore=s; best=tp; }
    }
    if (best && bestScore >= 83) {
      console.log(`  ✓ id:${p.id} "${p.name}" → ${best.id} "${best.name}" (score:${bestScore})`);
      results[p.id] = best.id;
    } else {
      const r = await searchLeague(p.name, 203, 83);
      if (r) {
        console.log(`  ✓ id:${p.id} "${p.name}" → ${r.id} "${r.name}" (score:${r.score})`);
        results[p.id] = r.id;
      } else {
        console.log(`  ✗ id:${p.id} "${p.name}" - NOT FOUND`);
        results[p.id] = 0; // mark as truly not found
      }
    }
  }

  // === Step 5: Fix suspicious Turkish matches ===
  console.log('\n=== Fixing suspicious Turkish score-75 matches ===');

  // These need stricter matching
  const SUSPICIOUS = [
    { id: 303, name: 'Barış Alper Yılmaz', teamId: 1924, league: 203 },
    { id: 304, name: 'Orkun Kökçü', teamId: 609, league: 203 },
    { id: 305, name: 'Wilfried Singo', teamId: 1924, league: 203 },
    { id: 306, name: 'Noa Lang', teamId: 1924, league: 203 },
    { id: 314, name: 'Emmanuel Agbadou', teamId: 609, league: 203 },
    { id: 320, name: 'Hyeon-gyu Oh', teamId: 609, league: 203 },
    { id: 321, name: 'El Bilal Touré', teamId: 609, league: 203 },
    { id: 324, name: 'Yáser Asprilla', teamId: 1924, league: 203 },
    { id: 326, name: 'Kristjan Asllani', teamId: 609, league: 203 },
    { id: 328, name: 'Jota Silva', teamId: 609, league: 203 }, // mapped to wrong Silva
    { id: 335, name: 'Wilfred Ndidi', teamId: 609, league: 203 },
    { id: 343, name: 'Amir Murillo', teamId: 609, league: 203 },
    { id: 351, name: 'Tiago Djaló', teamId: 609, league: 203 }, // wrong Djaló
    { id: 358, name: 'Renato Nhaga', teamId: 1924, league: 203 },
    { id: 367, name: 'Taylan Bulut', teamId: 609, league: 203 }, // O. Bulut is wrong
    { id: 368, name: 'Junior Olaitan', teamId: 609, league: 203 },
    { id: 371, name: 'Cherif Ndiaye', teamId: 635, league: 203 }, // B. Ndiaye is wrong
    { id: 386, name: 'Rıdvan Yılmaz', teamId: 609, league: 203 }, // same ID as Barış!
    { id: 392, name: 'Bertuğ Yıldırım', teamId: 2282, league: 203 }, // Ege Yıldırım is wrong
    { id: 399, name: 'Afonso Sousa', teamId: 635, league: 203 }, // Diogo Sousa is wrong
    { id: 350, name: 'Eldor Shomurodov', teamId: 2282, league: 203 },
    { id: 352, name: 'Abbosbek Fayzullaev', teamId: 2282, league: 203 },
    { id: 362, name: 'Amine Harit', teamId: 2282, league: 203 },
  ];

  // First fetch Galatasaray, Beşiktaş, Başakşehir, Samsunspor players
  const teamCache = {};
  for (const p of SUSPICIOUS) {
    if (p.teamId && !teamCache[p.teamId]) {
      console.log(`  Fetching team ${p.teamId}...`);
      teamCache[p.teamId] = await getTeamPlayers(p.teamId);
      console.log(`  Got ${teamCache[p.teamId].length} players`);
      if (teamCache[p.teamId].length > 0) {
        for (const tp of teamCache[p.teamId].slice(0,10)) {
          console.log(`    ${tp.id}: ${tp.name}`);
        }
      }
    }
  }

  for (const p of SUSPICIOUS) {
    const players = teamCache[p.teamId] || [];
    let best = null, bestScore = 0;
    for (const tp of players) {
      const fn = `${tp.firstname} ${tp.lastname}`.trim();
      const s = Math.max(strictMatch(tp.name, p.name), strictMatch(fn, p.name));
      if (s > bestScore) { bestScore=s; best=tp; }
    }
    if (best && bestScore >= 83) {
      console.log(`  ✓ id:${p.id} "${p.name}" → ${best.id} "${best.name}" (score:${bestScore})`);
      results[p.id] = best.id;
    } else {
      // Try league search with min score 83
      const r = await searchLeague(p.name, p.league, 83);
      if (r) {
        console.log(`  ✓ id:${p.id} "${p.name}" → ${r.id} "${r.name}" (score:${r.score})`);
        results[p.id] = r.id;
      } else {
        console.log(`  ✗ id:${p.id} "${p.name}" - NOT FOUND (strict mode)`);
        results[p.id] = 0; // no confident match
      }
    }
  }

  // === Step 6: Fix suspicious international matches ===
  console.log('\n=== Fixing suspicious international matches ===');

  const INTL_FIX = [
    { id: 76, name: 'Álvaro Carreras', teamId: 541, league: 140 },
    { id: 90, name: 'Jérémy Jacquet', teamId: 111, league: 61 },
    { id: 129, name: 'Pio Esposito', teamId: 505, league: 135 }, // S. Esposito is Sebastiano, Pio is different
    { id: 154, name: 'Junior Kroupi', teamId: 35, league: 39 },
    { id: 312, name: 'Dorgeles Nene', teamId: 611, league: 203 },
    { id: 337, name: 'Juan', teamId: 593, league: 203 },
    { id: 58, name: 'Nico Paz', teamId: 517, league: 135 },
    { id: 75, name: 'Luka Vuskovic', teamId: 171, league: 78 },
    { id: 198, name: 'Said El Mala', teamId: 163, league: 78 },
  ];

  for (const p of INTL_FIX) {
    // First try team players
    let teamPlayers = teamCache[p.teamId];
    if (!teamPlayers) {
      console.log(`  Fetching team ${p.teamId} for "${p.name}"...`);
      teamPlayers = await getTeamPlayers(p.teamId);
      teamCache[p.teamId] = teamPlayers;
      console.log(`  Got ${teamPlayers.length} players`);
    }

    let best = null, bestScore = 0;
    for (const tp of teamPlayers) {
      const fn = `${tp.firstname} ${tp.lastname}`.trim();
      const s = Math.max(strictMatch(tp.name, p.name), strictMatch(fn, p.name));
      if (s > bestScore) { bestScore=s; best=tp; }
    }

    if (best && bestScore >= 83) {
      console.log(`  ✓ id:${p.id} "${p.name}" → ${best.id} "${best.name}" (score:${bestScore})`);
      results[p.id] = best.id;
    } else {
      // Show best match to help manually
      if (best) console.log(`  team best: ${best.id} "${best.name}" (score:${bestScore})`);
      const r = await searchLeague(p.name, p.league, 83);
      if (r) {
        console.log(`  ✓ id:${p.id} "${p.name}" → ${r.id} "${r.name}" (score:${r.score})`);
        results[p.id] = r.id;
      } else {
        console.log(`  ✗ id:${p.id} "${p.name}" - NOT FOUND (strict)`);
        results[p.id] = 0;
      }
    }
  }

  // Output results
  console.log('\n=== PHASE 3 RESULTS ===');
  const found = Object.entries(results).filter(([,v]) => v > 0);
  const notFound3 = Object.entries(results).filter(([,v]) => v === 0);
  console.log(`Found: ${found.length}, Not found: ${notFound3.length}`);
  for (const [id, photoId] of found) {
    console.log(`id:${id} → photoId: ${photoId}`);
  }
  console.log('\nNOT FOUND:');
  for (const [id] of notFound3) {
    console.log(`id:${id}`);
  }

  const { writeFileSync } = await import('fs');
  writeFileSync('photo_ids_phase3.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to photo_ids_phase3.json');
}

main().catch(console.error);
