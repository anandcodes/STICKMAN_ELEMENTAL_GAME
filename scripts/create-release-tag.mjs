import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'pipe', encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `Command failed: ${command} ${args.join(' ')}`).trim());
  }
  return result.stdout.trim();
}

function main() {
  const pkgPath = resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const version = String(pkg.version ?? '').trim();

  if (!/^\d+\.\d+\.\d+([-.][a-zA-Z0-9.]+)?$/.test(version)) {
    throw new Error(`Invalid package version: "${version}"`);
  }

  run('git', ['rev-parse', '--is-inside-work-tree']);

  const tag = `v${version}`;
  const existing = run('git', ['tag', '--list', tag]);
  if (existing === tag) {
    console.log(`Tag ${tag} already exists; nothing to do.`);
    return;
  }

  run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);
  console.log(`Created tag ${tag}`);

  if (process.argv.includes('--push')) {
    run('git', ['push', 'origin', tag]);
    console.log(`Pushed tag ${tag} to origin`);
  } else {
    console.log(`Run "git push origin ${tag}" to publish it.`);
  }
}

main();
