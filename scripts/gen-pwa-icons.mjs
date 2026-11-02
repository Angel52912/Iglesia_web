// Genera los íconos PNG de la PWA (sin dependencias): fondo azul con una cruz blanca.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const salida = new URL('../client/public/icons/', import.meta.url);
const AZUL = [0x1e, 0x3a, 0x8a];
const BLANCO = [0xff, 0xff, 0xff];

const tablaCrc = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = tablaCrc[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo, datos) {
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

/** @param {number} tam @param {number} escala proporción de la cruz respecto al lienzo */
function crearPng(tam, escala) {
  const filas = [];
  const mitad = tam / 2;
  const largoBrazo = (tam * escala) / 2;
  const grosor = tam * 0.09;
  for (let y = 0; y < tam; y++) {
    const fila = Buffer.alloc(1 + tam * 3);
    for (let x = 0; x < tam; x++) {
      const dx = Math.abs(x + 0.5 - mitad);
      const dy = Math.abs(y + 0.5 - mitad);
      const enCruz = (dx <= grosor && dy <= largoBrazo) || (dy <= grosor && dx <= largoBrazo * 0.7);
      const [r, g, b] = enCruz ? BLANCO : AZUL;
      fila.set([r, g, b], 1 + x * 3);
    }
    filas.push(fila);
  }
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(tam, 0);
  cabecera.writeUInt32BE(tam, 4);
  cabecera.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', cabecera),
    chunk('IDAT', deflateSync(Buffer.concat(filas))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(salida, { recursive: true });
// "maskable" necesita la cruz dentro de la zona segura (~60 %).
const iconos = [
  ['icon-192.png', 192, 0.7],
  ['icon-512.png', 512, 0.7],
  ['icon-maskable-512.png', 512, 0.5],
  ['apple-touch-icon.png', 180, 0.7],
];
for (const [nombre, tam, escala] of iconos) {
  writeFileSync(new URL(nombre, salida), crearPng(tam, escala));
}
console.log(`Íconos generados: ${iconos.length}`);
