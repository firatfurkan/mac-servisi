#!/usr/bin/env node
// Apply all confirmed photoIds to players.ts

import { readFileSync, writeFileSync } from 'fs';

const PHOTO_IDS = {
  23: 174565, 30: 425733, 34: 47315, 40: 513776, 45: 19281,
  59: 361497, 61: 156477, 64: 158054, 70: 18979,
  76: 284300,  // Álvaro Carreras = Álvaro Fernández Carreras
  90: 367636,  // Jérémy Jacquet
  93: 15911, 96: 438688,
  101: 307123,  // Nico O'Reilly
  102: 196156, 103: 183799, 106: 22147, 107: 18592,
  126: 449249, 127: 358628, 128: 354753,
  129: 345808,  // Pio Esposito = Francesco Pio Esposito
  130: 339887, 131: 305834, 132: 17661, 133: 161671, 136: 162761,
  139: 163189, 140: 162714, 141: 161933, 142: 7712, 143: 137210,
  144: 2032,   // Jørgen Strand Larsen
  149: 419582, 150: 505295, 151: 407806, 152: 383685, 153: 349001,
  154: 368030,  // Junior Kroupi
  156: 409216, 159: 304853, 165: 182519, 168: 9971, 175: 265595,
  176: 128533, 178: 20696, 182: 20995, 187: 369, 196: 404097,
  197: 340279,
  199: 387643, 200: 390742, 201: 404891, 203: 383780, 204: 406244,
  206: 328089, 208: 341642, 210: 336585, 211: 311067, 212: 319572,
  213: 275651, 214: 342022, 215: 284797, 216: 360114, 217: 195103,
  218: 152856, 219: 280074, 221: 284492, 223: 9363, 224: 333682,
  227: 45826, 228: 128398, 229: 184226, 236: 895, 237: 19192,
  241: 178077, 242: 129711, 244: 1646, 249: 41112, 250: 2218,
  302: 1454, 303: 63274, 304: 37155, 305: 30504, 306: 544,
  310: 2869, 312: 302869, 313: 421875, 314: 135068, 317: 474591,
  320: 34710, 321: 194750, 324: 281795, 325: 617, 326: 275776,
  327: 526, 328: 141901, 333: 3638, 335: 18786, 336: 161661,
  337: 180916,  // Juan at Göztepe = Juan Santos da Silva
  338: 414142, 340: 332056, 343: 2973, 345: 130, 346: 371027,
  348: 237120, 350: 53535, 351: 1479, 352: 263676, 355: 22408,
  356: 15812, 357: 15837, 358: 518567, 361: 37380, 362: 412,
  363: 137223, 364: 328155, 365: 301272, 367: 394663, 368: 316904,
  369: 376039, 370: 436179, 371: 14379, 373: 64304, 375: 64190,
  376: 843, 378: 274355, 379: 364594, 380: 87633, 381: 353394,
  382: 2290, 383: 394, 385: 323369, 386: 1987, 387: 25324,
  388: 24873, 389: 290046, 390: 20836, 392: 68483, 393: 167659,
  394: 24288, 395: 367637, 396: 49857, 397: 402493, 398: 11245,
  399: 130262, 400: 161638,
};

let content = readFileSync('src/data/players.ts', 'utf8');
let updated = 0;
let skipped = 0;

for (const [fileId, photoId] of Object.entries(PHOTO_IDS)) {
  const id = parseInt(fileId);
  // Match pattern: id: <id>, ... photoId: 0
  // Replace photoId: 0 for this specific player
  const pattern = new RegExp(
    `(\\{ id: ${id},(?:[^}]*?)photoId: )0(\\s*\\})`,
    'g'
  );
  const before = content;
  content = content.replace(pattern, `$1${photoId}$2`);
  if (content !== before) {
    updated++;
    console.log(`  ✓ id:${id} → photoId: ${photoId}`);
  } else {
    // Check if already set
    const alreadySet = new RegExp(`\\{ id: ${id},(?:[^}]*?)photoId: (?!0)\\d+`).test(content);
    if (!alreadySet) {
      console.log(`  ? id:${id} - pattern not found`);
    } else {
      skipped++;
    }
  }
}

writeFileSync('src/data/players.ts', content, 'utf8');

console.log(`\nUpdated: ${updated} players`);
console.log(`Skipped (already set): ${skipped}`);

// Count remaining 0s
const remaining = (content.match(/photoId: 0/g) || []).length;
console.log(`Remaining photoId: 0 = ${remaining}`);
