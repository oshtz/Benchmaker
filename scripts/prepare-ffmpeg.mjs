import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { chmod, copyFile, mkdir, mkdtemp, open, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const requestedTarget = process.argv.includes('--target')
  ? process.argv[process.argv.indexOf('--target') + 1]
  : undefined
const binaryDirectory = join(root, 'src-tauri', 'binaries')
const resourceDirectory = join(root, 'src-tauri', 'resources', 'ffmpeg')
const ffmpegRelease = 'b6.1.1'
const ffmpegReleaseUrl = `https://github.com/eugeneware/ffmpeg-static/releases/download/${ffmpegRelease}`

const targets = {
  'win32:x64': { triple: 'x86_64-pc-windows-msvc', binary: '04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00', license: '8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903', source: 'a636a7183c58006351acbaf35303c0ed85c6e1320fd4e80de453ba6157de6311' },
  'darwin:x64': { triple: 'x86_64-apple-darwin', binary: 'ebdddc936f61e14049a2d4b549a412b8a40deeff6540e58a9f2a2da9e6b18894', license: '2e1d16c72fd74e12063776371da757322f8b77589386532f4fd8634bde7de1af', source: 'e88a0325f8e5b75210355e37341824f074d3cd82def2125be54c914b62848a36' },
  'darwin:arm64': { triple: 'aarch64-apple-darwin', binary: 'a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584', license: 'cb48bf09a11f5fb576cddb0431c8f5ed0a60157a9ec942adffc13907cbe083f2', source: '05ba4b92c96605434b1aaae3eedf5a2c280c9607bf78ffca9a5b536d9af2dc6a' },
  'linux:x64': { triple: 'x86_64-unknown-linux-gnu', binary: 'e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99', license: '8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903', source: '72f4b1b06d419d22ace6e7cc75f06826f90737345aa0b1736158929f4aacc537' },
  'linux:arm64': { triple: 'aarch64-unknown-linux-gnu', binary: '6bb182d0d75d23028db82e9e4f723ca69b853d055698486e6984ddb2c06fb8ce', license: '8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903', source: 'd6777d2fd276b23f0ac6666fa619e88ffe4826521881c7ff83836e30cb4acec2' },
}

if (requestedTarget === 'universal-apple-darwin') {
  await prepareUniversalMacosSidecar()
} else {
  await prepareHostSidecar()
}

async function prepareHostSidecar() {
  const target = targets[`${process.platform}:${process.arch}`]
  if (!target) throw new Error(`No bundled FFmpeg target for ${process.platform}/${process.arch}.`)
  if (!ffmpegPath) throw new Error('ffmpeg-static did not provision an encoder binary.')

  const executableExtension = process.platform === 'win32' ? '.exe' : ''
  const packageDirectory = dirname(ffmpegPath)
  const sourceName = `ffmpeg${extname(ffmpegPath)}`
  const licensePath = join(packageDirectory, `${sourceName}.LICENSE`)
  const sourcePath = join(packageDirectory, `${sourceName}.README`)

  await verifySha256(ffmpegPath, target.binary, 'FFmpeg binary')
  await verifySha256(licensePath, target.license, 'FFmpeg license')
  await verifySha256(sourcePath, target.source, 'FFmpeg source notice')
  await mkdir(binaryDirectory, { recursive: true })
  await mkdir(resourceDirectory, { recursive: true })
  await copyFile(ffmpegPath, join(binaryDirectory, `ffmpeg-${target.triple}${executableExtension}`))
  await copyFile(licensePath, join(resourceDirectory, 'COPYING.txt'))
  await copyFile(sourcePath, join(resourceDirectory, 'SOURCE.txt'))
  process.stdout.write(`Prepared verified FFmpeg sidecar for ${target.triple}.\n`)
}

async function prepareUniversalMacosSidecar() {
  if (process.platform !== 'darwin') throw new Error('Universal macOS FFmpeg must be prepared on macOS.')
  const assets = [
    { arch: 'x64', binary: 'ebdddc936f61e14049a2d4b549a412b8a40deeff6540e58a9f2a2da9e6b18894', license: '2e1d16c72fd74e12063776371da757322f8b77589386532f4fd8634bde7de1af', source: 'e88a0325f8e5b75210355e37341824f074d3cd82def2125be54c914b62848a36' },
    { arch: 'arm64', binary: 'a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584', license: 'cb48bf09a11f5fb576cddb0431c8f5ed0a60157a9ec942adffc13907cbe083f2', source: '05ba4b92c96605434b1aaae3eedf5a2c280c9607bf78ffca9a5b536d9af2dc6a' },
  ]
  const workspace = await mkdtemp(join(tmpdir(), 'benchmaker-ffmpeg-universal-'))
  try {
    for (const asset of assets) {
      await downloadVerified(`ffmpeg-darwin-${asset.arch}`, asset.binary, join(workspace, `ffmpeg-${asset.arch}`))
      await downloadVerified(`darwin-${asset.arch}.LICENSE`, asset.license, join(workspace, `COPYING-${asset.arch}.txt`))
      await downloadVerified(`darwin-${asset.arch}.README`, asset.source, join(workspace, `SOURCE-${asset.arch}.txt`))
    }
    const universalPath = join(workspace, 'ffmpeg-universal-apple-darwin')
    execFileSync('xcrun', ['lipo', '-create', join(workspace, 'ffmpeg-x64'), join(workspace, 'ffmpeg-arm64'), '-output', universalPath], { stdio: 'inherit' })
    const architectures = execFileSync('xcrun', ['lipo', '-archs', universalPath], { encoding: 'utf8' }).trim().split(/\s+/).sort()
    if (architectures.join(' ') !== 'arm64 x86_64') throw new Error(`Universal FFmpeg has unexpected architectures: ${architectures.join(', ')}`)
    await chmod(universalPath, 0o755)
    await mkdir(binaryDirectory, { recursive: true })
    await mkdir(resourceDirectory, { recursive: true })
    await copyFile(universalPath, join(binaryDirectory, 'ffmpeg-universal-apple-darwin'))
    for (const asset of assets) {
      await copyFile(join(workspace, `COPYING-${asset.arch}.txt`), join(resourceDirectory, `COPYING-${asset.arch}.txt`))
      await copyFile(join(workspace, `SOURCE-${asset.arch}.txt`), join(resourceDirectory, `SOURCE-${asset.arch}.txt`))
    }
    process.stdout.write('Prepared checksum-verified universal FFmpeg sidecar for arm64 and x86_64.\n')
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
}

async function downloadVerified(assetName, expected, destination) {
  const response = await fetch(`${ffmpegReleaseUrl}/${assetName}`, { redirect: 'follow' })
  if (!response.ok || !response.body) throw new Error(`Unable to download ${assetName}: HTTP ${response.status}.`)
  const file = await open(destination, 'w')
  const hash = createHash('sha256')
  try {
    for await (const chunk of response.body) {
      const bytes = Buffer.from(chunk)
      hash.update(bytes)
      await file.write(bytes)
    }
  } finally {
    await file.close()
  }
  const actual = hash.digest('hex')
  if (actual !== expected) throw new Error(`${assetName} checksum mismatch: expected ${expected}, received ${actual}.`)
}

async function verifySha256(path, expected, label) {
  const actual = createHash('sha256').update(await readFile(path)).digest('hex')
  if (actual !== expected) throw new Error(`${label} checksum mismatch: expected ${expected}, received ${actual}.`)
}
