import { readFile, writeFile } from 'node:fs/promises';
const source = new URL('../src/main.js', import.meta.url);
const target = new URL('../main.js', import.meta.url);
const strings = new URL('../src/theme-strings.json', import.meta.url);
const code = (await readFile(source, 'utf8')).replace("require('./theme-strings.json')", (await readFile(strings, 'utf8')).trim());
await writeFile(target, code);
console.log('Built readable main.js with bundled theme translations.');
