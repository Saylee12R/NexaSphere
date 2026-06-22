import { test, expect, type Page } from '@playwright/test';

const websitePages = [
  { name: 'homepage', url: 'http://localhost:5175/' },
  { name: 'event-listing', url: 'http://localhost:5175/events' },
  { name: 'event-detail', url: 'http://localhost:5175/events/1' },
  { name: 'portfolio', url: 'http://localhost:5175/portfolio' },
  { name: 'signup-form', url: 'http://localhost:5175/signup' },
];

const adminPages = [
  { name: 'admin-dashboard-home', url: 'http://localhost:5001/' },
  { name: 'admin-dashboard-events', url: 'http://localhost:5001/events' },
  { name: 'admin-dashboard-users', url: 'http://localhost:5001/users' },
  { name: 'event-creation-form', url: 'http://localhost:5001/events/new' },
];

const allPages = [...websitePages, ...adminPages];

async function maskDynamicContent(page: Page) {
  return page.locator(
    [
      '[data-testid="current-date"]',
      '[data-testid="user-avatar"]',
      '[data-testid="live-count"]',
      'canvas',
    ].join(', ')
  );
}

// Scrolls through the whole page first so any lazy-loaded sections
// mount before we measure/screenshot the full page height
async function triggerLazyLoad(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

for (const { name, url } of allPages) {
  test(`${name} visual snapshot`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await triggerLazyLoad(page);
    await page.waitForLoadState('networkidle');

    const dynamicElements = await maskDynamicContent(page);

    await expect(page).toHaveScreenshot(`${name}.png`, {
      mask: [dynamicElements],
      fullPage: true,
      timeout: 20000,
    });
  });
}
