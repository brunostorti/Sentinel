import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { createRequire } from 'node:module';

const dir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const base = process.argv.find(arg => arg.startsWith('--nome='))?.slice(7) ?? 'atividades-ciclo';
if (!/^[a-z0-9-]+$/.test(base)) throw new Error('Nome de arquivo invalido.');
let svg;
if (process.argv.includes('--png')) {
  svg = await fs.readFile(path.join(dir, `${base}.svg`), 'utf8');
} else {
const source = await fs.readFile(path.join(dir, `${base}.puml`), 'utf8');
const standard = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const encoded = deflateRawSync(Buffer.from(source)).toString('base64')
  .replace(/=+$/, '').split('').map(c => alphabet[standard.indexOf(c)]).join('');
const response = await fetch(`https://www.plantuml.com/plantuml/svg/${encoded}`, {
  signal: AbortSignal.timeout(60000),
});
svg = await response.text();
if (!response.ok || !svg.includes('<svg') || /Syntax Error|An error has occur/i.test(svg)) {
  throw new Error(`PlantUML rendering failed: HTTP ${response.status}`);
}
await fs.writeFile(path.join(dir, `${base}.svg`), svg);
console.log('SVG gerado. Execute ajustar-rotulos.ps1 e depois node renderizar-atividades.mjs --png.');
}
if (process.argv.includes('--png')) {
await sharp(Buffer.from(svg), { density: 200 }).flatten({ background: '#ffffff' })
  .png().toFile(path.join(dir, `${base}.png`));
await sharp(Buffer.from(svg)).flatten({ background: '#ffffff' })
  .resize({ width: 1500, withoutEnlargement: true }).png()
  .toFile(path.join(dir, `${base}-preview.png`));
const metadata = await sharp(Buffer.from(svg)).metadata();
console.log(JSON.stringify({ width: metadata.width, height: metadata.height, rendered: true }));
}
