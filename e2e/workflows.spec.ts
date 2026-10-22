import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("WorkforceHub1!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("employee signs in, clocks in, and cannot open the directory", async ({ page }) => {
  await signIn(page, "employee@helios.example");
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), Meera/ })).toBeVisible();
  await page.getByRole("button", { name: "Clock in" }).click();
  await expect(page.getByText("Clocked in")).toBeVisible();
  await page.goto("/employees");
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
});

test("manager approves a pending leave request", async ({ page }) => {
  await signIn(page, "manager@helios.example");
  await page.goto("/approvals");
  await page.getByRole("link", { name: /Annual leave · Meera Iyer/ }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("This decision is final.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toBeDisabled();
});

test("employee opens an assigned task", async ({ page }) => {
  await signIn(page, "employee@helios.example");
  await page.getByRole("link", { name: "My Tasks" }).click();
  await expect(page.getByRole("heading", { name: "My Tasks" })).toBeVisible();
  const task = page.getByRole("link").filter({ hasText: "WH-" }).first();
  await task.click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
