import { expect, test } from "@playwright/test";

test("applicant rows show compact friend-request styling and review actions", async ({
  page,
}) => {
  page.pageErrors = [];
  page.on("pageerror", (error) => page.pageErrors.push(error));

  await page.addInitScript(() => {
    sessionStorage.setItem("token", "playwright-token");
    sessionStorage.setItem(
      "user",
      JSON.stringify({
        _id: "playwright-organisation",
        name: "Playwright Organisation",
        role: "organisation",
      }),
    );
  });

  await page.route("**/api/org/applications**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            _id: "application-1",
            status: "submitted",
            createdAt: "2026-10-10T00:00:00.000Z",
            youth: {
              _id: "youth-1",
              fullName: "Amina Applicant",
              email: "amina@example.org",
              communityType: "host_community",
            },
            course: { title: "Digital Skills Course" },
            answers: [
              {
                question: "Why are you interested?",
                answer: "To learn new skills.",
              },
            ],
          },
        ],
      }),
    });
  });
  await page.route("**/api/org/courses", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.goto("/org/applications");

  const applicantRow = page.getByTestId("application-row");
  await expect(page.getByRole("heading", { name: "Amina Applicant" })).toBeVisible();
  await expect(page.getByText("Digital Skills Course")).toBeVisible();
  await expect(applicantRow).toHaveCSS("border-radius", "0px");
  await expect(applicantRow.locator(".fh-badge-submitted")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Shortlist" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();

  await page.getByText("Review application answers (1)").click();
  await expect(page.getByText("To learn new skills.")).toBeVisible();
  await page.getByRole("button", { name: "Shortlist" }).click();
  await expect(
    page.getByRole("heading", { name: "Shortlist Amina Applicant" }),
  ).toBeVisible();
  expect(page.pageErrors).toEqual([]);
});
