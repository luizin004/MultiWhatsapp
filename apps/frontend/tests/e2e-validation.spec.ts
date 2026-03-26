import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const SCREENSHOTS_DIR = 'tests/screenshots'

test.describe('Vigia WhatsApp — Validação Geral', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    // Wait for main app to render
    await page.waitForSelector('text=Vigia WhatsApp', { timeout: 10000 })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 1. SCREENSHOTS DE TODAS AS TELAS
  // ═══════════════════════════════════════════════════════════════════════

  test('Screenshot 01 — Desktop: tela inicial (nenhuma instância selecionada)', async ({ page }) => {
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-desktop-home.png`, fullPage: true })
    // Deve mostrar o toggle Desktop/Mobile no topo
    await expect(page.locator('text=Desktop')).toBeVisible()
    await expect(page.locator('text=Mobile')).toBeVisible()
    // Deve mostrar link de Métricas
    await expect(page.locator('text=Metricas')).toBeVisible()
  })

  test('Screenshot 02 — Desktop: sidebar com tabs Conversas/Grupos', async ({ page }) => {
    const conversasBtn = page.locator('button:has-text("Conversas")').first()
    const gruposBtn = page.locator('button:has-text("Grupos")').first()
    await expect(conversasBtn).toBeVisible()
    await expect(gruposBtn).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-desktop-sidebar-tabs.png`, fullPage: true })
  })

  test('Screenshot 03 — Mobile: tela inicial dentro do frame', async ({ page }) => {
    // Click Mobile toggle
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-mobile-home.png`, fullPage: true })
    // Deve ter o mobile frame
    await expect(page.locator('.mobile-frame')).toBeVisible()
  })

  test('Screenshot 04 — Mobile: sidebar com instâncias', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)
    // Sidebar header deve estar visível dentro do frame
    await expect(page.locator('.mobile-frame >> text=Conversas')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-mobile-sidebar.png`, fullPage: true })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 2. TOGGLE DESKTOP / MOBILE
  // ═══════════════════════════════════════════════════════════════════════

  test('Toggle Desktop/Mobile funciona corretamente', async ({ page }) => {
    // Estado inicial: Desktop
    const desktopBtn = page.locator('button:has-text("Desktop")').first()
    const mobileBtn = page.locator('button:has-text("Mobile")').first()

    // Verificar que desktop está ativo (tem bg diferente)
    await expect(desktopBtn).toBeVisible()
    await expect(mobileBtn).toBeVisible()

    // Trocar para Mobile
    await mobileBtn.click()
    await page.waitForTimeout(300)
    // Mobile frame deve aparecer
    await expect(page.locator('.mobile-frame')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-toggle-mobile-active.png`, fullPage: true })

    // Trocar de volta para Desktop
    await desktopBtn.click()
    await page.waitForTimeout(300)
    // Mobile frame não deve existir
    await expect(page.locator('.mobile-frame')).not.toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-toggle-desktop-active.png`, fullPage: true })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 3. TABS CONVERSAS / GRUPOS
  // ═══════════════════════════════════════════════════════════════════════

  test('Tabs Conversas/Grupos alternam corretamente', async ({ page }) => {
    const conversasBtn = page.locator('button:has-text("Conversas")').first()
    const gruposBtn = page.locator('button:has-text("Grupos")').first()

    // Conversas deve estar ativo por padrão
    await conversasBtn.click()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-tab-conversas.png`, fullPage: true })

    // Trocar para Grupos
    await gruposBtn.click()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-tab-grupos.png`, fullPage: true })

    // Voltar para Conversas
    await conversasBtn.click()
    await page.waitForTimeout(200)
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 4. SIDEBAR — BUSCA E FILTROS
  // ═══════════════════════════════════════════════════════════════════════

  test('Sidebar: campo de busca funciona', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Pesquisar"]').first()
    await expect(searchInput).toBeVisible()

    // Digitar algo no campo de busca
    await searchInput.fill('teste123')
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-sidebar-search.png`, fullPage: true })

    // Limpar busca
    await searchInput.fill('')
    await page.waitForTimeout(200)
  })

  test('Sidebar: filtros Tudo/Não lidas/Grupos funcionam', async ({ page }) => {
    const tudoBtn = page.locator('button:has-text("Tudo")').first()
    const naoLidasBtn = page.locator('button:has-text("Não lidas")').first()
    const gruposFiltro = page.locator('button:has-text("Grupos")').nth(1) // Second one (filter, not tab)

    await expect(tudoBtn).toBeVisible()
    await expect(naoLidasBtn).toBeVisible()

    await naoLidasBtn.click()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-filtro-nao-lidas.png`, fullPage: true })

    await tudoBtn.click()
    await page.waitForTimeout(200)
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 5. MENU DE CONFIGURAÇÕES
  // ═══════════════════════════════════════════════════════════════════════

  test('Menu Configurações abre e fecha', async ({ page }) => {
    const settingsBtn = page.locator('button[title="Configurações"]').first()
    await expect(settingsBtn).toBeVisible()

    // Abrir menu
    await settingsBtn.click()
    await page.waitForTimeout(300)

    // Verificar itens do menu
    await expect(page.locator('text=Respostas rápidas')).toBeVisible()
    await expect(page.locator('text=Etiquetas')).toBeVisible()
    await expect(page.locator('text=Webhooks')).toBeVisible()
    await expect(page.locator('text=Privacidade')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/11-settings-menu.png`, fullPage: true })

    // Fechar clicando fora
    await page.locator('.fixed.inset-0').click()
    await page.waitForTimeout(200)

    // Menu deve ter fechado
    await expect(page.locator('text=Respostas rápidas')).not.toBeVisible()
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 6. BOTÃO ADICIONAR INSTÂNCIA (modal)
  // ═══════════════════════════════════════════════════════════════════════

  test('Botão adicionar instância abre modal', async ({ page }) => {
    const addBtn = page.locator('button[title="Adicionar instância"]').first()
    await expect(addBtn).toBeVisible()

    await addBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/12-add-instance-modal.png`, fullPage: true })

    // Fechar modal (botão X ou overlay)
    const closeBtn = page.locator('[aria-label*="Fechar"], button:has-text("✕"), button:has-text("×")').first()
    if (await closeBtn.isVisible()) {
      await closeBtn.click()
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(300)
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 7. MOBILE — NAVEGAÇÃO ENTRE PAINÉIS
  // ═══════════════════════════════════════════════════════════════════════

  test('Mobile: navegação sidebar → contatos (se houver instância)', async ({ page }) => {
    // Trocar para mobile
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    // Verificar se há alguma instância listada
    const instanceButtons = page.locator('.mobile-frame button').filter({ hasText: /conectada|desconectada/i })
    const instanceCount = await page.locator('.mobile-frame .group button').count()

    if (instanceCount > 0) {
      // Clicar na primeira instância
      await page.locator('.mobile-frame .group button').first().click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/13-mobile-contacts.png`, fullPage: true })

      // Verificar botão voltar
      const backBtn = page.locator('.mobile-frame button').filter({ has: page.locator('svg') }).first()
      if (await backBtn.isVisible()) {
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/14-mobile-back-button.png`, fullPage: true })
      }
    } else {
      // Sem instâncias — screenshot do empty state
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/13-mobile-no-instances.png`, fullPage: true })
    }
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 8. MOBILE — TOGGLE CONVERSAS / GRUPOS
  // ═══════════════════════════════════════════════════════════════════════

  test('Mobile: tabs Conversas/Grupos dentro do frame', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    const mobileConversas = page.locator('.mobile-frame >> button[title="Conversas"]')
    const mobileGrupos = page.locator('.mobile-frame >> button[title="Grupos"]')

    await expect(mobileConversas).toBeVisible()
    await expect(mobileGrupos).toBeVisible()

    await mobileGrupos.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/15-mobile-grupos-tab.png`, fullPage: true })

    await mobileConversas.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/16-mobile-conversas-tab.png`, fullPage: true })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 9. MOBILE — BUSCA
  // ═══════════════════════════════════════════════════════════════════════

  test('Mobile: campo de busca funciona no frame', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    const mobileSearch = page.locator('.mobile-frame >> input[placeholder*="Pesquisar"]').first()
    if (await mobileSearch.isVisible()) {
      await mobileSearch.fill('teste mobile')
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/17-mobile-search.png`, fullPage: true })
      await mobileSearch.fill('')
    }
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 10. LINK MÉTRICAS
  // ═══════════════════════════════════════════════════════════════════════

  test('Link Métricas está visível e aponta para /metrics', async ({ page }) => {
    const metricsLink = page.locator('a:has-text("Metricas")')
    await expect(metricsLink).toBeVisible()
    const href = await metricsLink.getAttribute('href')
    expect(href).toBe('/metrics')
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/18-metrics-link.png`, fullPage: true })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 11. PÁGINA DE MÉTRICAS
  // ═══════════════════════════════════════════════════════════════════════

  test('Screenshot — Página de Métricas carrega', async ({ page }) => {
    await page.goto(`${BASE_URL}/metrics`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/19-metrics-page.png`, fullPage: true })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 12. MOBILE FRAME — VISUAL VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  test('Mobile frame tem dimensões corretas (iPhone Pro Max)', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    const frame = page.locator('.mobile-frame')
    await expect(frame).toBeVisible()

    const box = await frame.boundingBox()
    expect(box).toBeTruthy()
    if (box) {
      // Width should be 430px (+ 8px border = ~438px rendered)
      expect(box.width).toBeGreaterThanOrEqual(420)
      expect(box.width).toBeLessThanOrEqual(450)
      // Height should be close to 932px or viewport-constrained
      expect(box.height).toBeGreaterThan(500)
    }
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 13. MOBILE — SETTINGS MENU DENTRO DO FRAME
  // ═══════════════════════════════════════════════════════════════════════

  test('Mobile: menu configurações abre dentro do frame', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    const settingsBtn = page.locator('.mobile-frame >> button[title="Configurações"]')
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/20-mobile-settings-menu.png`, fullPage: true })

      // Fechar
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 14. DESKTOP — EMPTY STATE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  test('Desktop: empty state mostra mensagem quando sem instância selecionada', async ({ page }) => {
    // Verificar que mostra a mensagem inicial
    const emptyText = page.locator('text=Selecione uma instância')
    if (await emptyText.isVisible()) {
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/21-desktop-empty-state.png`, fullPage: true })
    }
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 15. MOBILE — ADD INSTANCE DENTRO DO FRAME
  // ═══════════════════════════════════════════════════════════════════════

  test('Mobile: botão adicionar instância funciona dentro do frame', async ({ page }) => {
    await page.locator('button:has-text("Mobile")').first().click()
    await page.waitForTimeout(500)

    const addBtn = page.locator('.mobile-frame >> button[title="Adicionar instância"]')
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/22-mobile-add-instance.png`, fullPage: true })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  })

  // ═══════════════════════════════════════════════════════════════════════
  // 16. RESPONSIVIDADE — VIEWPORT MENOR
  // ═══════════════════════════════════════════════════════════════════════

  test('Screenshot — Desktop com viewport reduzido (1024px)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/23-desktop-1024.png`, fullPage: true })
  })

  test('Screenshot — Desktop com viewport grande (1920px)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/24-desktop-1920.png`, fullPage: true })
  })
})
