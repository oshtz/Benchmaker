type GitHubReleaseAsset = {
  name: string
  browser_download_url: string
}

type GitHubRelease = {
  tag_name: string
  body?: string | null
  published_at?: string | null
  assets?: GitHubReleaseAsset[]
}

export type UpdateInfo = {
  version: string
  notes: string | null
  publishedAt: string | null
  downloadUrl: string
}

const GITHUB_REPO = 'oshtz/Benchmaker'
const RELEASE_ASSET_NAME = 'Benchmaker-Portable.exe'
const UPDATE_DIR_NAME = 'benchmaker-updates'

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '').split('-')[0]
}

function compareVersions(left: string, right: string): number {
  const leftParts = normalizeVersion(left).split('.').map((part) => Number(part) || 0)
  const rightParts = normalizeVersion(right).split('.').map((part) => Number(part) || 0)
  const maxLength = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] ?? 0
    const rightValue = rightParts[index] ?? 0
    if (leftValue > rightValue) return 1
    if (leftValue < rightValue) return -1
  }

  return 0
}

async function fetchJson<T>(url: string): Promise<T> {
  const { fetch, ResponseType } = await import('@tauri-apps/api/http')
  const response = await fetch<T>(url, {
    method: 'GET',
    responseType: ResponseType.JSON,
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Benchmaker',
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status})`)
  }

  return response.data
}

async function downloadBinary(url: string): Promise<Uint8Array> {
  const { fetch, ResponseType } = await import('@tauri-apps/api/http')
  const response = await fetch<Uint8Array>(url, {
    method: 'GET',
    responseType: ResponseType.Binary,
    headers: {
      'User-Agent': 'Benchmaker',
    },
  })

  if (!response.ok) {
    throw new Error(`Update download failed (${response.status})`)
  }

  return response.data
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isTauriRuntime() || import.meta.env.DEV) return null

  const { getVersion } = await import('@tauri-apps/api/app')
  const currentVersion = await getVersion()
  const release = await fetchJson<GitHubRelease>(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
  )

  const latestVersion = normalizeVersion(release.tag_name || '')
  if (!latestVersion) return null

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return null
  }

  const assets = release.assets ?? []
  const asset =
    assets.find((entry) => entry.name === RELEASE_ASSET_NAME) ??
    assets.find((entry) => entry.browser_download_url.toLowerCase().endsWith('.exe'))

  if (!asset) {
    throw new Error('No compatible update asset found in the latest release.')
  }

  return {
    version: latestVersion,
    notes: release.body ?? null,
    publishedAt: release.published_at ?? null,
    downloadUrl: asset.browser_download_url,
  }
}

export async function downloadUpdate(update: UpdateInfo): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error('Updates require the Tauri runtime.')
  }

  const binary = await downloadBinary(update.downloadUrl)
  const { tempDir, join } = await import('@tauri-apps/api/path')
  const { createDir, writeBinaryFile } = await import('@tauri-apps/api/fs')

  const baseDir = await tempDir()
  const updateDir = await join(baseDir, UPDATE_DIR_NAME)
  await createDir(updateDir, { recursive: true })

  const fileName = `Benchmaker-${update.version}.exe`
  const updatePath = await join(updateDir, fileName)

  await writeBinaryFile({ path: updatePath, contents: binary })
  return updatePath
}

export async function installUpdate(updatePath: string): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error('Updates require the Tauri runtime.')
  }

  const { invoke } = await import('@tauri-apps/api/tauri')
  await invoke('apply_update', { updatePath })
}
