import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { loadEnv } from "vite";

const viteEnvironment = loadEnv("development", process.cwd(), "VITE_");

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

const dispatchBeforeInstallPrompt = async (page, outcome = "accepted") => {
  await page.evaluate((installOutcome) => {
    window.installPromptCalls = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
      prompt: {
        value: () => {
          window.installPromptCalls += 1;
        },
      },
      userChoice: {
        value: Promise.resolve({ outcome: installOutcome }),
      },
    });
    window.dispatchEvent(event);
  }, outcome);
};

const emulateStandaloneDisplayMode = async (page) => {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query) => query === "(display-mode: standalone)"
        ? {
            matches: true,
            media: query,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
          }
        : nativeMatchMedia(query),
    });
  });
};

const mockYouthLogin = async (page, status = 200) => {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/auth/youth/login")) {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(
          status === 200
            ? {
                data: {
                  user: {
                    _id: "pwa-youth-user",
                    name: "PWA Test User",
                    role: "youth",
                  },
                  token: "pwa-test-token",
                },
              }
            : { message: "Invalid credentials" },
        ),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });
};

test.describe("public app", () => {
  test("landing page exposes the main entry points", async ({ page }) => {
    await page.goto("/");
    const expectedSiteOrigin = viteEnvironment.VITE_SITE_URL
      ? new URL(viteEnvironment.VITE_SITE_URL).origin
      : new URL(page.url()).origin;

    await expect(page).toHaveTitle(
      "SkillBridge | Courses and Opportunities in Kakuma",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Find courses, mentorship, and opportunities in Kakuma/,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "index, follow",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${expectedSiteOrigin}/skillbridge-logo.jpg`,
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      `${expectedSiteOrigin}/skillbridge-logo.jpg`,
    );
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      "SkillBridge logo",
    );
    await expect(
      page.getByRole("link", { name: "SkillBridge home" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /your next opportunity starts here/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Sign In" }),
    ).toHaveAttribute("href", "/login");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Updates" }),
    ).toHaveAttribute("href", "/updates");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Get Started" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Get Started" }).first(),
    ).toHaveAttribute("href", "/register");
  });

  test("landing page shows installation instructions when prompting is unavailable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    await page.getByRole("button", {
      name: /show instructions to install (app|skillbridge)/i,
    }).click();
    await expect(page.getByRole("note")).toContainText(
      "Open your browser menu and look for Install app or Add to Home screen",
    );
  });

  test("landing page opens the deferred browser installation prompt", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.pwaPromptCalls = 0;
      const event = new Event("beforeinstallprompt", { cancelable: true });
      Object.defineProperties(event, {
        prompt: {
          value: () => {
            window.pwaPromptCalls += 1;
          },
        },
        userChoice: {
          value: Promise.resolve({ outcome: "accepted" }),
        },
      });
      window.dispatchEvent(event);
    });

    await page.getByRole("button", { name: /install (app|skillbridge)/i }).click();
    await expect.poll(() => page.evaluate(() => window.pwaPromptCalls)).toBe(1);
    await expect(
      page.getByText(
        "Installation accepted. Follow any remaining browser steps to finish.",
      ),
    ).toBeVisible();
  });

  test("first successful login can install SkillBridge and saves the choice per user", async ({
    page,
  }) => {
    await mockYouthLogin(page);
    await page.goto("/login");
    await dispatchBeforeInstallPrompt(page);
    await page.locator('input[name="email"]').fill("pwa@example.com");
    await page.locator('input[name="password"]').fill("test-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    const prompt = page.getByRole("region", { name: "Install SkillBridge" });
    await expect(prompt).toBeVisible();
    await expect(prompt).toContainText(
      "Add SkillBridge to your phone's home screen for quicker access",
    );
    await prompt.getByRole("button", { name: "Install SkillBridge" }).click();

    await expect.poll(() => page.evaluate(() => window.installPromptCalls)).toBe(1);
    await expect(prompt).toBeHidden();
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem("skillbridge:pwa-install-choice:pwa-youth-user"),
    )).toBe("install");
  });

  test("a landing-page install attempt is not offered again from stale prompt state", async ({
    page,
  }) => {
    await mockYouthLogin(page);
    await page.goto("/");
    await dispatchBeforeInstallPrompt(page, "dismissed");
    await page.getByRole("button", { name: /install (app|skillbridge)/i }).click();
    await expect(
      page.getByText(
        "Installation was canceled. You can keep using SkillBridge in your browser.",
      ),
    ).toBeVisible();

    await page.goto("/login");
    await page.locator('input[name="email"]').fill("pwa@example.com");
    await page.locator('input[name="password"]').fill("test-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(
      page.getByRole("region", { name: "Install SkillBridge" }),
    ).toHaveCount(0);
  });

  test("continuing on the website suppresses the prompt for that user on later logins", async ({
    page,
  }) => {
    await mockYouthLogin(page);
    await page.goto("/login");
    await dispatchBeforeInstallPrompt(page);
    await page.locator('input[name="email"]').fill("pwa@example.com");
    await page.locator('input[name="password"]').fill("test-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    const prompt = page.getByRole("region", { name: "Install SkillBridge" });
    await expect(prompt).toBeVisible();
    await prompt.getByRole("button", { name: "Continue using website" }).click();
    await expect(prompt).toBeHidden();
    await expect.poll(() => page.evaluate(
      () => localStorage.getItem("skillbridge:pwa-install-choice:pwa-youth-user"),
    )).toBe("continue");

    await page.goto("/login");
    await dispatchBeforeInstallPrompt(page);
    await page.locator('input[name="email"]').fill("pwa@example.com");
    await page.locator('input[name="password"]').fill("test-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(prompt).toBeHidden();
  });

  test("failed login does not show the installation prompt", async ({ page }) => {
    await mockYouthLogin(page, 401);
    await page.goto("/login");
    await dispatchBeforeInstallPrompt(page);
    await page.locator('input[name="email"]').fill("pwa@example.com");
    await page.locator('input[name="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Invalid credentials")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Install SkillBridge" }),
    ).toHaveCount(0);
  });

  test("installed standalone landing page hides installation controls", async ({
    page,
  }) => {
    await emulateStandaloneDisplayMode(page);
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: /install (app|skillbridge)/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: /show instructions to install (app|skillbridge)/i,
      }),
    ).toHaveCount(0);
  });

  test("iOS standalone mode suppresses the first-login installation prompt", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "standalone", {
        configurable: true,
        value: true,
      });
    });
    await mockYouthLogin(page);
    await page.goto("/login");
    await dispatchBeforeInstallPrompt(page);
    await page.locator('input[name="email"]').fill("pwa@example.com");
    await page.locator('input[name="password"]').fill("test-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(
      page.getByRole("region", { name: "Install SkillBridge" }),
    ).toHaveCount(0);
  });

  test("standalone app entry continues to resolve React Router routes", async ({
    page,
  }) => {
    await emulateStandaloneDisplayMode(page);
    await page.goto("/login");

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Sign in to your account" }),
    ).toBeVisible();
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

    await expect(page).toHaveTitle(
      "SkillBridge Updates | Courses and Opportunities in Kakuma",
    );
    await expect(
      page.getByRole("heading", { name: "Latest Updates" }),
    ).toBeVisible();
    await expect(
      page.getByText("No updates yet. Check back soon."),
    ).toBeVisible();
  });

  test("updates page shows the admin profile picture on each post", async ({
    page,
  }) => {
    await page.route("https://images.example.com/admin.png", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    });
    await page.route("**/api/broadcasts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              _id: "broadcast-1",
              title: "New opportunity",
              message: "Applications are open.",
              createdAt: "2026-01-01T00:00:00.000Z",
              author: {
                fullName: "SkillBridge Admin",
                photo: "https://images.example.com/admin.png",
              },
            },
          ],
        }),
      });
    });

    await page.goto("/updates");

    await expect(page.getByRole("heading", { name: "New opportunity" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: "SkillBridge Admin profile picture" }),
    ).toHaveAttribute("src", "https://images.example.com/admin.png");
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

test.describe("admin profile picture", () => {
  test("admin can view, change, and remove their profile picture", async ({
    page,
  }) => {
    await authenticateAs(page, "admin");

    let photo = "/api/images/507f1f77bcf86cd799439011";
    await page.route("**/api/admin/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            _id: "playwright-admin",
            fullName: "Playwright Admin",
            email: "admin@example.test",
            role: "admin",
            photo,
          },
        }),
      });
    });
    await page.route("**/api/admin/profile/photo", async (route) => {
      if (route.request().method() === "PUT") {
        photo = "/api/images/507f1f77bcf86cd799439012";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { photo } }),
        });
        return;
      }
      photo = null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { photo: null } }),
      });
    });
    await page.route("**/api/images/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    });

    await page.goto("/admin/settings");

    const profilePicture = page.getByRole("img", {
      name: "Playwright Admin profile picture",
    });
    await expect(profilePicture).toBeVisible();
    await expect(profilePicture).toHaveAttribute(
      "src",
      /507f1f77bcf86cd799439011/,
    );

    await page.getByLabel("Choose profile picture").setInputFiles({
      name: "updated-avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await expect(page.getByText("Profile picture updated.")).toBeVisible();
    await expect(profilePicture).toHaveAttribute(
      "src",
      /507f1f77bcf86cd799439012/,
    );

    await page.getByRole("button", { name: "Remove picture" }).click();
    await expect(page.getByText("Profile picture removed.")).toBeVisible();
    await expect(profilePicture).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Remove picture" }),
    ).toHaveCount(0);
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
      if (path === "/home") {
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
          "content",
          "noindex, nofollow",
        );
      }
    }
  });

  test.describe("youth feeds", () => {
    test("home feed includes updates alongside flat course posts", async ({
      page,
    }) => {
      await authenticateAs(page, "youth");
      await page.route("**/api/youth/courses", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                _id: "home-course",
                title: "Community Skills Course",
                description: "A course shown in the youth home feed.",
                createdAt: "2026-01-02T00:00:00.000Z",
                applicationDeadline: "2099-01-01",
                filledSlots: 0,
                totalSlots: 10,
                organisation: {
                  _id: "home-org",
                  name: "Community Organisation",
                  logo: "/organisation-logo.jpg",
                },
                engagement: { reactionsCount: 0, commentsCount: 0, recentComments: [] },
              },
            ],
          }),
        });
      });

      await page.route("**/api/broadcasts**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                _id: "home-update",
                title: "New community update",
                message: "A new update for youth.",
                createdAt: "2026-01-03T00:00:00.000Z",
              },
            ],
          }),
        });
      });

      await page.goto("/home");

      await expect(page.getByRole("heading", { name: "Community Skills Course" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Latest Updates" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "New community update" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "View Community Organisation profile" }),
      ).toHaveAttribute("href", "/profiles/organisation/home-org");
      await expect(
        page.getByRole("link", { name: "Community Organisation", exact: true }),
      ).toHaveAttribute("href", "/profiles/organisation/home-org");
      await expect(page.getByRole("link", { name: "View all" })).toHaveAttribute(
        "href",
        "/updates",
      );
      const coursePost = page.locator("article").filter({
        has: page.getByRole("heading", { name: "Community Skills Course" }),
      });
      const updatePost = page.locator("article").filter({
        has: page.getByRole("heading", { name: "New community update" }),
      });
      for (const post of [coursePost, updatePost]) {
        await expect
          .poll(() =>
            post.evaluate((element) => getComputedStyle(element).backgroundColor),
          )
          .toBe("rgba(0, 0, 0, 0)");
        await expect
          .poll(() => post.evaluate((element) => getComputedStyle(element).borderRadius))
          .toBe("0px");
      }
      expect(page.pageErrors).toEqual([]);
    });

    test("youth profile uses a flat social profile layout", async ({ page }) => {
      await authenticateAs(page, "youth");
      await page.route("**/api/profiles/youth/profile-youth", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              _id: "profile-youth",
              fullName: "Amina Youth",
              username: "amina",
              bio: "Learning and building new skills.",
              communityType: "host_community",
              gender: "female",
              language: "English",
              attendedCourses: [{ _id: "course-1", title: "Digital Skills" }],
            },
          }),
        });
      });
      await page.route("**/api/follow/count/profile-youth/User", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { count: 8 } }),
        });
      });
      await page.route("**/api/follow/status/profile-youth/User", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { isFollowing: false } }),
        });
      });

      await page.goto("/profiles/youth/profile-youth");

      const profile = page.getByTestId("youth-profile");
      await expect(profile.getByRole("heading", { name: "Amina Youth" })).toBeVisible();
      await expect(profile.getByRole("heading", { name: "Intro" })).toBeVisible();
      await expect(profile.getByRole("heading", { name: "Details" })).toBeVisible();
      await expect(profile.getByRole("heading", { name: "Courses" })).toBeVisible();
      await expect(profile.getByText("8 followers")).toBeVisible();
      for (const section of await profile.locator("section").all()) {
        await expect(section).toHaveCSS("border-radius", "0px");
        await expect(section).toHaveCSS("box-shadow", "none");
      }
      expect(page.pageErrors).toEqual([]);
    });

    test("organisation profile uses flat page sections", async ({
      page,
    }) => {
      await authenticateAs(page, "youth");
      await page.route("**/api/profiles/organisation/profile-org", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              _id: "profile-org",
              name: "Community Organisation",
              type: "Non-profit",
              description: "Supporting learning and opportunity in the community.",
              location: "Kakuma",
              website: "https://example.org",
              email: "hello@example.org",
              phoneNumber: "+254700000000",
              logo: "https://example.org/logo.png",
              posts: [
                {
                  _id: "org-course-1",
                  title: "Digital Skills Course",
                  description: "A course posted by this organisation.",
                  status: "published",
                  createdAt: new Date().toISOString(),
                  applicationDeadline: new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  category: "technology",
                  location: "Kakuma",
                  deliveryMode: "in_person",
                  filledSlots: 2,
                  totalSlots: 20,
                  engagement: {
                    reactionsCount: 7,
                    commentsCount: 1,
                    reactedByMe: false,
                    recentComments: [
                      {
                        _id: "comment-1",
                        text: "Looking forward to this course.",
                        user: { fullName: "Community Member" },
                      },
                    ],
                  },
                },
              ],
            },
          }),
        });
      });
      await page.route("**/api/follow/count/profile-org/Organisation", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { count: 12 } }),
        });
      });
      await page.route("**/api/follow/status/profile-org/Organisation", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { isFollowing: false } }),
        });
      });
      await page.route(
        "**/api/youth/courses/org-course-1/reaction",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: { reacted: true, reactionsCount: 8, commentsCount: 1 },
            }),
          });
        },
      );

      await page.goto("/profiles/organisation/profile-org");

      const profile = page.getByTestId("organisation-profile");
      await expect(page.getByRole("heading", { name: "Community Organisation" })).toBeVisible();
      await expect(profile.getByRole("heading", { name: "About" })).toBeVisible();
      await expect(
        profile.getByRole("heading", { name: "Organisation details" }),
      ).toBeVisible();
      await expect(profile.getByRole("heading", { name: "Posts" })).toBeVisible();
      const posts = profile.getByTestId("organisation-post");
      await expect(posts).toHaveCount(1);
      await expect(posts.getByText("Digital Skills Course")).toBeVisible();
      await expect(posts.getByText("Applications open")).toHaveCount(0);
      await expect(posts).toContainText("Community Organisation");
      await expect(posts).toContainText("Kakuma");
      await expect(posts.getByRole("link", { name: "Apply" })).toHaveAttribute(
        "href",
        "/courses/org-course-1",
      );
      await expect(
        posts.getByRole("button", { name: "React (7)" }),
      ).toBeEnabled();
      await expect(
        posts.getByRole("button", { name: "Comment (1)" }),
      ).toBeEnabled();
      await posts.getByRole("button", { name: "React (7)" }).click();
      await expect(
        posts.getByRole("button", { name: "Reacted (8)" }),
      ).toBeVisible();
      await posts.getByRole("button", { name: "Comment (1)" }).click();
      await expect(posts.getByPlaceholder("Write a comment")).toBeVisible();
      await expect(posts).toContainText("Looking forward to this course.");
      await expect(posts).toHaveCSS("border-radius", "0px");
      await expect(posts).toHaveCSS("box-shadow", "none");
      await expect(profile.locator("section")).toHaveCount(4);
      for (const section of await profile.locator("section").all()) {
        await expect(section).toHaveCSS("border-radius", "0px");
        await expect(section).toHaveCSS("box-shadow", "none");
      }
      expect(page.pageErrors).toEqual([]);
    });

    test("courses page lists courses without mixing in updates", async ({
      page,
    }) => {
      await authenticateAs(page, "youth");
      let broadcastsRequested = false;
      await page.route("**/api/youth/courses", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                _id: "courses-page-course",
                title: "Dedicated Course Listing",
                description: "Only courses belong on this page.",
                createdAt: "2026-01-02T00:00:00.000Z",
                applicationDeadline: "2099-01-01",
                filledSlots: 0,
                totalSlots: 10,
                organisation: { _id: "courses-org", name: "Community Organisation" },
                engagement: { reactionsCount: 0, commentsCount: 0, recentComments: [] },
              },
            ],
          }),
        });
      });
      await page.route("**/api/broadcasts**", async (route) => {
        broadcastsRequested = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [{ _id: "excluded-update", title: "Update excluded from courses" }],
          }),
        });
      });

      await page.goto("/courses");

      await expect(
        page.getByRole("heading", { name: "Dedicated Course Listing" }),
      ).toBeVisible();
      const coursePost = page.locator("article").filter({
        has: page.getByRole("heading", { name: "Dedicated Course Listing" }),
      });
      await expect
        .poll(() =>
          coursePost.evaluate((element) => getComputedStyle(element).backgroundColor),
        )
        .toBe("rgba(0, 0, 0, 0)");
      await expect
        .poll(() => coursePost.evaluate((element) => getComputedStyle(element).borderRadius))
        .toBe("0px");
      await expect(page.getByText("Update excluded from courses")).toHaveCount(0);
      expect(broadcastsRequested).toBe(false);
      expect(page.pageErrors).toEqual([]);
    });
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
