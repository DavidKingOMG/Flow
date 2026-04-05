import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => {
  const auth = vi.fn();
  const userFindUnique = vi.fn();

  return {
    auth,
    userFindUnique,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: authState.auth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: authState.userFindUnique,
    },
  },
}));

import {
  AuthRequiredError,
  TenantAccessError,
  assertBusinessAccess,
  requireActiveBusiness,
  resolveActiveBusiness,
} from "@/lib/business-context";

describe("tenant guard", () => {
  beforeEach(() => {
    authState.auth.mockReset();
    authState.userFindUnique.mockReset();
  });

  it("returns the active business context for an authenticated user", () => {
    const context = resolveActiveBusiness({
      user: {
        id: "user_123",
        businessId: "business_123",
        activeBusinessId: "business_123",
        role: "ADMIN",
      },
    });

    expect(context).toEqual({
      userId: "user_123",
      businessId: "business_123",
      activeBusinessId: "business_123",
      role: "ADMIN",
    });
  });

  it("rejects cross-business access", () => {
    expect(() =>
      assertBusinessAccess({
        activeBusinessId: "business_123",
        resourceBusinessId: "business_456",
      }),
    ).toThrow(TenantAccessError);
  });

  it("revalidates the current user, business, and role from the database", async () => {
    authState.auth.mockResolvedValue({
      user: {
        id: "user_123",
        businessId: "stale_business",
        activeBusinessId: "stale_business",
        role: "STAFF",
      },
    });

    authState.userFindUnique.mockResolvedValue({
      id: "user_123",
      status: "ACTIVE",
      businessId: "business_123",
      activeBusinessId: null,
      role: {
        key: "ADMIN",
        businessId: "business_123",
      },
      business: {
        status: "ACTIVE",
      },
    });

    await expect(requireActiveBusiness()).resolves.toEqual({
      userId: "user_123",
      businessId: "business_123",
      activeBusinessId: "business_123",
      role: "ADMIN",
    });
  });

  it("rejects a stale session after the user is disabled", async () => {
    authState.auth.mockResolvedValue({
      user: {
        id: "user_123",
        businessId: "business_123",
        activeBusinessId: "business_123",
        role: "ADMIN",
      },
    });

    authState.userFindUnique.mockResolvedValue({
      id: "user_123",
      status: "DISABLED",
      businessId: "business_123",
      activeBusinessId: "business_123",
      role: {
        key: "ADMIN",
        businessId: "business_123",
      },
      business: {
        status: "ACTIVE",
      },
    });

    await expect(requireActiveBusiness()).rejects.toThrow(AuthRequiredError);
  });
});
