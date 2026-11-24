import { mkdir, readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const archivePath = process.env.STOCKFLOW_SOURCE_ARCHIVE;
const sourceArchive = archivePath ? (await readFile(archivePath)).toString('base64') : '';

await mkdir('dist/server', { recursive: true });
await build({
  entryPoints: [process.argv[2] ?? 'worker/index.js'],
  outfile: 'dist/server/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  define: { STOCKFLOW_SOURCE_ZIP: JSON.stringify(sourceArchive) },
  legalComments: 'none',
});
