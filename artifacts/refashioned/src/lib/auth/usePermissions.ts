import { useCurrentMembership } from "./useCurrentMembership";
import type { OrganizationRole } from "./useCurrentMembership";

export interface Permissions {
  role: OrganizationRole | null;
  isAdmin: boolean;
  canEdit: boolean;
  isViewer: boolean;
  loading: boolean;
  error: Error | null;
}

export function derivePermissions(role: OrganizationRole | null) {
  return {
    role,
    isAdmin: role === "admin",
    canEdit: role === "admin" || role === "manager",
    isViewer: role === "viewer",
  };
}

export function usePermissions(): Permissions {
  const membership = useCurrentMembership();
  return {
    ...derivePermissions(membership.data?.role ?? null),
    loading: membership.isLoading,
    error: membership.error,
  };
}
