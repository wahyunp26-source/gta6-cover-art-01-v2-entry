// Coral Sands Cover Studio — entry program (Node 22, standard library only).
//
// This file hands the app in: it copies this repository's app/ and
// screenshots/ into the output directory and writes dossier.json with the
// vendored make.fun library (vendor/makefun-app.ts, kit code, unchanged).
// The app itself is plain static files under app/ — index.html plus its
// ES modules and sample photos — that load offline with no network request.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

if (!existsSync(join(repoRoot, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing — nothing to hand in');
}
if (!existsSync(join(repoRoot, 'screenshots'))) {
  throw new Error('screenshots/ is missing — the entry needs 3 or 4 screenshots');
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's gate: the text cap shapes the dossier bytes;
// the rest refuse an entry the scorer would refuse anyway (at most 4
// screenshots, each at most 256 KiB; app/ at most 993 files and 48 MiB in
// all, every path at most 1000 bytes).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Coral Sands Cover Studio handed in to ${outputDir}`);
