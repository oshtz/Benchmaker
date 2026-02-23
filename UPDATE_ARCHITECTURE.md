# Auto-Update Architecture via GitHub Releases

This document provides a detailed, developer-oriented explanation of how the auto-update mechanism works in this application. The architecture is designed to be **modular** and can be adapted to other Tauri-based desktop applications with minimal modifications.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Components](#components)
   - [Frontend Layer](#frontend-layer)
   - [State Management Layer](#state-management-layer)
   - [Service Layer](#service-layer)
   - [Backend Layer](#backend-layer)
4. [Data Flow](#data-flow)
5. [GitHub Releases Integration](#github-releases-integration)
6. [Configuration Points](#configuration-points)
7. [Security Considerations](#security-considerations)
8. [Platform Support](#platform-support)
9. [Extending the System](#extending-the-system)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This application implements a **self-contained auto-update system** that:

1. **Checks** for new versions by querying the GitHub Releases API
2. **Downloads** the latest release binary directly from GitHub
3. **Applies** the update by replacing the running executable and restarting

The system is specifically designed for **portable executables** (single-file distributions) rather than installer-based deployments, making it ideal for apps distributed as standalone `.exe` files on Windows.

### Key Characteristics

| Aspect | Implementation |
|--------|----------------|
| **Version Source** | GitHub Releases API (`/repos/{owner}/{repo}/releases/latest`) |
| **Version Format** | Semantic versioning with optional `v` prefix (e.g., `v1.2.3` or `1.2.3`) |
| **Binary Distribution** | Portable executable as a release asset |
| **Update Strategy** | Download → Replace → Restart |
| **Platform** | Windows (primary), extensible to other platforms |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────┐         ┌──────────────────────────────┐        │
│  │   AutoUpdater.tsx     │         │     UpdateStatus.tsx          │        │
│  │   (Background Check)  │         │     (Manual UI Control)       │        │
│  │                       │         │                               │        │
│  │ • On mount: check     │         │ • Display current version     │        │
│  │ • Auto-download       │         │ • Check for updates button    │        │
│  │ • Prompt to install   │         │ • Download / Install actions  │        │
│  └───────────┬───────────┘         └───────────────┬───────────────┘        │
│              │                                     │                        │
│              └──────────────┬──────────────────────┘                        │
│                             ▼                                               │
│              ┌──────────────────────────────┐                               │
│              │       updateStore.ts         │                               │
│              │       (Zustand Store)        │                               │
│              │                              │                               │
│              │ State:                       │                               │
│              │ • currentVersion             │                               │
│              │ • status (idle/checking/...) │                               │
│              │ • updateInfo                 │                               │
│              │ • updatePath                 │                               │
│              │ • error                      │                               │
│              │                              │                               │
│              │ Actions:                     │                               │
│              │ • checkNow()                 │                               │
│              │ • downloadNow()              │                               │
│              │ • installNow()               │                               │
│              └──────────────┬───────────────┘                               │
│                             │                                               │
└─────────────────────────────┼───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER (TypeScript)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           updater.ts                                  │  │
│  │                                                                       │  │
│  │  Exports:                                                             │  │
│  │  ├── checkForUpdate(): Promise<UpdateInfo | null>                     │  │
│  │  ├── downloadUpdate(info: UpdateInfo): Promise<string>                │  │
│  │  └── installUpdate(updatePath: string): Promise<void>                 │  │
│  │                                                                       │  │
│  │  Internal Helpers:                                                    │  │
│  │  ├── fetchJson<T>(url): Fetch JSON via Tauri HTTP API                 │  │
│  │  ├── downloadBinary(url): Fetch binary via Tauri HTTP API             │  │
│  │  ├── normalizeVersion(v): Strip 'v' prefix, handle pre-release tags   │  │
│  │  ├── compareVersions(a, b): Semantic version comparison               │  │
│  │  └── isTauriRuntime(): Check if running in Tauri vs browser           │  │
│  │                                                                       │  │
│  │  Configuration Constants:                                             │  │
│  │  ├── GITHUB_REPO = 'owner/repo'                                       │  │
│  │  ├── RELEASE_ASSET_NAME = 'AppName-Portable.exe'                      │  │
│  │  └── UPDATE_DIR_NAME = 'app-updates'                                  │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                             │                                               │
│                             │ Uses @tauri-apps/api                          │
│                             │ • /api/http (fetch JSON/binary)               │
│                             │ • /api/app (getVersion)                       │
│                             │ • /api/fs (writeBinaryFile, createDir)        │
│                             │ • /api/path (appLocalDataDir, join)           │
│                             │ • /api/tauri (invoke)                         │
│                             ▼                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ IPC: invoke('apply_update', { updatePath })
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER (Rust / Tauri)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           main.rs                                     │  │
│  │                                                                       │  │
│  │  #[tauri::command]                                                    │  │
│  │  fn apply_update(app: AppHandle, update_path: String) -> Result<()>   │  │
│  │                                                                       │  │
│  │  Algorithm:                                                           │  │
│  │  1. Validate update file exists                                       │  │
│  │  2. Get current executable path                                       │  │
│  │  3. Get current process ID                                            │  │
│  │  4. Spawn detached PowerShell script that:                            │  │
│  │     a. Waits for current process to exit                              │  │
│  │     b. Replaces old .exe with new .exe                                │  │
│  │     c. Starts the new executable                                      │  │
│  │  5. Exit current application                                          │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Fetches from GitHub API
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL (GitHub)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GitHub Releases API                                                        │
│  GET https://api.github.com/repos/{owner}/{repo}/releases/latest            │
│                                                                             │
│  Response (simplified):                                                     │
│  {                                                                          │
│    "tag_name": "v1.2.3",                                                    │
│    "body": "Release notes in markdown...",                                  │
│    "published_at": "2024-01-15T12:00:00Z",                                  │
│    "assets": [                                                              │
│      {                                                                      │
│        "name": "AppName-Portable.exe",                                      │
│        "browser_download_url": "https://github.com/.../releases/.../..."    │
│      }                                                                      │
│    ]                                                                        │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### Frontend Layer

#### `AutoUpdater.tsx` — Background Update Component

A **headless React component** that:
- Runs a single update check on mount
- If an update is found, automatically downloads it
- Prompts the user via a dialog to restart and apply

```tsx
// Simplified flow
useEffect(() => {
  const info = await checkNow()        // Check for update
  if (info) {
    await downloadNow(info)            // Download binary
    setDialogOpen(true)                // Prompt user
  }
}, [])
```

**Usage:** Mount this component once at the app root to enable automatic background updates.

#### `UpdateStatus.tsx` — Manual Update UI

A **visible React component** providing:
- Current version display
- Status indicator (checking, available, downloading, ready, error)
- Manual "Check for updates" button
- Download and Install action buttons
- Release notes display

This gives users full control over the update process when they want it.

### State Management Layer

#### `updateStore.ts` — Zustand Store

Centralized state for the update lifecycle:

```typescript
interface UpdateState {
  currentVersion: string | null     // From Tauri's getVersion()
  status: UpdateStatus              // 'idle' | 'checking' | 'available' | ...
  updateInfo: UpdateInfo | null     // Version, notes, download URL
  updatePath: string | null         // Local path after download
  error: string | null              // Error message if any
  lastCheckedAt: number | null      // Timestamp of last check
  
  // Actions
  loadCurrentVersion(): Promise<void>
  checkNow(): Promise<UpdateInfo | null>
  downloadNow(info?: UpdateInfo): Promise<string | null>
  installNow(): Promise<void>
}
```

**State Machine:**

```
┌────────┐  checkNow()  ┌──────────┐  update?  ┌───────────┐
│  idle  │────────────▶│ checking │──────────▶│ available │
└────────┘              └──────────┘           └───────────┘
                             │                       │
                        no update              downloadNow()
                             ▼                       ▼
                       ┌───────────┐          ┌─────────────┐
                       │ up-to-date│          │ downloading │
                       └───────────┘          └─────────────┘
                                                     │
                                                     ▼
                                               ┌─────────┐
                                               │  ready  │
                                               └─────────┘
                                                     │
                                               installNow()
                                                     ▼
                                              ┌────────────┐
                                              │ installing │
                                              └────────────┘
                                                     │
                                               (app exits)
```

### Service Layer

#### `updater.ts` — Core Update Logic

**Key Functions:**

1. **`checkForUpdate()`**
   - Fetches `/releases/latest` from GitHub API
   - Compares remote version with local version
   - Returns `UpdateInfo` if newer version available, else `null`

2. **`downloadUpdate(info: UpdateInfo)`**
   - Downloads the binary asset
   - Writes to `%LOCALAPPDATA%/{app}/updates/{AppName}-{version}.exe`
   - Returns the absolute path to the downloaded file

3. **`installUpdate(updatePath: string)`**
   - Invokes the Rust backend command `apply_update`
   - Application exits to allow replacement

**Version Comparison Logic:**

```typescript
// Handles: "v1.2.3", "1.2.3", "1.2.3-beta.1"
function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '').split('-')[0]
}

function compareVersions(left: string, right: string): number {
  // Split into parts, compare numerically
  // Returns: 1 if left > right, -1 if left < right, 0 if equal
}
```

### Backend Layer

#### `main.rs` — Rust Backend Command

The `apply_update` command handles the critical replacement step:

```rust
#[tauri::command]
fn apply_update(app: AppHandle, update_path: String) -> Result<(), String> {
    // 1. Validate update file exists
    // 2. Get current executable path
    // 3. Spawn PowerShell script to:
    //    - Wait for this process to exit
    //    - Move new exe over old exe
    //    - Start the new exe
    // 4. Exit application
}
```

**PowerShell Script (Windows):**

```powershell
$procId = {current_pid}
$source = '{downloaded_update_path}'
$target = '{current_exe_path}'

# Wait for app to close
while (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
    Start-Sleep -Milliseconds 200
}

# Replace executable
Move-Item -Force $source $target

# Launch new version
Start-Process $target
```

---

## Data Flow

### Complete Update Lifecycle

```
1. USER OPENS APP
   │
   ▼
2. AutoUpdater mounts
   │
   ▼
3. checkNow() called
   │
   ├─▶ updateStore sets status = 'checking'
   │
   ├─▶ updater.ts: checkForUpdate()
   │   │
   │   ├─▶ getVersion() from @tauri-apps/api/app
   │   │   Returns: "1.0.0"
   │   │
   │   ├─▶ fetch() to https://api.github.com/repos/{owner}/{repo}/releases/latest
   │   │   Returns: { tag_name: "v1.1.0", assets: [...], body: "..." }
   │   │
   │   ├─▶ compareVersions("1.1.0", "1.0.0") => 1 (newer)
   │   │
   │   └─▶ Find asset matching RELEASE_ASSET_NAME
   │       Returns: { version: "1.1.0", downloadUrl: "...", notes: "..." }
   │
   ├─▶ updateStore sets status = 'available', updateInfo = {...}
   │
   ▼
4. downloadNow() called automatically
   │
   ├─▶ updateStore sets status = 'downloading'
   │
   ├─▶ updater.ts: downloadUpdate(info)
   │   │
   │   ├─▶ downloadBinary(info.downloadUrl)
   │   │   Returns: Uint8Array (binary data)
   │   │
   │   ├─▶ createDir() for updates folder
   │   │
   │   └─▶ writeBinaryFile() saves as AppName-1.1.0.exe
   │       Returns: "C:\Users\{user}\AppData\Local\{app}\updates\AppName-1.1.0.exe"
   │
   ├─▶ updateStore sets status = 'ready', updatePath = "..."
   │
   ▼
5. Dialog prompts user: "Restart to update?"
   │
   ├─▶ User clicks "Later" → Dialog closes, update remains ready
   │
   └─▶ User clicks "Restart now"
       │
       ▼
6. installNow() called
   │
   ├─▶ updateStore sets status = 'installing'
   │
   ├─▶ updater.ts: installUpdate(updatePath)
   │   │
   │   └─▶ invoke('apply_update', { updatePath })
   │
   ├─▶ Rust backend: apply_update()
   │   │
   │   ├─▶ Spawn PowerShell script (detached)
   │   │
   │   └─▶ app.exit(0)
   │
   ▼
7. APPLICATION CLOSES
   │
   ▼
8. PowerShell script runs
   │
   ├─▶ Waits for process exit
   ├─▶ Move-Item replaces old exe
   └─▶ Start-Process launches new version
       │
       ▼
9. NEW VERSION STARTS
```

---

## GitHub Releases Integration

### Release Publishing Workflow

The CI/CD pipeline (`.github/workflows/build.yml`) automatically:

1. **Builds** the application on push to `main`
2. **Creates a portable executable** using Enigma Virtual Box (Windows)
3. **Determines version** from `package.json`
4. **Creates/updates GitHub Release** with the version tag
5. **Uploads** the portable executable as a release asset

### Release Structure Requirements

For the auto-updater to work, releases must follow this structure:

```
GitHub Release
├── Tag: v{major}.{minor}.{patch}  (e.g., v1.2.3)
├── Body: Release notes (markdown)
├── Assets:
│   └── {AppName}-Portable.exe     (or fallback: any .exe file)
```

### Version Synchronization

Version must be kept in sync across:

| File | Field | Example |
|------|-------|---------|
| `package.json` | `version` | `"1.2.3"` |
| `src-tauri/tauri.conf.json` | `package.version` | `"1.2.3"` |
| GitHub Release | Tag | `v1.2.3` |

The CI workflow reads the version from `package.json` and creates the tag automatically.

---

## Configuration Points

### Adapting for Your Application

To use this system in another app, modify these configuration points:

#### 1. `updater.ts` Constants

```typescript
const GITHUB_REPO = 'your-org/your-repo'        // GitHub repository
const RELEASE_ASSET_NAME = 'YourApp-Portable.exe'  // Expected asset name
const UPDATE_DIR_NAME = 'yourapp-updates'        // Local storage folder
```

#### 2. `tauri.conf.json` HTTP Allowlist

```json
{
  "tauri": {
    "allowlist": {
      "http": {
        "scope": [
          "https://api.github.com/**",
          "https://github.com/{your-org}/{your-repo}/releases/**",
          "https://objects.githubusercontent.com/**"
        ]
      }
    }
  }
}
```

#### 3. `tauri.conf.json` Filesystem Scope

```json
{
  "tauri": {
    "allowlist": {
      "fs": {
        "writeFile": true,
        "createDir": true,
        "scope": ["$APPLOCALDATA", "$APPLOCALDATA/**"]
      }
    }
  }
}
```

#### 4. Backend Command Registration

In `main.rs`, ensure the command is registered:

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        // ... other commands
        apply_update,
    ])
```

---

## Security Considerations

### Current Safeguards

| Concern | Mitigation |
|---------|------------|
| **HTTPS Only** | All GitHub API and download URLs use HTTPS |
| **Domain Allowlist** | Tauri HTTP scope restricts requests to GitHub domains only |
| **Development Mode** | Updates are disabled in dev builds (`import.meta.env.DEV`) |
| **Debug Builds** | Rust backend rejects updates in debug mode |
| **Rate Limiting** | Handles GitHub API rate limits gracefully with user-friendly errors |

### Recommendations for Production

1. **Code Signing**: Sign your executables with a valid code signing certificate
2. **Checksum Verification**: Add SHA256 checksum verification of downloaded binaries
3. **Signature Verification**: For high-security apps, implement GPG signature verification
4. **Private Repos**: For private repositories, implement GitHub App or PAT authentication

### Adding Checksum Verification

Example enhancement for your release workflow:

```yaml
# In GitHub Actions, after building:
- name: Generate checksum
  run: |
    sha256sum Benchmaker-Portable.exe > checksums.txt
```

Then in `updater.ts`:

```typescript
// Fetch checksums.txt from release
// Verify downloaded binary matches expected hash
const expectedHash = await fetchChecksum(release)
const actualHash = await computeHash(binary)
if (expectedHash !== actualHash) {
  throw new Error('Checksum mismatch - download may be corrupted')
}
```

---

## Platform Support

### Current Implementation

| Platform | Support | Notes |
|----------|---------|-------|
| **Windows** | ✅ Full | Uses PowerShell for replacement, `.exe` assets |
| **macOS** | ✅ Full | Uses bash for replacement, `.app.zip` assets |
| **Linux** | ⚠️ Partial | Needs shell script adaptation |

### Windows Implementation Details

The update replacement uses PowerShell because:
- Windows locks running executables
- A detached script can wait for the process to exit
- `Move-Item -Force` handles the replacement atomically

**Asset Format:** `{AppName}-Portable.exe` (single-file portable executable)

**Replacement Script:**
```powershell
$procId = {pid}
$source = '{downloaded_exe_path}'
$target = '{current_exe_path}'

while (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
    Start-Sleep -Milliseconds 200
}
Move-Item -Force $source $target
Start-Process $target
```

### macOS Implementation Details

macOS apps are distributed as `.app` bundles (actually directories), which requires different handling:

**Key Differences from Windows:**

| Aspect | Windows | macOS |
|--------|---------|-------|
| **Shell** | PowerShell | bash |
| **Asset Format** | `.exe` | `.app.zip` |
| **App Structure** | Single file | `.app` bundle (directory) |
| **Executable Location** | The `.exe` itself | `.app/Contents/MacOS/{binary}` |
| **Replacement** | `Move-Item` | `rm -rf` + `mv` |
| **Launch Command** | `Start-Process` | `open` |

**Asset Format:** `{AppName}.app.zip` (zipped `.app` bundle)

The zip format is used because:
1. GitHub releases work with single files, not directories
2. Zip preserves macOS-specific attributes
3. Easy extraction with built-in `ditto` command

**Replacement Script:**
```bash
pid={current_pid}
source='{extracted_app_path}'
target='{current_app_bundle_path}'

# Wait for app to exit
while kill -0 $pid 2>/dev/null; do sleep 0.2; done

# Replace the entire .app bundle
rm -rf "$target"
mv -f "$source" "$target"

# Launch new version
open "$target"
```

**App Bundle Path Resolution:**
```
Current executable:  /Applications/AppName.app/Contents/MacOS/AppName
                     └────────────────────────────────────────────────
                     current_exe.parent().parent().parent() = .app bundle
```

---

## macOS Support Implementation Guide

This section provides complete implementation details for adding macOS auto-update support.

### Architecture Changes for macOS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PLATFORM-AWARE UPDATE FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      updater.ts (Service Layer)                      │   │
│  │                                                                      │   │
│  │  1. Detect platform via @tauri-apps/api/os                           │   │
│  │  2. Select appropriate asset name:                                   │   │
│  │     • Windows: "AppName-Portable.exe"                                │   │
│  │     • macOS:   "AppName.app.zip"                                     │   │
│  │  3. Download binary                                                  │   │
│  │  4. Platform-specific post-processing:                               │   │
│  │     • Windows: Save .exe directly                                    │   │
│  │     • macOS:   Save .zip, invoke extract_app_zip command             │   │
│  │                                                                      │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                          │
│                                 ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      main.rs (Backend Layer)                         │   │
│  │                                                                      │   │
│  │  Commands:                                                           │   │
│  │  ├── apply_update(update_path)                                       │   │
│  │  │   ├── #[cfg(target_os = "windows")] → PowerShell script           │   │
│  │  │   └── #[cfg(target_os = "macos")]   → Bash script                 │   │
│  │  │                                                                   │   │
│  │  └── extract_app_zip(zip_path) [macOS only]                          │   │
│  │       └── Uses `ditto -xk` to extract .app from .zip                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Required Code Changes

#### 1. Service Layer: `src/services/updater.ts`

**Add platform detection and asset configuration:**

```typescript
import { platform } from '@tauri-apps/api/os'

const GITHUB_REPO = 'oshtz/Benchmaker'
const UPDATE_DIR_NAME = 'benchmaker-updates'

// Platform-specific asset configuration
async function getAssetConfig(): Promise<{ name: string; extension: string }> {
  const os = await platform()
  
  if (os === 'darwin') {
    return { name: 'Benchmaker.app.zip', extension: '.app.zip' }
  }
  // Default to Windows
  return { name: 'Benchmaker-Portable.exe', extension: '.exe' }
}
```

**Update `checkForUpdate()` to find platform-specific assets:**

```typescript
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

  // Find platform-specific asset
  const assetConfig = await getAssetConfig()
  const assets = release.assets ?? []
  const asset =
    assets.find((entry) => entry.name === assetConfig.name) ??
    assets.find((entry) => 
      entry.browser_download_url.toLowerCase().endsWith(assetConfig.extension)
    )

  if (!asset) {
    throw new Error('No compatible update asset found for this platform.')
  }

  return {
    version: latestVersion,
    notes: release.body ?? null,
    publishedAt: release.published_at ?? null,
    downloadUrl: asset.browser_download_url,
  }
}
```

**Update `downloadUpdate()` to handle macOS zip extraction:**

```typescript
export async function downloadUpdate(update: UpdateInfo): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error('Updates require the Tauri runtime.')
  }

  const binary = await downloadBinary(update.downloadUrl)
  const { appLocalDataDir, join } = await import('@tauri-apps/api/path')
  const { createDir, writeBinaryFile, BaseDirectory } = await import('@tauri-apps/api/fs')
  const os = await platform()

  await createDir(UPDATE_DIR_NAME, { dir: BaseDirectory.AppLocalData, recursive: true })

  // Platform-specific filename
  const fileName = os === 'darwin' 
    ? `Benchmaker-${update.version}.app.zip`
    : `Benchmaker-${update.version}.exe`
  
  const updatePath = await join(await appLocalDataDir(), UPDATE_DIR_NAME, fileName)

  await writeBinaryFile(
    { path: `${UPDATE_DIR_NAME}/${fileName}`, contents: binary },
    { dir: BaseDirectory.AppLocalData }
  )

  // On macOS, extract the .app from the zip
  if (os === 'darwin') {
    const { invoke } = await import('@tauri-apps/api/tauri')
    const extractedPath = await invoke<string>('extract_app_zip', { zipPath: updatePath })
    return extractedPath
  }

  return updatePath
}
```

#### 2. Backend Layer: `src-tauri/src/main.rs`

**Add Rust helper for escaping bash strings:**

```rust
fn escape_bash_literal(value: &str) -> String {
    value.replace("'", "'\\''")
}
```

**Update `apply_update` command with platform-conditional compilation:**

```rust
#[tauri::command]
fn apply_update(app: AppHandle, update_path: String) -> Result<(), String> {
    if cfg!(debug_assertions) {
        return Err("Auto-update is disabled in dev builds.".to_string());
    }

    let update_file = Path::new(&update_path);
    if !update_file.exists() {
        return Err("Update file not found.".to_string());
    }

    let current_exe = std::env::current_exe().map_err(|err| err.to_string())?;
    let pid = std::process::id();

    #[cfg(target_os = "windows")]
    {
        let script = format!(
            "$procId = {pid}; $source = '{source}'; $target = '{target}'; \
             while (Get-Process -Id $procId -ErrorAction SilentlyContinue) {{ Start-Sleep -Milliseconds 200 }}; \
             Move-Item -Force $source $target; Start-Process $target",
            pid = pid,
            source = escape_powershell_literal(&update_file.to_string_lossy()),
            target = escape_powershell_literal(&current_exe.to_string_lossy()),
        );

        Command::new("powershell")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
            .spawn()
            .map_err(|err| err.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        // Get the .app bundle path (current_exe is inside .app/Contents/MacOS/)
        let app_bundle = current_exe
            .parent()  // MacOS/
            .and_then(|p| p.parent())  // Contents/
            .and_then(|p| p.parent())  // .app bundle
            .ok_or("Could not determine app bundle path")?;

        let script = format!(
            r#"
            pid={}
            source='{}'
            target='{}'
            
            while kill -0 $pid 2>/dev/null; do sleep 0.2; done
            rm -rf "$target"
            mv -f "$source" "$target"
            open "$target"
            "#,
            pid,
            escape_bash_literal(&update_file.to_string_lossy()),
            escape_bash_literal(&app_bundle.to_string_lossy()),
        );

        Command::new("bash")
            .args(["-c", &script])
            .spawn()
            .map_err(|err| err.to_string())?;
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        return Err("Auto-update is not supported on this platform.".to_string());
    }

    app.exit(0);
    Ok(())
}
```

**Add the `extract_app_zip` command (macOS only):**

```rust
#[cfg(target_os = "macos")]
#[tauri::command]
fn extract_app_zip(zip_path: String) -> Result<String, String> {
    use std::process::Command;
    
    let zip_file = Path::new(&zip_path);
    let parent = zip_file.parent().ok_or("Invalid zip path")?;
    
    // Use ditto to extract (preserves macOS attributes and code signatures)
    let status = Command::new("ditto")
        .args(["-xk", &zip_path, &parent.to_string_lossy()])
        .status()
        .map_err(|e| e.to_string())?;
    
    if !status.success() {
        return Err("Failed to extract update".to_string());
    }
    
    // Return path to extracted .app
    let app_path = parent.join("Benchmaker.app");
    if !app_path.exists() {
        return Err("Extracted app not found".to_string());
    }
    
    // Clean up zip file
    std::fs::remove_file(zip_file).ok();
    
    Ok(app_path.to_string_lossy().to_string())
}

// Stub for non-macOS platforms
#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn extract_app_zip(_zip_path: String) -> Result<String, String> {
    Err("This command is only available on macOS".to_string())
}
```

**Register the new command in `main()`:**

```rust
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // ... existing commands ...
            apply_update,
            extract_app_zip,  // Add this
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 3. CI/CD: `.github/workflows/build.yml`

**Add steps to create and upload the `.app.zip` for macOS:**

```yaml
# After the "Build Tauri app (dmg)" step in the macOS job:

- name: Create app.zip for auto-update
  if: github.ref == 'refs/heads/main'
  run: |
    cd src-tauri/target/release/bundle/macos
    # Use ditto to create zip (preserves code signature and attributes)
    ditto -c -k --keepParent "Benchmaker.app" "Benchmaker.app.zip"
    ls -la  # Verify output

- name: Upload app.zip to GitHub release
  if: github.ref == 'refs/heads/main'
  uses: softprops/action-gh-release@v2
  with:
    tag_name: ${{ steps.release_tag.outputs.tag }}
    files: src-tauri/target/release/bundle/macos/Benchmaker.app.zip
```

### Release Asset Structure (Cross-Platform)

After implementing macOS support, releases should contain:

```
GitHub Release
├── Tag: v{major}.{minor}.{patch}
├── Body: Release notes (markdown)
├── Assets:
│   ├── Benchmaker-Portable.exe      (Windows auto-update)
│   ├── Benchmaker.app.zip           (macOS auto-update)
│   └── Benchmaker_{version}.dmg     (macOS manual install)
```

### Why `.app.zip` Instead of `.dmg`?

| Format | Use Case | Auto-Update Compatible |
|--------|----------|------------------------|
| `.dmg` | Manual installation (drag to /Applications) | ❌ No (requires mount/unmount) |
| `.app.zip` | Programmatic extraction and replacement | ✅ Yes |
| `.pkg` | System-level installation with admin rights | ❌ No (requires installer UI) |

The `.dmg` is kept for users who want to manually download and install, while `.app.zip` is specifically for the auto-update mechanism.

### macOS-Specific Considerations

#### Code Signing Preservation

The `ditto` command is used instead of `unzip` because it:
- Preserves macOS extended attributes
- Maintains code signature integrity
- Handles resource forks correctly

#### App Bundle Replacement

Unlike Windows where we replace a single `.exe`, on macOS we must:
1. **Remove** the existing `.app` bundle entirely (`rm -rf`)
2. **Move** the new `.app` bundle into place (`mv`)

This is atomic at the filesystem level and ensures no stale files remain.

#### Launch Mechanism

The `open` command is used instead of directly executing the binary because:
- It properly initializes the application bundle
- Registers the app with the system
- Handles LaunchServices integration

---

## Extending the System

### Adding Update Channels (Beta/Stable)

```typescript
// In updater.ts
type UpdateChannel = 'stable' | 'beta'

async function checkForUpdate(channel: UpdateChannel = 'stable') {
  const releases = await fetchJson<GitHubRelease[]>(
    `https://api.github.com/repos/${GITHUB_REPO}/releases`
  )
  
  const targetRelease = releases.find(r => {
    const isPrerelease = r.tag_name.includes('-')
    return channel === 'beta' ? true : !isPrerelease
  })
  
  // ... rest of comparison logic
}
```

### Adding Progress Reporting

```typescript
// Modify downloadBinary to report progress
export async function downloadUpdate(
  update: UpdateInfo,
  onProgress?: (percent: number) => void
): Promise<string> {
  // Use fetch with streaming and Content-Length
  // Call onProgress(downloaded / total * 100)
}
```

### Adding Rollback Capability

```typescript
// Before applying update, backup current exe
const backupPath = `${currentExe}.backup`
await copyFile(currentExe, backupPath)

// In case of failure, restore from backup
```

---

## Troubleshooting

### Common Issues

#### "Updates are disabled in this build"
- **Cause**: Running in development mode or web browser
- **Fix**: Build and run the production Tauri app

#### "GitHub API rate limit exceeded"
- **Cause**: Too many requests (60/hour for unauthenticated)
- **Fix**: Wait an hour, or add GitHub token for higher limits

#### "No compatible update asset found"
- **Cause**: Release doesn't have expected asset name
- **Fix**: Ensure release has `{AppName}-Portable.exe` attached

#### "Update file not found"
- **Cause**: Downloaded file was moved or deleted
- **Fix**: Re-download the update

#### Update doesn't apply after restart
- **Cause**: PowerShell script failed
- **Fix**: Check if antivirus is blocking; run as administrator

### Debug Tips

1. **Check update status**: Open the UpdateStatus dialog to see current state
2. **View console logs**: Update operations log errors to console
3. **Inspect local data**: Check `%LOCALAPPDATA%/{AppName}/updates/` for downloaded files
4. **Check GitHub**: Verify the latest release exists and has correct assets

---

## File Reference

| File | Purpose |
|------|---------|
| `src/services/updater.ts` | Core update logic (check, download, install) |
| `src/stores/updateStore.ts` | Zustand state management for update lifecycle |
| `src/components/layout/AutoUpdater.tsx` | Background auto-update component |
| `src/components/layout/UpdateStatus.tsx` | Manual update UI component |
| `src-tauri/src/main.rs` | Rust backend with `apply_update` command |
| `src-tauri/tauri.conf.json` | Tauri config with HTTP/FS allowlist |
| `.github/workflows/build.yml` | CI/CD workflow that creates releases |

---

## Summary

This auto-update architecture provides:

✅ **Zero-config updates** — Users get new versions automatically  
✅ **User control** — Manual check/download/install available  
✅ **Transparent source** — Uses public GitHub Releases API  
✅ **Portable-friendly** — Designed for single-file executables  
✅ **Modular design** — Easy to adapt for other Tauri applications  
✅ **Graceful degradation** — Works without updates in dev/browser mode
