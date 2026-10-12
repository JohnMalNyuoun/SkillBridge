import { expect, test } from "@playwright/test";

const roleRoutes = {
  youth: [
    "/home",
    "/courses",
    "/courses/playwright-course",
    "/applications",
    "/notifications",
    "/profile",
    "/settings",
    "/account",
    "/quick-access",
    "/preferences",
    "/outcomes",
  ],
  organisation: [
    "/org/dashboard",
    "/org/analytics",
    "/org/courses",
    "/org/courses/new",
    "/org/courses/playwright-course",
    "/org/courses/playwright-course/edit",
    "/org/courses/playwright-course/outcomes",
    "/org/applications",
    "/org/profile",
    "/org/settings",
    "/org/notifications",
    "/org/impact",
  ],
  admin: [
    "/admin/dashboard",
    "/admin/organisations",
    "/admin/courses",
    "/admin/courses/playwright-course",
    "/admin/users",
    "/admin/notifications",
    "/admin/updates",
    "/admin/settings",
  ],
};

const authenticateAs = async (page, role) => {
  page.pageErrors = [];
  page.on("pageerror", (error) => page.pageErrors.push(error));

  await page.addInitScript((userRole) => {
    sessionStorage.setItem("token", "playwright-token");
    sessionStorage.setItem(
      "user",
      JSON.stringify({
        _id: `playwright-${userRole}`,
        name: "Playwright User",
        role: userRole,
      }),
    );
  }, role);

  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let data = [];

    if (pathname.includes("/youth/courses/playwright-course")) {
      data = {
        _id: "playwright-course",
        title: "Playwright Course",
        location: "Kakuma",
        deliveryMode: "in_person",
        startDate: "2026-01-01",
        endDate: "2026-02-01",
        applicationDeadline: "2099-01-01",
        filledSlots: 0,
        totalSlots: 20,
        targetAudience: "youth",
        gender: "all",
        applicationQuestions: [],
        organisation: {
          _id: "playwright-org",
          name: "Playwright Organisation",
        },
      };
    } else if (
      pathname.includes("/org/impact/courses/") &&
      pathname.endsWith("/outcomes")
    ) {
      data = { course: { title: "Playwright Course" }, outcomes: [] };
    } else if (pathname.endsWith("/impact/dashboard")) {
      data = {
        applications: {
          total: 0,
          accepted: 0,
          completed: 0,
          droppedOut: 0,
          outcomeSubmitted: 0,
        },
        completionRate: 0,
        demographics: { refugee: 0, hostCommunity: 0, female: 0, male: 0 },
      };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data }),
    });
  });
};

test.describe("public app", () => {
  test("landing page exposes the main entry points", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/FursaHub/i);
    await expect(
      page.getByRole("heading", { name: /your next opportunity/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Sign In" }),
    ).toHaveAttribute("href", "/login");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Get Started" }),
    ).toHaveAttribute("href", "/register");
  });

  test("updates page renders when the public feed is empty", async ({
    page,
  }) => {
    await page.route("**/api/broadcasts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto("/updates");

    await expect(
      page.getByRole("heading", { name: "Latest Updates" }),
    ).toBeVisible();
    await expect(
      page.getByText("No updates yet. Check back soon."),
    ).toBeVisible();
  });

  test("youth login form exposes required controls", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Sign in to your account" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("your@email.com")).toHaveAttribute(
      "type",
      "email",
    );
    await expect(page.getByPlaceholder("Enter your password")).toHaveAttribute(
      "type",
      "password",
    );
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("organisation login form is reachable", async ({ page }) => {
    await page.goto("/org/login");

    await expect(
      page.getByRole("heading", { name: "Sign in to your organisation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Register your organisation" }),
    ).toHaveAttribute("href", "/org/register");
  });
});

test.describe("route guards", () => {
  test("redirect unauthenticated users to the correct login page", async ({
    page,
  }) => {
    const redirects = [
      ["/home", "/login"],
      ["/courses", "/login"],
      ["/org/dashboard", "/org/login"],
      ["/org/courses", "/org/login"],
      ["/admin/dashboard", "/login"],
      ["/admin/users", "/login"],
    ];

    for (const [path, expectedPath] of redirects) {
      await page.goto(path);
      await expect(page).toHaveURL(
        new RegExp(`${expectedPath.replace("/", "\\/")}$`),
      );
    }
  });

  test("authenticated role can enter its dashboard", async ({ page }) => {
    await authenticateAs(page, "youth");

    await page.goto("/home");

    await expect(page).toHaveURL(/\/home$/);
  });

  for (const [role, routes] of Object.entries(roleRoutes)) {
    test(`${role} role can reach every declared route`, async ({ page }) => {
      await authenticateAs(page, role);

      for (const route of routes) {
        await page.goto(route);
        await expect(page).toHaveURL(
          new RegExp(`${route.replaceAll("/", "\\/")}$`),
        );
        expect(page.pageErrors).toEqual([]);
        await expect(page.locator("body")).not.toContainText(
          "Unexpected Application Error",
        );
      }
    });
  }
});
