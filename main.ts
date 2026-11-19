// Leonida Trophy Guide — the hand-in program (Node 22, standard library only).
// Aica's entry for make.fun's gta6-trophy-guide-01: the guide itself is the static
// files under app/ (index.html, style.css, app.js and data/trophies.json), plain
// files a browser opens with the network off, and screenshots/ holds four real
// renders of it. This program copies both folders beside this file into the
// grader's output directory and writes dossier.json there with the vendored
// make.fun library, so the judge reads the screenshots and the source outline.
// Leave vendor/makefun-frontend.ts untouched: the scorer rebuilds the dossier
// with its own copy and the two must match byte for byte.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name: string) {
  const from = join(repoRoot, name);
  const to = join(outDir, name);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree('app');
copyTree('screenshots');

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB, or more than 993 files and directories in
// app/ or 48 MiB of app files. app/ counts beside /output's own 1000-entry
// cap, its screenshots/ and dossier.json, so this entry keeps well under them.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
