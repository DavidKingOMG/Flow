import { beforeEach, describe, expect, it, vi } from "vitest";

const transactionState = vi.hoisted(() => {
  const businessCreate = vi.fn();
  const roleCreate = vi.fn();
  const userCreate = vi.fn();
  const businessSettingsCreate = vi.fn();
  const userFindFirst = vi.fn();
  const userUpdate = vi.fn();
  const transaction = {
    business: {
      create: businessCreate,
    },
    role: {
      create: roleCreate,
    },
    user: {
      create: userCreate,
    },
    businessSettings: {
      create: businessSettingsCreate,
    },
  };

  return {
    businessCreate,
    roleCreate,
    userCreate,
    businessSettingsCreate,
    userFindFirst,
    userUpdate,
    transaction,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: async (
      callback: (transaction: typeof transactionState.transaction) => Promise<unknown>,
    ) => callback(transactionState.transaction),
    user: {
      findFirst: transactionState.userFindFirst,
      update: transactionState.userUpdate,
    },
  },
}));

import {
  createBusinessAccount,
  createBusinessAccountAction,
  signInWithCredentialsAction,
} from "@/server/actions/auth-actions";

describe("createBusinessAccount", () => {
  beforeEach(() => {
    transactionState.businessCreate.mockReset();
    transactionState.roleCreate.mockReset();
    transactionState.userCreate.mockReset();
    transactionState.businessSettingsCreate.mockReset();
    transactionState.userFindFirst.mockReset();
    transactionState.userUpdate.mockReset();

    transactionState.businessCreate.mockResolvedValue({
      id: "business_123",
      name: "Northwind Studio",
      slug: "northwind-studio",
    });

    transactionState.roleCreate.mockResolvedValue({
      id: "role_123",
      businessId: "business_123",
      key: "ADMIN",
      name: "Admin",
    });

    transactionState.userCreate.mockResolvedValue({
      id: "user_123",
      businessId: "business_123",
      roleId: "role_123",
      role: {
        id: "role_123",
        key: "ADMIN",
        name: "Admin",
      },
      email: "jamie@example.com",
      username: "jamie-admin",
    });

    transactionState.businessSettingsCreate.mockResolvedValue({
      id: "settings_123",
      businessId: "business_123",
      currencyCode: "USD",
      timezone: "America/New_York",
    });
  });

  it("creates a business, its initial admin user, and default settings", async () => {
    const result = await createBusinessAccount({
      businessName: "Northwind Studio",
      fullName: "Jamie Lee",
      email: "jamie@example.com",
      username: "jamie-admin",
      password: "SecurePass123!",
      phone: "5551234567",
    });

    expect(transactionState.businessCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Northwind Studio",
        slug: "northwind-studio",
      }),
    });

    expect(transactionState.roleCreate).toHaveBeenCalledWith({
      data: {
        businessId: "business_123",
        key: "ADMIN",
        name: "Admin",
        description: "Workspace owner with full business access.",
        isSystem: true,
      },
    });

    expect(transactionState.userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: "business_123",
        roleId: "role_123",
        email: "jamie@example.com",
        username: "jamie-admin",
        fullName: "Jamie Lee",
        phone: "5551234567",
        passwordHash: expect.any(String),
      }),
      include: {
        role: true,
      },
    });

    expect(transactionState.businessSettingsCreate).toHaveBeenCalledWith({
      data: {
        businessId: "business_123",
        currencyCode: "USD",
        timezone: "America/New_York",
      },
    });

    expect(result.business.slug).toBe("northwind-studio");
    expect(result.user.role.key).toBe("ADMIN");
    expect(result.settings.currencyCode).toBe("USD");
  });
});

