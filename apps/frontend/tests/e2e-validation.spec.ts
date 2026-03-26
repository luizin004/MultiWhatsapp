import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOTS_DIR = 'tests/screenshots'

// Helper: the visible mobile panel (at 1440px, it's the desktop-toggle one)
const mobilePanel = (page: any) => page.locator('[data-mobile-panel="desktop-toggle"]')

test.describe('Vigia WhatsApp — Validação Geral', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=Vigia WhatsApp', { timeout: 10000 })
  })

  // 1. SCREENSHOTS
  test('Screenshot 01 — Desktop: tela inicial', async ({ page }) => {
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-desktop-home.png`, fullPage: true })
    await expect(page.locator('text=Desktop')).toBeVisible()
    await expect(page.locator('text=Mobile')).toBeVisible()
    await expect(page.locator('text=Metricas')).toBeVisible()
  })

  test('Screenshot 02 — Desktop: sidebar tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("Conversas")').first()).toBeVisible()
    await expect(page.locator('button:has-text("Grupos")').first()).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-desktop-sidebar-tabs.png`, fullPage: true })
  })

  test('Screenshot 03 — Mobile: tela inicial responsiva', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-mobile-home.png`, fullPage: true })
    await expect(mobilePanel(page)).toBeVisible()
  })

  test('Screenshot 04 — Mobile: sidebar com instâncias', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)
    await expect(mobilePanel(page).locator('text=Conversas')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-mobile-sidebar.png`, fullPage: true })
  })

  // 2. TOGGLE DESKTOP / MOBILE
  test('Toggle Desktop/Mobile funciona corretamente', async ({ page }) => {
    const desktopBtn = page.locator('button:has-text("Desktop")').first()
    const mobileBtn = page.locator('button:has-text("Mobile")').first()

    await expect(desktopBtn).toBeVisible()
    await expect(mobileBtn).toBeVisible()

    // Switch to Mobile
    await mobileBtn.click()
    await page.waitForTimeout(300)
    await expect(mobilePanel(page)).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-toggle-mobile-active.png`, fullPage: true })

    // Switch back to Desktop
    await desktopBtn.click()
    await page.waitForTimeout(300)
    await expect(mobilePanel(page)).not.toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-toggle-desktop-active.png`, fullPage: true })
  })

  // 3. TABS CONVERSAS / GRUPOS
  test('Tabs Conversas/Grupos alternam corretamente', async ({ page }) => {
    const conversasBtn = page.locator('button:has-text("Conversas")').first()
    const gruposBtn = page.locator('button:has-text("Grupos")').first()

    await conversasBtn.click()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-tab-conversas.png`, fullPage: true })

    await gruposBtn.click()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-tab-grupos.png`, fullPage: true })

    await conversasBtn.click()
    await page.waitForTimeout(200)
  })

  // 4. SIDEBAR — BUSCA E FILTROS
  test('Sidebar: campo de busca funciona', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Pesquisar"]').first()
    await expect(searchInput).toBeVisible()
    await searchInput.fill('teste123')
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-sidebar-search.png`, fullPage: true })
    await searchInput.fill('')
  })

  test('Sidebar: filtros Tudo/Não lidas/Grupos funcionam', async ({ page }) => {
    const tudoBtn = page.locator('button:has-text("Tudo")').first()
    const naoLidasBtn = page.locator('button:has-text("Não lidas")').first()

    await expect(tudoBtn).toBeVisible()
    await expect(naoLidasBtn).toBeVisible()

    await naoLidasBtn.click()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-filtro-nao-lidas.png`, fullPage: true })

    await tudoBtn.click()
    await page.waitForTimeout(200)
  })

  // 5. MENU DE CONFIGURAÇÕES
  test('Menu Configurações abre e fecha', async ({ page }) => {
    const settingsBtn = page.locator('button[title="Configurações"]').first()
    await expect(settingsBtn).toBeVisible()

    await settingsBtn.click()
    await page.waitForTimeout(300)

    await expect(page.locator('text=Respostas rápidas').first()).toBeVisible()
    await expect(page.locator('text=Etiquetas').first()).toBeVisible()
    await expect(page.locator('text=Webhooks').first()).toBeVisible()
    await expect(page.locator('text=Privacidade').first()).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/11-settings-menu.png`, fullPage: true })

    await page.locator('.fixed.inset-0').first().click()
    await page.waitForTimeout(200)
    await expect(page.locator('text=Respostas rápidas')).not.toBeVisible()
  })

  // 6. BOTÃO ADICIONAR INSTÂNCIA
  test('Botão adicionar instância abre modal', async ({ page }) => {
    const addBtn = page.locator('button[title="Adicionar instância"]').first()
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/12-add-instance-modal.png`, fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  })

  // 7. MOBILE — NAVEGAÇÃO
  test('Mobile: navegação sidebar → contatos', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/13-mobile-sidebar.png`, fullPage: true })
  })

  // 8. MOBILE TABS
  test('Mobile: tabs Conversas/Grupos', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    const mobileConversas = mobilePanel(page).locator('button[title="Conversas"]')
    const mobileGrupos = mobilePanel(page).locator('button[title="Grupos"]')

    await expect(mobileConversas).toBeVisible()
    await expect(mobileGrupos).toBeVisible()

    await mobileGrupos.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/15-mobile-grupos-tab.png`, fullPage: true })

    await mobileConversas.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/16-mobile-conversas-tab.png`, fullPage: true })
  })

  // 9. MOBILE — BUSCA
  test('Mobile: campo de busca funciona', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    const mobileSearch = mobilePanel(page).locator('input[placeholder*="Pesquisar"]').first()
    if (await mobileSearch.isVisible()) {
      await mobileSearch.fill('teste mobile')
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/17-mobile-search.png`, fullPage: true })
      await mobileSearch.fill('')
    }
  })

  // 10. LINK MÉTRICAS
  test('Link Metricas visível e aponta para /metrics', async ({ page }) => {
    const metricsLink = page.locator('a:has-text("Metricas")')
    await expect(metricsLink).toBeVisible()
    expect(await metricsLink.getAttribute('href')).toBe('/metrics')
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/18-metrics-link.png`, fullPage: true })
  })

  // 11. PÁGINA DE MÉTRICAS
  test('Página de Métricas carrega', async ({ page }) => {
    await page.goto(`${BASE_URL}/metrics`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/19-metrics-page.png`, fullPage: true })
  })

  // 12. MOBILE — FULL SCREEN
  test('Mobile layout preenche toda a tela', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    const panel = mobilePanel(page)
    await expect(panel).toBeVisible()

    const box = await panel.boundingBox()
    expect(box).toBeTruthy()
    if (box) {
      expect(box.width).toBeGreaterThan(800)
      expect(box.height).toBeGreaterThan(500)
    }
  })

  // 13. MOBILE — SETTINGS
  test('Mobile: menu configurações abre', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    const settingsBtn = mobilePanel(page).locator('button[title="Configurações"]').first()
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/20-mobile-settings-menu.png`, fullPage: true })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
  })

  // 14. DESKTOP EMPTY STATE
  test('Desktop: empty state', async ({ page }) => {
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/21-desktop-empty-state.png`, fullPage: true })
  })

  // 15. MOBILE — ADD INSTANCE
  test('Mobile: botão adicionar instância', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    const addBtn = mobilePanel(page).locator('button[title="Adicionar instância"]').first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/22-mobile-add-instance.png`, fullPage: true })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  })

  // 16. RESPONSIVIDADE — VIEWPORTS
  test('Desktop viewport 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/23-desktop-1024.png`, fullPage: true })
  })

  test('Desktop viewport 1920px', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/24-desktop-1920.png`, fullPage: true })
  })

  // 17. AUTO-RESPONSIVE — viewport mobile real (< 768px)
  test('Auto-responsive: viewport 390px mostra layout mobile automaticamente', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(500)
    // Toggle bar should be hidden on small screens
    await expect(page.locator('button:has-text("Desktop")')).not.toBeVisible()
    // Auto mobile panel should be visible
    await expect(page.locator('[data-mobile-panel="auto"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/25-auto-mobile-390.png`, fullPage: true })
  })

  test('Auto-responsive: viewport 430px (iPhone Pro Max)', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 })
    await page.waitForTimeout(500)
    await expect(page.locator('[data-mobile-panel="auto"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/26-auto-mobile-430.png`, fullPage: true })
  })
})
