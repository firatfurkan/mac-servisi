#!/usr/bin/env node
// Find last 3 missing players

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

async function getTeamPlayers(teamId, season) {
  const players = [];
  let page = 1;
  while (true) {
    const data = await apiGet(`/players?team=${teamId}&season=${season}&page=${page}`);
    if (!data.response || data.response.length === 0) break;
    for (const e of data.response) {
      players.push({ id: e.player.id, name: e.player.name, fn: `${e.player.firstname||''} ${e.player.lastname||''}`.trim() });
    }
    if (data.paging && page >= data.paging.total) break;
    page++;
  }
  return players;
}

async function main() {
  // Como 1907 - Nico Paz (id 517)
  console.log('=== Como 1907 full squad ===');
  const comoPlayers = [];
  for (const s of [2025, 2024]) {
    const p = await getTeamPlayers(517, s);
    for (const tp of p) if (!comoPlayers.find(x=>x.id===tp.id)) comoPlayers.push(tp);
  }
  console.log('All players:');
  for (const p of comoPlayers) console.log(`  ${p.id}: "${p.name}" (${p.fn})`);
  console.log(`Total: ${comoPlayers.length}`);

  // Hamburger SV - Luka Vuskovic (id 171)
  console.log('\n=== Hamburger SV full squad ===');
  const hamburgPlayers = [];
  for (const s of [2025, 2024]) {
    const p = await getTeamPlayers(171, s);
    for (const tp of p) if (!hamburgPlayers.find(x=>x.id===tp.id)) hamburgPlayers.push(tp);
  }
  console.log('All players:');
  for (const p of hamburgPlayers) console.log(`  ${p.id}: "${p.name}" (${p.fn})`);
  console.log(`Total: ${hamburgPlayers.length}`);

  // 1.FC Köln - Said El Mala (id 163)
  console.log('\n=== 1.FC Köln full squad ===');
  const kolnPlayers = [];
  for (const s of [2025, 2024]) {
    const p = await getTeamPlayers(163, s);
    for (const tp of p) if (!kolnPlayers.find(x=>x.id===tp.id)) kolnPlayers.push(tp);
  }
  console.log('All players:');
  for (const p of kolnPlayers) console.log(`  ${p.id}: "${p.name}" (${p.fn})`);
  console.log(`Total: ${kolnPlayers.length}`);
}

main().catch(console.error);
