import { test, expect } from '@playwright/test'

/**
 * Verifies the "stage then Apply" filter behaviour on both desktop and mobile:
 * toggling filter controls must NOT navigate (no server request), and only
 * pressing "Filtreleri Uygula" commits the selection to the URL in one go.
 * On mobile the filters live in a drawer opened by the "Filtrele" button.
 */
test('filters only apply on button press', async ({ page }) => {
  const isMobile = (page.viewportSize()?.width ?? 1440) < 981

  await page.goto('/products', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)

  // On mobile, open the filter drawer first
  if (isMobile) {
    await page.getByRole('button', { name: 'Filtrele', exact: true }).click()
    await page.waitForTimeout(400)
  }

  const initialUrl = page.url()

  // CheckboxFilter is a button[role=checkbox] whose accessible name is its label
  await page.getByRole('checkbox', { name: 'Kız Bebek' }).click()
  await page.getByRole('checkbox', { name: 'Elbise' }).click()
  await page.waitForTimeout(600)

  expect(page.url(), 'URL must not change on toggle').toBe(initialUrl)

  const applyBtn = page.getByRole('button', { name: /Filtreleri Uygula/i })
  await expect(applyBtn).toBeEnabled()
  await applyBtn.click()

  await page.waitForURL(/categorySlug=/, { timeout: 10_000 })
  const appliedUrl = page.url()
  expect(appliedUrl).toContain('categorySlug=kiz-bebek')
  expect(appliedUrl).toContain('productTypes=Elbise')

  await page.screenshot({ path: `e2e/screenshots/filter-applied-${isMobile ? 'mobile' : 'desktop'}.png`, fullPage: true })
})
