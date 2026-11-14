import { test, expect } from '@playwright/test'

test('every layout case matches its expected geometry', async ({ page }) => {
  await page.goto('/cases.html')
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')

  const failures = await page.evaluate(() =>
    (window as unknown as { caseResults: { title: string; problems: string[] }[] }).caseResults.filter(
      (result) => result.problems.length > 0,
    ),
  )
  expect(failures).toEqual([])
})
