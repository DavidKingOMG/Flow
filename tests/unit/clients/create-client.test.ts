import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientState = vi.hoisted(() => {
  const roleUpsert = vi.fn();
  const userCreate = vi.fn();
  const clientCreate = vi.fn();
  const userFindMany = vi.fn();
  const clientFindMany = vi.fn();

  const transaction = {
    role: {
      upsert: roleUpsert,
    },
    user: {
      create: userCreate,
    },
    client: {
      create: clientCreate,
    },
  };

  return {
    roleUpsert,
    userCreate,
    clientCreate,
    userFindMany,
    clientFindMany,
    transaction,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: async (
      callback: (transaction: typeof clientState.transaction) => Promise<unknown>,
    ) => callback(clientState.transaction),
    user: {
      findMany: clientState.userFindMany,
    },
    client: {
      findMany: clientState.clientFindMany,
    },
  },
}));

import { createClientForBusiness } from "@/server/actions/client-actions";

describe("createClientForBusiness", () => {
  beforeEach(() => {
    clientState.roleUpsert.mockReset();
    clientState.userCreate.mockReset();
    clientState.clientCreate.mockReset();
    clientState.userFindMany.mockReset();
    clientState.clientFindMany.mockReset();

    clientState.userFindMany.mockResolvedValue([]);
    clientState.clientFindMany.mockResolvedValue([]);
    clientState.roleUpsert.mockResolvedValue({
      id: "role_client",
      businessId: "business_123",
      key: "CLIENT",
      name: "Client",
    });
    clientState.userCreate.mockResolvedValue({
      id: "user_client_123",
      businessId: "business_123",
      roleId: "role_client",
      email: "april@example.com",
      username: "april-portal",
      phone: "15551234567",
      status: "ACTIVE",
    });
    clientState.clientCreate.mockImplementation(async ({ data }) => ({
      id: "client_123",
      businessId: data.businessId,
      userId: data.userId ?? null,
      fullName: data.fullName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      username: data.username,
      notes: data.notes ?? null,
      status: "ACTIVE",
    }));
  });

  it("creates a non-login client record without provisioning a linked user", async () => {
    const result = await createClientForBusiness(
      {
        businessId: "business_123",
        activeBusinessId: "business_123",
        userId: "user_admin_123",
      },
      {
        fullName: "April Carson",
        companyName: "Northwind Studio",
        email: "April@Example.com",
        phone: "(555) 123-4567",
        notes: "Prefers SMS reminders.",
        loginEnabled: false,
      },
    );

    expect(clientState.roleUpsert).not.toHaveBeenCalled();
    expect(clientState.userCreate).not.toHaveBeenCalled();
    expect(clientState.clientCreate).toHaveBeenCalledWith({
      data: {
        businessId: "business_123",
        userId: null,
        fullName: "April Carson",
        companyName: "Northwind Studio",
        email: "april@example.com",
        phone: "5551234567",
        username: null,
        notes: "Prefers SMS reminders.",
      },
    });

    expect(result.user).toBeNull();
    expect(result.client.userId).toBeNull();
    expect(result.client.email).toBe("april@example.com");
  });

  it("creates a login-enabled client record and links the newly created client user", async () => {
    const result = await createClientForBusiness(
      {
        businessId: "business_123",
        activeBusinessId: "business_123",
        userId: "user_admin_123",
      },
      {
        fullName: "April Carson",
        companyName: "Northwind Studio",
        email: "April@Example.com",
        phone: "+1 (555) 123-4567",
        username: "April-Portal",
        password: "SecurePass123!",
        notes: "",
        loginEnabled: true,
      },
    );

    expect(clientState.roleUpsert).toHaveBeenCalledWith({
      where: {
        businessId_key: {
          businessId: "business_123",
          key: "CLIENT",
        },
      },
      update: {},
      create: {
        businessId: "business_123",
        key: "CLIENT",
        name: "Client",
        description: "Client portal user with limited workspace access.",
        isSystem: true,
      },
    });

    expect(clientState.userCreate).toHaveBeenCalledWith({
      data: {
        businessId: "business_123",
        activeBusinessId: "business_123",
        roleId: "role_client",
        status: "ACTIVE",
        fullName: "April Carson",
        email: "april@example.com",
        username: "april-portal",
        phone: "15551234567",
        passwordHash: expect.any(String),
      },
    });

    expect(clientState.clientCreate).toHaveBeenCalledWith({
      data: {
        businessId: "business_123",
        userId: "user_client_123",
        fullName: "April Carson",
        companyName: "Northwind Studio",
        email: "april@example.com",
        phone: "15551234567",
        username: "april-portal",
        notes: null,
      },
    });

    expect(result.user?.id).toBe("user_client_123");
    expect(result.client.userId).toBe("user_client_123");
    expect(result.client.username).toBe("april-portal");
  });

  it("converts global user uniqueness collisions into safe duplicate conflict errors", async () => {
    clientState.userCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.7.0",
        meta: {
          target: ["email", "username", "phone"],
        },
      }),
    );

    await expect(
      createClientForBusiness(
        {
          businessId: "business_123",
          activeBusinessId: "business_123",
          userId: "user_admin_123",
        },
        {
          fullName: "April Carson",
          companyName: "Northwind Studio",
          email: "April@Example.com",
          phone: "+1 (555) 123-4567",
          username: "April-Portal",
          password: "SecurePass123!",
          notes: "",
          loginEnabled: true,
        },
      ),
    ).rejects.toMatchObject({
      name: "DuplicateClientConflictError",
      conflicts: expect.arrayContaining([
        expect.objectContaining({
          field: "email",
          entityType: "user",
          recordStatus: "active",
        }),
        expect.objectContaining({
          field: "username",
          entityType: "user",
          recordStatus: "active",
        }),
        expect.objectContaining({
          field: "phone",
          entityType: "user",
          recordStatus: "active",
        }),
      ]),
    });

    expect(clientState.clientCreate).not.toHaveBeenCalled();
  });
});
