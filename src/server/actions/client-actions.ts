"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertBusinessAccess, requireActiveBusiness, type ActiveBusinessContext } from "@/lib/business-context";
import { hashPassword } from "@/lib/password";
import {
  createClientSchema,
  normalizeUsername,
  type CreateClientData,
  type CreateClientInput,
} from "@/lib/validators/client";

type ClientFormField =
  | "fullName"
  | "companyName"
  | "email"
  | "phone"
  | "notes"
  | "loginEnabled"
  | "username"
  | "password";

type FieldErrors = Partial<Record<ClientFormField, string[]>>;

export type ClientConflict = {
  field: "email" | "phone" | "username";
  value: string;
  entityType: "user" | "client";
  recordStatus: "active" | "inactive";
};

export type CreateClientFormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: FieldErrors;
  conflicts: ClientConflict[];
  values: {
    fullName: string;
    companyName: string;
    email: string;
    phone: string;
    notes: string;
    loginEnabled: boolean;
    username: string;
    password: string;
  };
};

export const initialCreateClientFormState: CreateClientFormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  conflicts: [],
  values: {
    fullName: "",
    companyName: "",
    email: "",
    phone: "",
    notes: "",
    loginEnabled: false,
    username: "",
    password: "",
  },
};

class DuplicateClientConflictError extends Error {
  constructor(readonly conflicts: ClientConflict[]) {
    super("Resolve the duplicate client details before creating this record.");
    this.name = "DuplicateClientConflictError";
  }
}

function isKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

function createGlobalUserConflictsFromPrisma(
  error: Prisma.PrismaClientKnownRequestError,
  data: ReturnType<typeof normalizeClientData>,
): ClientConflict[] {
  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.filter((item): item is string => typeof item === "string")
    : [];

  const mappedConflicts: ClientConflict[] = [];

  if (target.includes("email")) {
    mappedConflicts.push({
      field: "email",
      value: data.email,
      entityType: "user",
      recordStatus: "active",
    });
  }

  if (target.includes("username") && data.username) {
    mappedConflicts.push({
      field: "username",
      value: data.username,
      entityType: "user",
      recordStatus: "active",
    });
  }

  if (target.includes("phone")) {
    mappedConflicts.push({
      field: "phone",
      value: data.phone,
      entityType: "user",
      recordStatus: "active",
    });
  }

  return mappedConflicts;
}

function readFormDataEntry(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function toRecordStatus(value: string): "active" | "inactive" {
  return value === "ACTIVE" ? "active" : "inactive";
}

function normalizeClientData(input: CreateClientData) {
  return {
    fullName: input.fullName.trim(),
    companyName: input.companyName?.trim() || null,
    email: input.email,
    phone: input.phone,
    notes: input.notes?.trim() || null,
    loginEnabled: input.loginEnabled,
    username: input.loginEnabled ? normalizeUsername(input.username) || null : null,
    password: input.loginEnabled ? input.password ?? "" : null,
  };
}

function buildDuplicateFilters(data: ReturnType<typeof normalizeClientData>) {
  const filters: Array<Record<string, string>> = [{ email: data.email }];

  if (data.username) {
    filters.push({ username: data.username });
  }

  filters.push({ phone: data.phone });

  return filters;
}

function buildConflictMessage(conflict: ClientConflict): string {
  return `Matches an ${conflict.recordStatus} ${conflict.entityType} record.`;
}

function mergeFieldError(
  fieldErrors: FieldErrors,
  field: ClientConflict["field"],
  message: string,
) {
  const existing = fieldErrors[field] ?? [];
  fieldErrors[field] = [...existing, message];
}

function mapConflictsToFieldErrors(conflicts: ClientConflict[]): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const conflict of conflicts) {
    mergeFieldError(fieldErrors, conflict.field, buildConflictMessage(conflict));
  }

  return fieldErrors;
}

async function findDuplicateConflicts(
  businessId: string,
  data: ReturnType<typeof normalizeClientData>,
): Promise<ClientConflict[]> {
  const filters = buildDuplicateFilters(data);

  const [users, clients] = await Promise.all([
    db.user.findMany({
      where: {
        businessId,
        OR: filters,
      },
      select: {
        email: true,
        username: true,
        phone: true,
        status: true,
      },
    }),
    db.client.findMany({
      where: {
        businessId,
        OR: filters,
      },
      select: {
        email: true,
        username: true,
        phone: true,
        status: true,
      },
    }),
  ]);

  const conflicts: ClientConflict[] = [];

  for (const user of users) {
    if (user.email === data.email) {
      conflicts.push({
        field: "email",
        value: data.email,
        entityType: "user",
        recordStatus: toRecordStatus(user.status),
      });
    }

    if (data.username && user.username === data.username) {
      conflicts.push({
        field: "username",
        value: data.username,
        entityType: "user",
        recordStatus: toRecordStatus(user.status),
      });
    }

    if (user.phone && user.phone === data.phone) {
      conflicts.push({
        field: "phone",
        value: data.phone,
        entityType: "user",
        recordStatus: toRecordStatus(user.status),
      });
    }
  }

  for (const client of clients) {
    if (client.email === data.email) {
      conflicts.push({
        field: "email",
        value: data.email,
        entityType: "client",
        recordStatus: toRecordStatus(client.status),
      });
    }

    if (data.username && client.username === data.username) {
      conflicts.push({
        field: "username",
        value: data.username,
        entityType: "client",
        recordStatus: toRecordStatus(client.status),
      });
    }

    if (client.phone === data.phone) {
      conflicts.push({
        field: "phone",
        value: data.phone,
        entityType: "client",
        recordStatus: toRecordStatus(client.status),
      });
    }
  }

  return conflicts;
}

