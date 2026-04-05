export const APP_ROLES = ["ADMIN", "MANAGER", "STAFF", "CLIENT"] as const;

export type AppRole = (typeof APP_ROLES)[number];

const ROLE_WEIGHTS: Record<AppRole, number> = {
  ADMIN: 4,
  MANAGER: 3,
  STAFF: 2,
  CLIENT: 1,
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function hasMinimumRole(role: AppRole, minimumRole: AppRole): boolean {
  return ROLE_WEIGHTS[role] >= ROLE_WEIGHTS[minimumRole];
}

export function canManageBusiness(role: AppRole): boolean {
  return hasMinimumRole(role, "ADMIN");
}

export function canManageBilling(role: AppRole): boolean {
  return hasMinimumRole(role, "MANAGER");
}
