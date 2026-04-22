import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should render login form with username and password fields', async ({ page }) => {
    await page.goto('/login');

    // Check page heading (Chinese: "登录" means "Login")
    await expect(page.locator('h1')).toContainText('登录');

    // Check that username and password inputs are present
    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check placeholder text
    await expect(usernameInput).toHaveAttribute('placeholder', '请输入用户名');
    await expect(passwordInput).toHaveAttribute('placeholder', '请输入密码');

    // Check submit button exists (Chinese: "登录" means "Login")
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText('登录');

    // Check link to register page
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveText('注册');
  });

  test('should show error message on failed login', async ({ page }) => {
    // Mock the login API to return an error
    await page.route('**/api/auth/login', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: '用户名或密码错误' }),
      });
    });

    await page.goto('/login');

    // Fill in credentials
    await page.locator('input[type="text"]').fill('wronguser');
    await page.locator('input[type="password"]').fill('wrongpass');

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Expect an error message to appear
    const errorDiv = page.locator('.text-rose-700');
    await expect(errorDiv).toBeVisible({ timeout: 5000 });
    await expect(errorDiv).toContainText('用户名或密码错误');
  });
});

test.describe('Register Page', () => {
  test('should render register form with username, password, and invite code fields', async ({ page }) => {
    await page.goto('/register');

    // Check page heading (Chinese: "创建" means "Create")
    await expect(page.locator('h1')).toContainText('创建');

    // Check that all three input fields are present
    const textInputs = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');

    // Username and invite_code are both type="text"
    await expect(textInputs).toHaveCount(2);
    await expect(passwordInput).toBeVisible();

    // Check placeholders
    await expect(textInputs.nth(0)).toHaveAttribute('placeholder', '选择一个用户名');
    await expect(passwordInput).toHaveAttribute('placeholder', '设置密码（至少 6 位）');
    await expect(textInputs.nth(1)).toHaveAttribute('placeholder', '请输入邀请码');

    // Check submit button (Chinese: "创建账号" means "Create Account")
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText('创建账号');

    // Check link to login page
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveText('登录');
  });
});
