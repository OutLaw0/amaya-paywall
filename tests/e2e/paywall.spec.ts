import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const offers = [
  { id: 'monthly', title: 'Месяц', period: 'month', price: 29900, currency: 'RUB' },
  { id: 'yearly', title: 'Год', period: 'year', price: 199000, currency: 'RUB' },
]
const purchase = { id: '53cfb284-cab9-4dc6-9ced-4ea35a51357e', offerId: 'yearly', createdAt: '2026-10-13T12:00:00Z', expiresAt: '2027-10-13T12:00:00Z' }

test('ready screen, keyboard selection, assets and mobile dimensions', async ({ page }, info) => {
  const failures: string[] = []
  page.on('pageerror', error => failures.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('radio')).toHaveCount(2)
  await expect(page.getByRole('radio').nth(1)).toBeChecked()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('.world-art img')).toHaveJSProperty('naturalWidth', 342)
  if (info.project.name === 'chromium') {
    await mkdir('test-results', { recursive: true })
    await page.screenshot({ path: 'test-results/paywall-ready.png' })
  }
  await page.getByRole('radio').nth(1).focus()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('radio').nth(0)).toBeChecked()
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    for (const selector of ['.offer-card', '.purchase-button', '.restore-button']) {
      for (const box of await page.locator(selector).evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect()
        return { left: rect.left, right: rect.right, height: rect.height }
      }))) {
        expect(box.left).toBeGreaterThanOrEqual(0)
        expect(box.right).toBeLessThanOrEqual(width)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }
  }
  await page.setViewportSize({ width: 360, height: 640 })
  await page.getByRole('button', { name: 'Восстановить покупки' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: 'Восстановить покупки' })).toBeInViewport()
  expect(failures).toEqual([])
})

test('offers loading, error and successful retry', async ({ page }) => {
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  let calls = 0
  await page.route('**/api/offers', async (route) => {
    calls++
    if (calls === 1) {
      await gate
      await route.fulfill({ status: 503, json: { message: 'Unavailable' } })
    }
    else await route.fulfill({ json: { offers } })
  })
  await page.goto('/')
  await expect(page.getByLabel('Загружаем тарифы')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Открыть полный доступ' })).toBeDisabled()
  release()
  await expect(page.getByText('Не удалось загрузить тарифы.')).toBeVisible()
  await page.getByRole('button', { name: 'Попробовать ещё раз' }).click()
  await expect(page.getByRole('radio')).toHaveCount(2)
})

test('purchase loading, success and restore after reload', async ({ page }) => {
  let deviceId: string | undefined
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/purchase', async (route) => {
    const request = route.request().postDataJSON()
    deviceId = request.deviceId
    expect(request.offerId).toBe('yearly')
    expect(request.requestId).toMatch(/^[\da-f-]{36}$/)
    await gate
    await route.fulfill({ json: { purchase } })
  })
  await page.route('**/api/restore', async (route) => {
    expect(route.request().postDataJSON().deviceId).toBe(deviceId)
    await route.fulfill({ json: { purchase } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть полный доступ' }).click()
  await expect(page.getByRole('button', { name: 'Открываем доступ…' })).toBeDisabled()
  await expect(page.getByRole('radio').nth(0)).toBeDisabled()
  release()
  await expect(page.getByRole('heading', { name: 'Готово! Мир игры теперь открыт' })).toBeVisible()
  await expect(page.getByRole('heading')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Полный доступ открыт' })).toBeDisabled()
  await page.reload()
  await page.getByRole('button', { name: 'Восстановить покупки' }).click()
  await expect(page.getByLabel('Покупка успешна')).toBeVisible()
})

test('failed purchase retries with the same id and keeps selected offer', async ({ page }) => {
  const requests: { requestId: string, offerId: string }[] = []
  await page.route('**/api/purchase', async (route) => {
    requests.push(route.request().postDataJSON())
    if (requests.length === 1) await route.fulfill({ status: 503, json: { message: 'Unavailable' } })
    else await route.fulfill({ json: { purchase: { ...purchase, offerId: 'monthly' } } })
  })
  await page.goto('/')
  await page.locator('.offer-card').first().click()
  await page.getByRole('button', { name: 'Открыть полный доступ' }).click()
  await expect(page.getByRole('alert')).toContainText('Не удалось завершить покупку')
  await expect(page.getByRole('radio').first()).toBeChecked()
  await page.getByRole('button', { name: 'Попробовать снова' }).click()
  await expect(page.getByLabel('Покупка успешна')).toContainText('Месяц')
  expect(requests).toHaveLength(2)
  expect(requests[0]?.requestId).toBe(requests[1]?.requestId)
  expect(requests[1]?.offerId).toBe('monthly')
})

test('restore with no purchases and restore network error', async ({ page }) => {
  let calls = 0
  await page.route('**/api/restore', async (route) => {
    calls++
    if (calls === 1) await route.fulfill({ json: { purchase: null } })
    else await route.fulfill({ status: 503, json: { message: 'Unavailable' } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Восстановить покупки' }).click()
  await expect(page.getByText('На этом устройстве пока нет покупок.')).toBeVisible()
  await page.getByRole('button', { name: 'Восстановить покупки' }).click()
  await expect(page.getByRole('alert')).toContainText('Не удалось восстановить покупки')
})

test('storage unavailable gives a clear error and sends no purchase', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('disabled') }
  })
  let sent = false
  await page.route('**/api/purchase', async (route) => { sent = true; await route.abort() })
  await page.goto('/')
  await page.getByRole('button', { name: 'Открыть полный доступ' }).click()
  await expect(page.getByRole('alert')).toContainText('Разрешите хранение данных')
  expect(sent).toBe(false)
})
