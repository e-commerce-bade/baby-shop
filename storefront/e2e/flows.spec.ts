import { test, Page } from '@playwright/test'

/**
 * Interactive flow capture. Drives the real purchase funnel on the live site so
 * we get populated screenshots (product detail, cart with an item, checkout) on
 * both desktop and mobile. Defensive throughout — never hard-fail, always shoot.
 */

const SLUG = 'floral-ruffle-dress'

async function shoot(page: Page, project: string, name: string) {
  await page.screenshot({ path: `e2e/screenshots/flows/${project}/${name}.png`, fullPage: true })
}

test('purchase funnel capture', async ({ page }, testInfo) => {
  const project = testInfo.project.name
  const consoleErrors: string[] = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message))

  // 1) Product detail
  await page.goto(`/products/${SLUG}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await shoot(page, project, '1-detail')

  // 2) Select variant options if present (size / color swatches are buttons)
  const swatches = page.locator('main button, [role="radiogroup"] button').filter({ hasText: /^.{0,12}$/ })
  const swatchCount = await swatches.count().catch(() => 0)
  // click a couple of small buttons that look like size/color chips
  for (let i = 0; i < Math.min(swatchCount, 6); i++) {
    const b = swatches.nth(i)
    const txt = (await b.textContent().catch(() => '')) ?? ''
    if (/\d|S|M|L|XL|ay|yaş|0-|3-|6-/i.test(txt) && txt.length <= 8) {
      await b.click({ timeout: 2000 }).catch(() => {})
      break
    }
  }

  // 3) Add to cart — find a button whose text mentions Sepet
  const addBtn = page.getByRole('button', { name: /sepete?\s*ekle|sepete at/i }).first()
  const hasAdd = await addBtn.count().catch(() => 0)
  if (hasAdd) {
    await addBtn.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await shoot(page, project, '2-after-add')
  } else {
    console.log(`[${project}] no add-to-cart button found on detail`)
  }

  // 4) Cart page (full)
  await page.goto('/cart', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await shoot(page, project, '3-cart')

  // 5) Checkout page (full)
  await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)
  await shoot(page, project, '4-checkout')

  // 6) Open cart drawer from home
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  const cartTrigger = page.getByRole('button', { name: /sepet/i }).first()
  if (await cartTrigger.count().catch(() => 0)) {
    await cartTrigger.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(900)
    await shoot(page, project, '5-cart-drawer')
  }

  console.log(
    `\n[${project}] purchase funnel — console errors (${consoleErrors.length}):` +
      (consoleErrors.length ? '\n  - ' + consoleErrors.slice(0, 10).join('\n  - ') : ' none'),
  )
})
