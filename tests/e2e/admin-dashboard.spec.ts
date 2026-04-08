import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

test.describe("admin dashboard core flow", () => {
  test("loads dashboard with dev auth bypass", async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);

    await expect(page.getByRole("heading", { name: "Business performance overview" })).toBeVisible();
    await expect(page.getByText("Revenue collected")).toBeVisible();
    await expect(page.getByText("Overdue invoices")).toBeVisible();
  });

  test("supports sign-up, client creation, invoice creation, and dashboard visibility", async ({ page }) => {
    test.skip(!hasDatabaseUrl(), "Set DATABASE_URL to run full admin flow e2e.");

    const unique = Date.now().toString();
    const businessName = `Flow E2E ${unique}`;
    const fullName = "Flow Admin";
    const email = `flow-admin-${unique}@example.com`;
    const username = `flow-admin-${unique}`;
    const password = "SecurePass123!";
    const phone = `555${unique.slice(-7)}`;

    const clientEmail = `client-${unique}@example.com`;
    const clientPhone = `444${unique.slice(-7)}`;

    await page.goto(`${baseURL}/sign-up`);
    await page.getByLabel("Business name").fill(businessName);
    await page.getByLabel("Full name").fill(fullName);
    await page.getByLabel("Phone").fill(phone);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create business account" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Business performance overview" })).toBeVisible();

    await page.goto(`${baseURL}/clients/new`);
    await page.getByLabel("Client name").fill("April Carson");
    await page.getByLabel("Company").fill("Northwind Studio");
    await page.getByLabel("Email").fill(clientEmail);
    await page.getByLabel("Phone").fill(clientPhone);
    await page.getByRole("button", { name: "Save client" }).click();

    await expect(page.getByText("Client saved.")).toBeVisible();

    await page.goto(`${baseURL}/invoices/new`);
    await page.getByLabel("Client").selectOption({ label: /April Carson/ });
    await page.getByLabel("Issue date").fill("2026-04-05");
    await page.getByLabel("Due date").fill("2026-04-20");
    await page.getByLabel("Tax rate \(basis points\)").fill("0");
    await page.getByLabel("Description 1").fill("Design retainer");
    await page.getByLabel("Quantity").fill("1");
    await page.getByLabel("Unit price \(minor units\)").fill("50000");
    await page.getByRole("button", { name: "Save invoice" }).click();

    await expect(page.getByText("Invoice created.")).toBeVisible();

    await page.goto(`${baseURL}/dashboard`);
    await expect(page.getByRole("heading", { name: "Business performance overview" })).toBeVisible();
    await expect(page.getByText("Revenue collected")).toBeVisible();
  });
});
