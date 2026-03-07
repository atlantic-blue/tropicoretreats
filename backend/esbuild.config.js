import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: [
    'src/handlers/createLead.ts',
    'src/handlers/processLeadNotifications.ts',
    'src/handlers/leadsAdmin.ts',
    'src/handlers/users.ts',
    'src/handlers/emailAdmin.ts',
    'src/handlers/emailReceive.ts',
    'src/handlers/blogAdmin.ts',
  ],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'node',
  target: 'node22',
  outdir: 'dist',
  outExtension: { '.js': '.mjs' },
  format: 'esm',
  external: ['@aws-sdk/*'],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});

console.log('Build complete: dist/createLead.mjs, dist/processLeadNotifications.mjs, dist/leadsAdmin.mjs, dist/users.mjs, dist/emailAdmin.mjs, dist/emailReceive.mjs, dist/blogAdmin.mjs');
