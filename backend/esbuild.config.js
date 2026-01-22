import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/handlers/createLead.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'node',
  target: 'node22',
  outfile: 'dist/index.js',
  format: 'esm',
  external: ['@aws-sdk/*'],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});

console.log('Build complete: dist/index.js');
