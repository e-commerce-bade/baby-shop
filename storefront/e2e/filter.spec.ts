import { test, expect } from '@playwright/test'

/**
 * Verifies the new "stage then Apply" filter behaviour: toggling filter controls
 * must NOT navigate (no server request), and only pressing "Filtreleri Uygula"
 * commits the selection to the URL in a single navigation.
 */
test('filters only apply on button press', async ({ page }) => {
  const requests: string[] = []
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) requests.push(frame.url())
  })

  await page.goto('/products', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  const initialUrl = page.url()

  // Scope to the filter sidebar so we don't accidentally hit the header category nav
  const sidebar = page.locator('aside').filter({ hasText: 'Filtreler' })

  // Toggle a category + a product type — these should stage only, not navigate
  await sidebar.locator('label').filter({ hasText: 'Kiz Bebek' }).locator('[role="checkbox"]').click()
  await sidebar.locator('label').filter({ hasText: 'Elbise' }).locator('[role="checkbox"]').click()
  await page.waitForTimeout(800)

  expect(page.url(), 'URL must not change on toggle').toBe(initialUrl)

  // Apply button should now be enabled and show a count
  const applyBtn = page.getByRole('button', { name: /Filtreleri Uygula/i })
  await expect(applyBtn).toBeEnabled()

  await applyBtn.click()
  await page.waitForURL(/categorySlug=/, { timeout: 10_000 })

  const appliedUrl = page.url()
  expect(appliedUrl).toContain('categorySlug=kiz-bebek')
  expect(appliedUrl).toContain('productTypes=Elbise')

  // After applying, the button reverts to the "applied" (disabled) state
  await expect(page.getByRole('button', { name: /Filtreler Uygulandı/i })).toBeDisabled()

  await page.screenshot({ path: 'e2e/screenshots/filter-applied.png', fullPage: true })
})
