import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destinos = ['client/src/types/database.ts', 'server/src/types/database.ts'];

const resultado = spawnSync('npx', ['supabase', 'gen', 'types', 'typescript', '--linked'], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
  maxBuffer: 32 * 1024 * 1024,
});

if (resultado.status !== 0 || !resultado.stdout.trim()) {
  console.error(resultado.stderr || 'La CLI de Supabase no devolvió tipos.');
  process.exit(resultado.status ?? 1);
}

for (const destino of destinos) {
  const ruta = resolve(root, destino);
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, resultado.stdout, 'utf8');
  console.log(`Tipos escritos en ${destino}`);
}
