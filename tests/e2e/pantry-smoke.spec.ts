import { test, expect } from '@playwright/test'

const authEmail = process.env.PLAYWRIGHT_EMAIL ?? 'qa+neichef@example.com'
const authPassword = process.env.PLAYWRIGHT_PASSWORD ?? 'TestPass123!'

async function signIn(page: any) {
  await page.goto('/auth/sign-in')
  await page.getByLabel(/email/i).fill(authEmail)
  await page.getByLabel(/password/i).fill(authPassword)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/app(\/|$)/, { timeout: 20_000 })
}

test.describe('NeiChef pantry smoke flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('sign in and add a manual pantry item', async ({ page }) => {
    await signIn(page)

    await page.getByRole('button', { name: /add ingredients|add item/i }).first().click()
    await page.getByRole('button', { name: /manual entry/i }).click()

    await page.getByLabel(/item name/i).fill('Bananas')
    await page.getByLabel(/quantity/i).fill('3')
    await page.getByLabel(/unit/i).selectOption('pcs')
    await page.getByLabel(/category/i).selectOption('produce')
    await page.getByLabel(/location/i).selectOption('pantry')
    await page.getByLabel(/expiration date/i).fill('2030-01-10')
    await page.getByRole('button', { name: /add to pantry/i }).click()

    await expect(page.getByText('Bananas')).toBeVisible()
  })

  test('parse a typed shopping list and add items to pantry', async ({ page }) => {
    await signIn(page)

    await page.getByRole('button', { name: /add ingredients|add item/i }).first().click()
    await page.getByRole('button', { name: /type a list/i }).click()

    await page.getByLabel(/type or paste pantry items/i).fill('2 liters of milk\n1 loaf of bread\n3 carrots')
    await page.getByRole('button', { name: /parse list/i }).click()

    await expect(page.getByText(/review parsed items/i)).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: /add \d+ items/i }).click()

    await expect(page.getByText(/milk|bread|carrot/i).first()).toBeVisible({ timeout: 20_000 })
  })
})
