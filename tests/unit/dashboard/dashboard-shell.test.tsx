import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dashboardState = vi.hoisted(() => {
  const requireActiveBusiness = vi.fn();
  const redirect = vi.fn();
  const AuthRequiredError = class extends Error {
    constructor(message = "Authentication is required.") {
      super(message);
      this.name = "AuthRequiredError";
    }
  };

  return {
    requireActiveBusiness,
    redirect,
    AuthRequiredError,
  };
});

vi.mock("@/lib/business-context", () => ({
  AuthRequiredError: dashboardState.AuthRequiredError,
  requireActiveBusiness: dashboardState.requireActiveBusiness,
}));

vi.mock("next/navigation", () => ({
  redirect: dashboardState.redirect,
}));

import DashboardLayout from "@/app/(dashboard)/layout";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

describe("dashboard shell", () => {
  beforeEach(() => {
    dashboardState.requireActiveBusiness.mockReset();
    dashboardState.redirect.mockReset();

    dashboardState.requireActiveBusiness.mockResolvedValue({
      userId: "user_123",
      businessId: "business_123",
      activeBusinessId: "business_123",
      role: "ADMIN",
    });
  });

  it("renders a protected premium dashboard shell around dashboard content", async () => {
    render(
      await DashboardLayout({
        children: <div>Dashboard child content</div>,
      }),
    );

    expect(dashboardState.requireActiveBusiness).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/flow command/i)).toBeInTheDocument();
    expect(screen.getByText(/dashboard child content/i)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard live/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: /clients soon/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /invoices soon/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /payments soon/i })).not.toBeInTheDocument();
  });

  it("redirects to sign-in when the active business cannot be resolved for auth reasons", async () => {
    const redirectSignal = new Error("NEXT_REDIRECT");

    dashboardState.requireActiveBusiness.mockRejectedValueOnce(
      new dashboardState.AuthRequiredError(),
    );
    dashboardState.redirect.mockImplementationOnce(() => {
      throw redirectSignal;
    });

    await expect(
      DashboardLayout({
        children: <div>Dashboard child content</div>,
      }),
    ).rejects.toThrow(redirectSignal);

    expect(dashboardState.redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("rethrows unexpected dashboard shell failures instead of masking them as auth redirects", async () => {
    const unexpectedError = new Error("database offline");

    dashboardState.requireActiveBusiness.mockRejectedValueOnce(unexpectedError);

    await expect(
      DashboardLayout({
        children: <div>Dashboard child content</div>,
      }),
    ).rejects.toThrow("database offline");

    expect(dashboardState.redirect).not.toHaveBeenCalled();
  });

  it("renders placeholder admin metrics, charts, and recent activity for the dashboard", async () => {
    render(await DashboardPage());

    expect(
      screen.getByRole("heading", { name: /business performance overview/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/\$128,400/i)).toBeInTheDocument();
    expect(screen.getByText(/overdue invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    expect(screen.getByText(/collections trend/i)).toBeInTheDocument();
  });
});
