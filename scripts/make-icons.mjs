// Generates the app icons in public/ (a 4×4 board on charcoal) without image libraries.
// Run once after changing the design: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const CHARCOAL = [0x21, 0x21, 0x21]
const CREAM = [0xff, 0xe2, 0xbd]
const BROWN = [0x8b, 0x6f, 0x4e]
const SQUARES = 4
// The board fills 64% of the icon, leaving room for iOS/Android corner masks.
const BOARD = 0.64

function pixelColor(x, y, size) {
  const boardSize = size * BOARD
  const offset = (size - boardSize) / 2
  const bx = x + 0.5 - offset
  const by = y + 0.5 - offset
  if (bx < 0 || by < 0 || bx >= boardSize || by >= boardSize) return CHARCOAL
  const file = Math.floor((bx / boardSize) * SQUARES)
  const rank = Math.floor((by / boardSize) * SQUARES)
  return (file + rank) % 2 === 0 ? CREAM : BROWN
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1)
    raw[row] = 0 // filter: none
    for (let x = 0; x < size; x++) raw.set(pixelColor(x, y, size), row + 1 + x * 3)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 2, 0, 0, 0], 8) // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return (c ^ 0xffffffff) >>> 0
}

function svg() {
  const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
  const cell = 16 / SQUARES
  const squares = []
  for (let r = 0; r < SQUARES; r++)
    for (let f = 0; f < SQUARES; f++)
      squares.push(
        `<rect x="${f * cell}" y="${r * cell}" width="${cell}" height="${cell}" fill="${hex((f + r) % 2 === 0 ? CREAM : BROWN)}"/>`,
      )
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 20 20"><rect x="-2" y="-2" width="20" height="20" rx="3" fill="${hex(CHARCOAL)}"/>${squares.join('')}</svg>\n`
}

for (const size of [180, 192, 512]) writeFileSync(`public/icon-${size}.png`, png(size))
writeFileSync('public/favicon.svg', svg())
console.log('Wrote public/icon-{180,192,512}.png and public/favicon.svg')
