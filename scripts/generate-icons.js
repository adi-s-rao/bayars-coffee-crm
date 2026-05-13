// Run: node scripts/generate-icons.js
// Requires: pnpm add -D sharp
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const sizes = [192, 512]
const src = path.join(__dirname, '../public/icon.svg')
const outDir = path.join(__dirname, '../public/icons')

fs.mkdirSync(outDir, { recursive: true })

Promise.all(
  sizes.map(size =>
    sharp(src)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`))
      .then(() => console.log(`Generated icon-${size}.png`))
  )
).catch(err => { console.error(err); process.exit(1) })
