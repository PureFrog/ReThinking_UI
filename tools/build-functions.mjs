// Bundles each Supabase edge function in db/functions/<name>/index.ts into one file, bundle.js, with the app code it
// imports (app/core has no .ts suffixes, which Deno needs). Paste bundle.js into Supabase → Edge Functions → the
// function's editor, or deploy it with the Supabase CLI. Run: node tools/build-functions.mjs [name]
// esbuild comes with vite (no extra package)
import {createRequire} from 'node:module';
const {build}=createRequire(createRequire(import.meta.url).resolve('vite'))('esbuild');
import {readdirSync,existsSync} from 'node:fs';
const names=process.argv[2]?[process.argv[2]]:readdirSync('db/functions').filter(n=>existsSync(`db/functions/${n}/index.ts`)&&n!=='expedition-submit');
for(const n of names){
  await build({entryPoints:[`db/functions/${n}/index.ts`],bundle:true,format:'esm',platform:'neutral',target:'es2022',outfile:`db/functions/${n}/bundle.js`,
    banner:{js:`// built from db/functions/${n}/index.ts by tools/build-functions.mjs. Do not edit; rebuild.`}});
  console.log('built db/functions/'+n+'/bundle.js');
}