function extractValues(rawInput: CreateClientInput): CreateClientFormState["values"] {
  return {
    fullName: rawInput.fullName ?? "",
    companyName: rawInput.companyName ?? "",
    email: rawInput.email ?? "",
    phone: rawInput.phone ?? "",
    notes: rawInput.notes ?? "",
    loginEnabled: Boolean(rawInput.loginEnabled),
    username: rawInput.username ?? "",
    password: rawInput.password ?? "",
  };
}

export async function createClientForBusiness(
  context: Pick<ActiveBusinessContext, "businessId" | "activeBusinessId" | "userId">,
  rawInput: CreateClientInput,
) {
  assertBusinessAccess({
    activeBusinessId: context.activeBusinessId,
    resourceBusinessId: context.businessId,
  });

  const parsed = createClientSchema.parse(rawInput);
  const input = normalizeClientData(parsed);
  const conflicts = await findDuplicateConflicts(context.businessId, input);

  if (conflicts.length > 0) {
    throw new DuplicateClientConflictError(conflicts);
  }

  try {
    return await db.$transaction(async (transaction) => {
      let user: { id: string } | null = null;

      if (input.loginEnabled && input.username && input.password) {
        const clientRole = await transaction.role.upsert({
          where: {
            businessId_key: {
              businessId: context.businessId,
              key: "CLIENT",
            },
          },
          update: {},
          create: {
            businessId: context.businessId,
            key: "CLIENT",
            name: "Client",
            description: "Client portal user with limited workspace access.",
            isSystem: true,
          },
        });

        user = await transaction.user.create({
          data: {
            businessId: context.businessId,
            activeBusinessId: context.businessId,
            roleId: clientRole.id,
            status: "ACTIVE",
            fullName: input.fullName,
            email: input.email,
            username: input.username,
            phone: input.phone,
            passwordHash: hashPassword(input.password),
          },
        });
      }

      const client = await transaction.client.create({
        data: {
          businessId: context.businessId,
          userId: user?.id ?? null,
          fullName: input.fullName,
          companyName: input.companyName,
          email: input.email,
          phone: input.phone,
          username: input.username,
          notes: input.notes,
        },
      });

      return {
        client,
        user,
      };
    });
  } catch (error) {
    if (isKnownRequestError(error) && error.code === "P2002") {
      const globalUserConflicts = createGlobalUserConflictsFromPrisma(error, input);
      if (globalUserConflicts.length > 0) {
        throw new DuplicateClientConflictError(globalUserConflicts);
      }
    }

    throw error;
  }
}

export async function createClientAction(
  _previousState: CreateClientFormState,
  formData: FormData,
): Promise<CreateClientFormState> {
  const rawInput = {
    fullName: readFormDataEntry(formData, "fullName"),
    companyName: readFormDataEntry(formData, "companyName"),
    email: readFormDataEntry(formData, "email"),
    phone: readFormDataEntry(formData, "phone"),
    notes: readFormDataEntry(formData, "notes"),
    loginEnabled: formData.get("loginEnabled") === "on",
    username: readFormDataEntry(formData, "username"),
    password: readFormDataEntry(formData, "password"),
  };

  const parsed = createClientSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Fix the highlighted client details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      conflicts: [],
      values: extractValues(rawInput),
    };
  }

  const context = await requireActiveBusiness();
  const normalized = normalizeClientData(parsed.data);
  const conflicts = await findDuplicateConflicts(context.businessId, normalized);

  if (conflicts.length > 0) {
    return {
      status: "error",
      message: "Resolve the duplicate client details before creating this record.",
      fieldErrors: mapConflictsToFieldErrors(conflicts),
      conflicts,
      values: extractValues(rawInput),
    };
  }

  try {
    await createClientForBusiness(context, parsed.data);
  } catch (error) {
    if (error instanceof DuplicateClientConflictError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: mapConflictsToFieldErrors(error.conflicts),
        conflicts: error.conflicts,
        values: extractValues(rawInput),
      };
    }

    throw error;
  }

  revalidatePath("/clients");
  revalidatePath("/clients/new");

  return {
    status: "success",
    message: "Client saved.",
    fieldErrors: {},
    conflicts: [],
    values: initialCreateClientFormState.values,
  };
}
