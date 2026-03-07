import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();
const DIST_DIR = join(ROOT, 'dist');
const DIST_INDEX = join(DIST_DIR, 'index.html');
const DIST_BOSSES_DIR = join(DIST_DIR, 'bosses');

const BUDGETS = {
  indexHtmlBytes: 360 * 1024,       // 360 KiB
  indexHtmlGzipBytes: 105 * 1024,   // 105 KiB
  bossTextureMaxBytes: 600 * 1024,  // 600 KiB per texture
  distTotalBytes: 2 * 1024 * 1024,  // 2 MiB total
};

function bytesToKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

function listFilesRec(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRec(abs));
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

function getDistTotalBytes() {
  return listFilesRec(DIST_DIR).reduce((sum, file) => sum + statSync(file).size, 0);
}

function checkBudget(name, actual, limit) {
  return { name, actual, limit, ok: actual <= limit };
}

function main() {
  const checks = [];

  const indexRaw = readFileSync(DIST_INDEX);
  checks.push(checkBudget('dist/index.html (raw)', indexRaw.length, BUDGETS.indexHtmlBytes));
  checks.push(checkBudget('dist/index.html (gzip)', gzipSync(indexRaw).length, BUDGETS.indexHtmlGzipBytes));

  for (const bossFile of readdirSync(DIST_BOSSES_DIR)) {
    const abs = join(DIST_BOSSES_DIR, bossFile);
    const size = statSync(abs).size;
    checks.push(checkBudget(`dist/bosses/${bossFile}`, size, BUDGETS.bossTextureMaxBytes));
  }

  checks.push(checkBudget('dist total size', getDistTotalBytes(), BUDGETS.distTotalBytes));

  console.log('Asset Budget Report');
  for (const c of checks) {
    const status = c.ok ? 'PASS' : 'FAIL';
    console.log(
      `${status}  ${c.name}: ${bytesToKiB(c.actual)} / limit ${bytesToKiB(c.limit)}`,
    );
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    console.error(`\nBudget check failed (${failed.length} violation${failed.length > 1 ? 's' : ''}).`);
    process.exit(1);
  }

  console.log('\nAll asset budgets passed.');
}

main();
