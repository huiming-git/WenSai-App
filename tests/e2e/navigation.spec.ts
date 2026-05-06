import { test, expect } from '@playwright/test';

test.describe('Unauthenticated Navigation', () => {
  test('should redirect to /login when visiting protected route /', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to /login when visiting protected route /upload', async ({ page }) => {
    await page.goto('/upload');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to /login when visiting protected route /history', async ({ page }) => {
    await page.goto('/history');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to /login when visiting protected route /papers/123', async ({ page }) => {
    await page.goto('/papers/123');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should allow access to /login without redirect', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('登录');
  });

  test('should allow access to /register without redirect', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('h1')).toContainText('创建');
  });
});

test.describe('Navigation Between Auth Pages', () => {
  test('should navigate from login to register via link', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a[href="/register"]').click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('h1')).toContainText('创建');
  });

  test('should navigate from register to login via link', async ({ page }) => {
    await page.goto('/register');
    await page.locator('a[href="/login"]').click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('登录');
  });
});

test.describe('Authenticated Navigation', () => {
  test('should access dashboard after mock login', async ({ page }) => {
    // Mock the login API to return a token
    await page.route('**/api/auth/login', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'stub-test-token' }),
      });
    });

    // Mock the /api/auth/me endpoint to return a user
    await page.route('**/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          username: 'testuser',
          credits: 100,
        }),
      });
    });

    // Mock the dashboard data endpoints so the page doesn't fail
    await page.route(/\/api\/papers(?:\?.*)?$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/stats**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total_papers: 0, total_reviews: 0 }),
      });
    });

    // Go to login page and submit credentials
    await page.goto('/login');
    await page.locator('input[type="text"]').fill('testuser');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();

    // After successful login, should be redirected to dashboard
    await expect(page).toHaveURL(/^\/$|\/$/,  { timeout: 5000 });
  });
});
