import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentMembership } from "../../lib/auth/useCurrentMembership";

const { getUser, eq } = vi.hoisted(() => ({ getUser: vi.fn(), eq: vi.fn() }));
vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: { getUser },
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
  },
}));

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

describe("useCurrentMembership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "user-a" } } });
  });

  it.each(["admin", "manager", "viewer"] as const)("returns a single %s membership", async role => {
    eq.mockResolvedValue({ data: [{ id: "member-a", organization_id: "org-a", role }], error: null });
    const { result } = renderHook(() => useCurrentMembership(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.role).toBe(role);
  });

  it("returns null for zero memberships", async () => {
    eq.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useCurrentMembership(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("surfaces multiple memberships as an unsupported state", async () => {
    eq.mockResolvedValue({ data: [
      { id: "one", organization_id: "org-a", role: "admin" },
      { id: "two", organization_id: "org-b", role: "viewer" },
    ], error: null });
    const { result } = renderHook(() => useCurrentMembership(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Multiple organization memberships");
  });
});
