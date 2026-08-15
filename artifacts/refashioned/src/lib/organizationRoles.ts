export const ORGANIZATION_ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  viewer: "Viewer",
} as const;

export type OrganizationRole = keyof typeof ORGANIZATION_ROLE_LABELS;

export function formatOrganizationRole(role: string | null): string {
  if (!role) return "";
  return role in ORGANIZATION_ROLE_LABELS
    ? ORGANIZATION_ROLE_LABELS[role as OrganizationRole]
    : role;
}
