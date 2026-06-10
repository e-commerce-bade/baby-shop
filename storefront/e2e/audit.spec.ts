import { test, expect, Page } from '@playwright/test'

/**
 * Exploratory audit sweep. For every public route, on whichever project
 * (desktop / mobile) is running, this records:
 *   - JS console errors + uncaught page errors
 *   - failed network responses (>= 400)
 *   - horizontal overflow (the #1 source of "looks broken on mobile") and
 *     the specific elements that overflow the viewport
 *   - a full-page screenshot under e2e/screenshots/<project>/
 *
 * Soft assertions keep the sweep going so we get a complete picture in one run.
 */

const ROUTES: Array<{ name: string; path: string }> = [
  { name: 'home', path: '/' },
  { name: 'products', path: '/products' },
  { name: 'cart', path: '/cart' },
  { name: 'checkout', path: '/checkout' },
  { name: 'favorites', path: '/favorites' },
  { name: 'account', path: '/account' },
  { name: 'account-login', path: '/account/login' },
  { name: 'account-register', path: '/account/register' },
  { name: 'admin', path: '/admin' },
  { name: 'admin-login', path: '/admin/login' },
]

type Overflow = { width: number; viewport: number; offenders: string[] }

async function measureOverflow(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const docEl = document.documentElement
    const viewport = docEl.clientWidth
    const offenders: string[] = []
    const all = Array.from(document.querySelectorAll<HTMLElement>('body *'))
    for (const el of all) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      // element pokes past the right edge by more than a rounding pixel
      if (rect.right > viewport + 1) {
        const cls =
          typeof el.className === 'string' && el.className
            ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
            : ''
        const desc = `${el.tagName.toLowerCase()}${cls} (right=${Math.round(
          rect.right,
        )}, w=${Math.round(rect.width)})`
        if (!offenders.includes(desc)) offenders.push(desc)
      }
    }
    return { width: docEl.scrollWidth, viewport, offenders: offenders.slice(0, 12) }
  })
}

for (const route of ROUTES) {
  test(`audit ${route.name} (${route.path})`, async ({ page }, testInfo) => {
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    const failedResponses: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('response', (res) => {
      if (res.status() >= 400) failedResponses.push(`${res.status()} ${res.url()}`)
    })

    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    // give client-side data fetching / hydration a moment, but don't hang forever
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await page.waitForTimeout(800)

    const project = testInfo.project.name
    const overflow = await measureOverflow(page)
    const finalUrl = page.url()

    await page.screenshot({
      path: `e2e/screenshots/${project}/${route.name}.png`,
      fullPage: true,
    })

    // Structured report line — easy to scan in the run output
    console.log(
      `\n[${project}] ${route.path} -> ${finalUrl}\n` +
        `  overflow: scrollWidth=${overflow.width} viewport=${overflow.viewport}` +
        (overflow.offenders.length
          ? `\n  OVERFLOWING ELEMENTS:\n    - ${overflow.offenders.join('\n    - ')}`
          : ' (none)') +
        (consoleErrors.length
          ? `\n  CONSOLE ERRORS (${consoleErrors.length}):\n    - ${consoleErrors
              .slice(0, 6)
              .join('\n    - ')}`
          : '') +
        (pageErrors.length
          ? `\n  PAGE ERRORS (${pageErrors.length}):\n    - ${pageErrors
              .slice(0, 6)
              .join('\n    - ')}`
          : '') +
        (failedResponses.length
          ? `\n  FAILED REQUESTS (${failedResponses.length}):\n    - ${failedResponses
              .slice(0, 8)
              .join('\n    - ')}`
          : ''),
    )

    // Soft assertions: report but keep sweeping
    expect.soft(overflow.offenders, `horizontal overflow on ${route.path}`).toEqual([])
    expect.soft(pageErrors, `uncaught page errors on ${route.path}`).toEqual([])
  })
}
