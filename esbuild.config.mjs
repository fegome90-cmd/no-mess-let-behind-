// Adapted from obsidianmd/obsidian-sample-plugin; see THIRD_PARTY_NOTICES.md.
import { builtinModules } from 'node:module';
import esbuild from 'esbuild';

const production = process.argv[2] === 'production';
const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
  format: 'cjs',
  target: 'es2022',
  sourcemap: production ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
});
if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
