import { test, expect, Page } from '@playwright/test'

/**
 * Authenticated admin audit. Logs in through the storefront login proxy (which
 * sets the httpOnly auth cookie in the browser context), then sweeps every real
 * admin page on whichever project (desktop / mobile) is running.
 *
 * Refined overflow detector: only reports offenders when the document ACTUALLY
 * has horizontal scroll (scrollWidth > clientWidth) and ignores position:fixed
 * elements (off-canvas drawers/sidebars), which were false positives before.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@babyshop.local'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'change-me'

const ROUTES: Array<{ name: string; path: string }> = [
  { name: 'dashboard', path: '/admin' },
  { name: 'orders', path: '/admin/orders' },
  { name: 'products', path: '/admin/products' },
  { name: 'filters', path: '/admin/filters' },
  { name: 'categories', path: '/admin/categories' },
  { name: 'inventory', path: '/admin/inventory' },
  { name: 'campaigns', path: '/admin/campaigns' },
  { name: 'customers', path: '/admin/customers' },
  { name: 'analytics', path: '/admin/analytics' },
  { name: 'settings', path: '/admin/settings' },
]

async function measureRealOverflow(page: Page) {
  return page.evaluate(() => {
    const docEl = document.documentElement
    const viewport = docEl.clientWidth
    const hasOverflow = docEl.scrollWidth > viewport + 1
    const offenders: string[] = []
    if (hasOverflow) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const style = getComputedStyle(el)
        if (style.position === 'fixed') continue
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue
        if (rect.right > viewport + 1) {
          const cls =
            typeof el.className === 'string' && el.className
              ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
              : ''
          offenders.push(
            `${el.tagName.toLowerCase()}${cls} (right=${Math.round(rect.right)}, w=${Math.round(rect.width)})`,
          )
        }
      }
    }
    return {
      scrollWidth: docEl.scrollWidth,
      viewport,
      hasOverflow,
      offenders: [...new Set(offenders)].slice(0, 12),
    }
  })
}

test('admin audit', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  const project = testInfo.project.name

  const login = await page.request.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  expect(login.ok(), `admin login failed: ${login.status()}`).toBeTruthy()

  for (const route of ROUTES) {
    const consoleErrors: string[] = []
    const handler = (m: { type: () => string; text: () => string }) => {
      if (m.type() === 'error') consoleErrors.push(m.text())
    }
    page.on('console', handler as never)

    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => {})
    await page.waitForTimeout(700)

    const o = await measureRealOverflow(page)
    await page.screenshot({
      path: `e2e/screenshots/admin/${project}/${route.name}.png`,
      fullPage: true,
    })

    console.log(
      `[${project}] ${route.path}: overflow=${o.hasOverflow} sw=${o.scrollWidth}/${o.viewport}` +
        (o.offenders.length ? `\n  OFFENDERS:\n  - ${o.offenders.join('\n  - ')}` : '') +
        (consoleErrors.length
          ? `\n  CONSOLE(${consoleErrors.length}): ${consoleErrors.slice(0, 5).join(' | ')}`
          : ''),
    )

    page.off('console', handler as never)
    expect.soft(o.offenders, `horizontal overflow on ${route.path}`).toEqual([])
  }
})
