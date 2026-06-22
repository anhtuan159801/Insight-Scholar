import { expect, test, type Page } from '@playwright/test';

const openNavigation = async (page: Page) => {
  if ((page.viewportSize()?.width || 1280) < 768) {
    await page.getByTestId('mobile-menu').click();
    await expect(page.getByTestId('nav-analysis')).toBeInViewport();
  }
};

test('renders all seven appraisal steps and the Excel export action', async ({ page }) => {
  await page.goto('/');
  await openNavigation(page);
  await page.getByTestId('nav-analysis').click();
  await page.getByTestId('analysis-card-e2e-paper').click();

  await expect(page.getByTestId('analysis-phase-1')).toBeVisible();
  await expect(page.getByTestId('analysis-phase-2')).toBeVisible();
  await expect(page.getByTestId('analysis-phase-3')).toBeVisible();
  for (let step = 1; step <= 7; step += 1) await expect(page.getByTestId(`analysis-step-${step}`)).toBeAttached();
  await expect(page.getByTestId('export-literature-matrix')).toBeEnabled();
});

test('protects core matrix columns and supports a removable custom column', async ({ page }) => {
  await page.goto('/');
  await openNavigation(page);
  await page.getByTestId('nav-matrix').click();

  await expect(page.getByText('Literature Matrix chuẩn hóa')).toBeVisible();
  await expect(page.getByTestId('export-matrix')).toBeEnabled();
  await page.getByTestId('custom-column-input').fill('Thang đo sử dụng');
  await page.getByTestId('add-custom-column').click();
  await expect(page.getByRole('columnheader', { name: 'Thang đo sử dụng' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove Thang đo sử dụng' }).click();
  await expect(page.getByRole('columnheader', { name: 'Thang đo sử dụng' })).toHaveCount(0);
});
