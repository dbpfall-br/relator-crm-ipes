// Bundles only @xenova/transformers into vendor/transformers.min.js.
// All application code lives at its final paths (no src/ dir) and is loaded
// by Chrome as native ES modules.
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['node_modules/@xenova/transformers/src/transformers.js'],
  outfile: 'vendor/transformers.min.js',
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  platform: 'browser',
  minify: true,
  sourcemap: false,
  logLevel: 'info',
});

console.log('vendor/transformers.min.js built.');
