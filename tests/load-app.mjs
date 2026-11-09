// Loads app/ TypeScript modules for the node:test unit tests.
// Every .ts file under app/ is transpiled once into a scratch folder with the same layout; relative imports point at
// the .mjs copies and JSON files are imported as JSON. The folder is removed when the test process ends.
// usage: const {treeState} = await load('core/model');
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {fileURLToPath,pathToFileURL} from 'node:url';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const out = fs.mkdtempSync(fileURLToPath(new URL('../.foundation-test-', import.meta.url)));
process.on('exit', () => fs.rmSync(out, {recursive: true, force: true}));

function walk(dir) { return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) }
for (const file of walk(APP)) {
  const rel = path.relative(APP, file), target = path.join(out, rel);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  if (file.endsWith('.json')) { fs.copyFileSync(file, target); continue }
  if (!file.endsWith('.ts')) continue;
  let code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
  code = code.replace(/(from\s*['"])(\.{1,2}\/[^'"]+)(['"])/g, (m, a, spec, b) => {
    const resolved = path.resolve(path.dirname(file), spec);
    if (spec.endsWith('.json')) return a + spec + b + ' with {type:"json"}';
    if (fs.existsSync(resolved + '.ts')) return a + spec + '.mjs' + b;
    return m;
  });
  fs.writeFileSync(target.replace(/\.ts$/, '.mjs'), code);
}
export const load = name => import(pathToFileURL(path.join(out, name + '.mjs')).href);
