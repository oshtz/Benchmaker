import { expect, test } from '@playwright/test'

test('renders the app shell and empty benchmark state', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Benchmaker/)
  await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Prompts/i })).toBeVisible()
  await expect(page.getByText('Build your first benchmark suite')).toBeVisible()
})

test('opens update status dialog and degrades cleanly outside Tauri', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Settings' }).click()

  await page.getByRole('button', { name: /About Benchmaker/i }).click()

  await expect(page.getByRole('dialog', { name: /About Benchmaker/i })).toBeVisible()
  await expect(page.getByText('Version and update status')).toBeVisible()
  await expect(page.getByText('Updates are disabled in this build.')).toBeVisible()
  await expect(page.getByText('Updates are only available in the desktop app.')).toBeVisible()
})

test('loads prompt editors without Monaco CDN access', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort())
  await page.goto('/')

  await page.getByRole('button', { name: /Create manually/i }).click()
  await page.getByLabel(/Name/i).fill('Prompt editor smoke')
  await page.getByRole('button', { name: /^Create Suite$/i }).click()

  await expect(page.getByRole('heading', { name: 'System Prompt', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Judge System Prompt', exact: true })).toBeVisible()
  await expect(page.locator('.monaco-editor').first()).toBeVisible()
  await expect(page.getByText('Loading...')).toHaveCount(0)
})

test('centralizes application controls in Settings', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Settings' }).click()

  await expect(page.getByRole('heading', { name: 'Settings', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'OpenRouter' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Parameters' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Run Safety' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Updates & version' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set API Key' })).toBeVisible()

  await page.getByRole('combobox', { name: 'Color theme' }).click()
  await page.getByRole('option', { name: 'Dark' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('paginates the model catalog and keeps search global', async ({ page }) => {
  const models = Array.from({ length: 60 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0')
    return {
      id: `provider/model-${number}`,
      name: `Model ${number}`,
      context_length: 32_000,
      pricing: { prompt: '0.000001', completion: '0.000002' },
    }
  })

  await page.route('https://openrouter.ai/api/v1/models', async (route) => {
    await route.fulfill({ json: { data: models } })
  })
  await page.goto('/')
  await page.getByRole('tab', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Set API Key' }).click()
  await page.getByRole('textbox', { name: 'API Key' }).fill('sk-or-v1-test')
  await page.getByRole('button', { name: 'Validate & Save' }).click()
  await expect(page.getByRole('dialog', { name: 'OpenRouter API Key' })).toBeHidden()

  await page.getByRole('tab', { name: 'Code Arena' }).click()
  await expect(page.getByText('1–12 of 60')).toBeVisible()
  await expect(page.getByText('Model 01', { exact: true })).toBeVisible()
  await expect(page.getByText('Model 13', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Next model page' }).click()
  await expect(page.getByText('Model 13', { exact: true })).toBeVisible()
  await expect(page.getByText('Model 01', { exact: true })).toHaveCount(0)
  await expect(page.getByText('2/5', { exact: true })).toBeVisible()

  await page.getByPlaceholder('Search models...').fill('Model 60')
  await expect(page.getByText('Model 60', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next model page' })).toHaveCount(0)
})

test('keeps Code Arena configuration aligned without a collapsed layout gap', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  await page.getByRole('tab', { name: 'Code Arena' }).click()

  const configuration = page.getByRole('button', { name: 'Configuration' })
  const configurationPanel = page.locator('#code-arena-configuration')
  const prompt = page.getByLabel('What would you like to build?')
  const promptCard = prompt.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " surface ")][1]')

  await expect(prompt).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Code Arena', level: 2 })).toHaveCSS('font-size', '24px')
  await expect(page.getByText('Model Selection', { exact: true })).toHaveCSS('font-size', '18px')
  const openButtonBox = await configuration.boundingBox()
  const promptCardBox = await promptCard.boundingBox()
  expect(openButtonBox).not.toBeNull()
  expect(promptCardBox).not.toBeNull()
  expect(Math.abs(openButtonBox!.width - promptCardBox!.width)).toBeLessThanOrEqual(1)

  await configuration.click()
  expect(await configurationPanel.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0.15s')
  await expect(prompt).toBeHidden()
  await expect.poll(async () => (await configurationPanel.boundingBox())?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(50)

  const collapsedButtonBox = await configuration.boundingBox()
  const emptyGridBox = await page.getByText('Select models to compare').boundingBox()
  expect(collapsedButtonBox).not.toBeNull()
  expect(emptyGridBox).not.toBeNull()
  expect(emptyGridBox!.y - (collapsedButtonBox!.y + collapsedButtonBox!.height)).toBeLessThanOrEqual(24)
  expect(emptyGridBox!.width).toBeGreaterThan(collapsedButtonBox!.width * 2)

  await page.getByRole('button', { name: 'Expand configuration' }).click()
  await expect(prompt).toBeVisible()
  await expect.poll(async () => (await configurationPanel.boundingBox())?.width ?? 0).toBeGreaterThan(collapsedButtonBox!.width * 2)

  await page.getByRole('separator', { name: 'Resize configuration panel' }).press('Home')
  await expect(page.getByRole('button', { name: 'Expand configuration' })).toBeVisible()
  await expect.poll(async () => (await configurationPanel.boundingBox())?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(50)
  await page.getByRole('button', { name: 'Expand configuration' }).click()
  await expect(prompt).toBeVisible()
  await expect.poll(async () => (await configurationPanel.boundingBox())?.width ?? 0).toBeGreaterThan(collapsedButtonBox!.width * 2)
})

test('collapses the desktop navigation rail and remembers the preference', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')

  const sidebar = page.getByRole('complementary')
  await expect(sidebar).toHaveCSS('width', '224px')
  expect(await sidebar.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0.15s')
  await page.getByRole('button', { name: 'Collapse sidebar' }).click()
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible()
  await expect(sidebar).toHaveCSS('width', '68px')

  await page.reload()
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible()
  await expect(sidebar).toHaveCSS('width', '68px')

  await page.getByRole('button', { name: 'Expand sidebar' }).click()
  await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible()
  await expect(sidebar).toHaveCSS('width', '224px')
})
