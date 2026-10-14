import { copyFile } from 'node:fs/promises';
const source = new URL('../src/main.js', import.meta.url);
const target = new URL('../main.js', import.meta.url);
await copyFile(source, target);
console.log('Built main.js from readable CommonJS source.');