describe("authorizeCredentials", () => {
  beforeEach(() => {
    transactionState.userFindFirst.mockReset();
    transactionState.userUpdate.mockReset();
  });

  it("rejects users whose account status is not active", async () => {
    transactionState.userFindFirst.mockResolvedValue({
      id: "user_123",
      passwordHash: "not-used",
      status: "INVITED",
      businessId: "business_123",
      activeBusinessId: "business_123",
      fullName: "Jamie Lee",
      email: "jamie@example.com",
      image: null,
      role: {
        key: "ADMIN",
        businessId: "business_123",
      },
      business: {
        status: "ACTIVE",
      },
    });

    const { authorizeCredentials } = await import("@/lib/auth-authorize");

    await expect(
      authorizeCredentials({
        identifier: "jamie@example.com",
        password: "SecurePass123!",
      }),
    ).resolves.toBeNull();

    expect(transactionState.userUpdate).not.toHaveBeenCalled();
  });

  it("rejects users whose business is not active", async () => {
    transactionState.userFindFirst.mockResolvedValue({
      id: "user_123",
      passwordHash: "not-used",
      status: "ACTIVE",
      businessId: "business_123",
      activeBusinessId: "business_123",
      fullName: "Jamie Lee",
      email: "jamie@example.com",
      image: null,
      role: {
        key: "ADMIN",
        businessId: "business_123",
      },
      business: {
        status: "DISABLED",
      },
    });

    const { authorizeCredentials } = await import("@/lib/auth-authorize");

    await expect(
      authorizeCredentials({
        identifier: "jamie@example.com",
        password: "SecurePass123!",
      }),
    ).resolves.toBeNull();

    expect(transactionState.userUpdate).not.toHaveBeenCalled();
  });

  it("rejects users whose assigned role belongs to another business", async () => {
    transactionState.userFindFirst.mockResolvedValue({
      id: "user_123",
      passwordHash: "not-used",
      status: "ACTIVE",
      businessId: "business_123",
      activeBusinessId: "business_123",
      fullName: "Jamie Lee",
      email: "jamie@example.com",
      image: null,
      role: {
        key: "ADMIN",
        businessId: "business_999",
      },
      business: {
        status: "ACTIVE",
      },
    });

    const { authorizeCredentials } = await import("@/lib/auth-authorize");

    await expect(
      authorizeCredentials({
        identifier: "jamie@example.com",
        password: "SecurePass123!",
      }),
    ).resolves.toBeNull();

    expect(transactionState.userUpdate).not.toHaveBeenCalled();
  });
});

describe("getEnv", () => {
  it("requires database, auth, and Stripe environment variables", async () => {
    const originalEnv = { ...process.env };

    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/flow",
      AUTH_SECRET: "test-secret",
      AUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_replace_me",
      STRIPE_WEBHOOK_SECRET: "whsec_replace_me",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_replace_me",
    };

    const { getEnv } = await import("@/lib/env");

    expect(getEnv()).toEqual({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/flow",
      AUTH_SECRET: "test-secret",
      AUTH_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_replace_me",
      STRIPE_WEBHOOK_SECRET: "whsec_replace_me",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_replace_me",
    });

    process.env = originalEnv;
  });
});

describe("auth foundations", () => {
  it("exports the App Router auth handlers", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({
      handlers: {
        GET: "get-handler",
        POST: "post-handler",
      },
    }));

    const routeModule = await import("@/app/api/auth/[...nextauth]/route");

    expect(routeModule.GET).toBe("get-handler");
    expect(routeModule.POST).toBe("post-handler");
  });

  it("redirects sign-up and sign-in flows to the dashboard", async () => {
    const signInMock = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@/lib/auth", () => ({
      signIn: signInMock,
    }));

    const signUpFormData = new FormData();
    signUpFormData.set("businessName", "Northwind Studio");
    signUpFormData.set("fullName", "Jamie Lee");
    signUpFormData.set("email", "jamie@example.com");
    signUpFormData.set("username", "jamie-admin");
    signUpFormData.set("password", "SecurePass123!");
    signUpFormData.set("phone", "5551234567");

    await createBusinessAccountAction(signUpFormData);

    const signInFormData = new FormData();
    signInFormData.set("identifier", "jamie@example.com");
    signInFormData.set("password", "SecurePass123!");

    await signInWithCredentialsAction(signInFormData);

    expect(signInMock).toHaveBeenNthCalledWith(
      1,
      "credentials",
      expect.objectContaining({
        redirectTo: "/dashboard",
      }),
    );

    expect(signInMock).toHaveBeenNthCalledWith(
      2,
      "credentials",
      expect.objectContaining({
        redirectTo: "/dashboard",
      }),
    );
  });
});
