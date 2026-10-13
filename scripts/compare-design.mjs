import { readFile, writeFile, mkdir } from 'node:fs/promises'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

const referencePath = process.argv[2] ?? 'design/figma-ready.png'
const screenshotPath = process.argv[3] ?? 'test-results/paywall-ready.png'
const reference = PNG.sync.read(await readFile(referencePath))
const actual = PNG.sync.read(await readFile(screenshotPath))
if (reference.width !== actual.width || reference.height !== actual.height) {
  throw new Error(`Different dimensions: ${reference.width}×${reference.height} and ${actual.width}×${actual.height}`)
}
const diff = new PNG({ width: actual.width, height: actual.height })
const mismatch = pixelmatch(reference.data, actual.data, diff.data, actual.width, actual.height, { threshold: 0.1 })
const ratio = mismatch / (actual.width * actual.height)
await mkdir('test-results', { recursive: true })
await writeFile('test-results/design-diff.png', PNG.sync.write(diff))
const overlay = new PNG({ width: actual.width, height: actual.height })
for (let i = 0; i < actual.data.length; i++) overlay.data[i] = Math.round((reference.data[i] + actual.data[i]) / 2)
await writeFile('test-results/design-overlay.png', PNG.sync.write(overlay))
const result = { referencePath, screenshotPath, width: actual.width, height: actual.height, threshold: 0.1, mismatchPixels: mismatch, mismatchRatio: ratio, passed: ratio <= 0.01 }
await writeFile('test-results/design-comparison.json', JSON.stringify(result, null, 2) + '\n')
console.log(`Pixel difference: ${(ratio * 100).toFixed(3)}% (${mismatch} pixels); ${result.passed ? 'PASS' : 'FAIL'}`)
if (!result.passed) process.exitCode = 1
