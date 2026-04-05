import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const duplicateState = vi.hoisted(() => {
  const requireActiveBusiness = vi.fn();
  const userFindMany = vi.fn();
  const clientFindMany = vi.fn();
  const transaction = vi.fn();
  const roleUpsert = vi.fn();
  const userCreate = vi.fn();
  const clientCreate = vi.fn();

  return {
    requireActiveBusiness,
    userFindMany,
    clientFindMany,
    transaction,
    roleUpsert,
    userCreate,
    clientCreate,
  };
});

vi.mock("@/lib/business-context", () => ({
  assertBusinessAccess: vi.fn(),
  requireActiveBusiness: duplicateState.requireActiveBusiness,
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: duplicateState.transaction,
    user: {
      findMany: duplicateState.userFindMany,
    },
    client: {
      findMany: duplicateState.clientFindMany,
    },
  },
}));

import {
  createClientAction,
  initialCreateClientFormState,
} from "@/server/actions/client-actions";

describe("createClientAction duplicate validation", () => {
  beforeEach(() => {
    duplicateState.requireActiveBusiness.mockReset();
    duplicateState.userFindMany.mockReset();
    duplicateState.clientFindMany.mockReset();
    duplicateState.transaction.mockReset();
    duplicateState.roleUpsert.mockReset();
    duplicateState.userCreate.mockReset();
    duplicateState.clientCreate.mockReset();

    duplicateState.requireActiveBusiness.mockResolvedValue({
      userId: "user_admin_123",
      businessId: "business_123",
      activeBusinessId: "business_123",
      role: "ADMIN",
    });
    duplicateState.transaction.mockImplementation(async (callback) =>
      callback({
        role: {
          upsert: duplicateState.roleUpsert,
        },
        user: {
          create: duplicateState.userCreate,
        },
        client: {
          create: duplicateState.clientCreate,
        },
      }),
    );
    duplicateState.roleUpsert.mockResolvedValue({
      id: "role_client",
      businessId: "business_123",
      key: "CLIENT",
      name: "Client",
    });
    duplicateState.userCreate.mockResolvedValue({
      id: "user_client_123",
    });
    duplicateState.clientCreate.mockResolvedValue({
      id: "client_123",
    });
  });

  it("returns business-aware conflict metadata for user and client duplicate fields", async () => {
    duplicateState.userFindMany.mockResolvedValue([
      {
        id: "user_existing_1",
        email: "portal@example.com",
        username: "portal-client",
        phone: "15557654321",
        status: "DISABLED",
      },
    ]);

    duplicateState.clientFindMany.mockResolvedValue([
      {
        id: "client_existing_1",
        businessId: "business_123",
        email: "owner@example.com",
        username: null,
        phone: "5551234567",
        status: "INACTIVE",
      },
    ]);

    const formData = new FormData();
    formData.set("fullName", "April Carson");
    formData.set("companyName", "Northwind Studio");
    formData.set("email", "owner@example.com");
    formData.set("phone", "(555) 123-4567");
    formData.set("username", "portal-client");
    formData.set("password", "SecurePass123!");
    formData.set("loginEnabled", "on");

    const result = await createClientAction(initialCreateClientFormState, formData);

    expect(duplicateState.userFindMany).toHaveBeenCalledWith({
      where: {
        businessId: "business_123",
        OR: [
          { email: "owner@example.com" },
          { username: "portal-client" },
          { phone: "5551234567" },
        ],
      },
      select: {
        email: true,
        username: true,
        phone: true,
        status: true,
      },
    });

    expect(duplicateState.clientFindMany).toHaveBeenCalledWith({
      where: {
        businessId: "business_123",
        OR: [
          { email: "owner@example.com" },
          { username: "portal-client" },
          { phone: "5551234567" },
        ],
      },
      select: {
        email: true,
        username: true,
        phone: true,
        status: true,
      },
    });

    expect(duplicateState.transaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/resolve the duplicate client details/i);
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "email",
          entityType: "client",
          recordStatus: "inactive",
        }),
        expect.objectContaining({
          field: "phone",
          entityType: "client",
          recordStatus: "inactive",
        }),
        expect.objectContaining({
          field: "username",
          entityType: "user",
          recordStatus: "inactive",
        }),
      ]),
    );
    expect(result.conflicts[0]).not.toHaveProperty("recordId");
    expect(result.fieldErrors.email?.[0]).toMatch(/inactive client/i);
    expect(result.fieldErrors.phone?.[0]).toMatch(/inactive client/i);
    expect(result.fieldErrors.username?.[0]).toMatch(/inactive user/i);
  });

  it("rejects phone values that do not normalize into at least seven digits", async () => {
    const formData = new FormData();
    formData.set("fullName", "April Carson");
    formData.set("companyName", "Northwind Studio");
    formData.set("email", "april@example.com");
    formData.set("phone", "---");

    const result = await createClientAction(initialCreateClientFormState, formData);

    expect(duplicateState.requireActiveBusiness).not.toHaveBeenCalled();
    expect(duplicateState.userFindMany).not.toHaveBeenCalled();
    expect(duplicateState.clientFindMany).not.toHaveBeenCalled();
    expect(duplicateState.transaction).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.fieldErrors.phone?.[0]).toMatch(/at least 7 digits/i);
  });

  it("returns safe field conflicts when global user uniqueness fails during login provisioning", async () => {
    duplicateState.userFindMany.mockResolvedValue([]);
    duplicateState.clientFindMany.mockResolvedValue([]);
    duplicateState.userCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.7.0",
        meta: {
          target: ["email"],
        },
      }),
    );

    const formData = new FormData();
    formData.set("fullName", "April Carson");
    formData.set("companyName", "Northwind Studio");
    formData.set("email", "april@example.com");
    formData.set("phone", "(555) 123-4567");
    formData.set("username", "april-portal");
    formData.set("password", "SecurePass123!");
    formData.set("loginEnabled", "on");

    const result = await createClientAction(initialCreateClientFormState, formData);

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/resolve the duplicate client details/i);
    expect(result.conflicts).toEqual([
      expect.objectContaining({
        field: "email",
        entityType: "user",
        recordStatus: "active",
      }),
    ]);
    expect(result.conflicts[0]).not.toHaveProperty("recordId");
    expect(result.fieldErrors.email?.[0]).toMatch(/active user/i);
    expect(duplicateState.clientCreate).not.toHaveBeenCalled();
  });
});
