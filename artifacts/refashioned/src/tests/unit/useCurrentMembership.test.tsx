import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentMembership } from "../../lib/auth/useCurrentMembership";

const { eq } = vi.hoisted(() => ({ eq: vi.fn() }));
vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
  },
}));

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

describe("useCurrentMembership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["admin", "manager", "viewer"] as const)("returns a single %s membership", async role => {
    eq.mockResolvedValue({ data: [{ id: "member-a", organization_id: "org-a", role }], error: null });
    const { result } = renderHook(() => useCurrentMembership("user-a"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.role).toBe(role);
  });

  it("returns null for zero memberships", async () => {
    eq.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useCurrentMembership("user-a"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("surfaces multiple memberships as an unsupported state", async () => {
    eq.mockResolvedValue({ data: [
      { id: "one", organization_id: "org-a", role: "admin" },
      { id: "two", organization_id: "org-b", role: "viewer" },
    ], error: null });
    const { result } = renderHook(() => useCurrentMembership("user-a"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Multiple organization memberships");
  });

  it("does not expose User A membership while User B is resolving", async () => {
    let resolveUserB!: (value: { data: never[]; error: null }) => void;
    const userBResult = new Promise<{ data: never[]; error: null }>(resolve => { resolveUserB = resolve; });
    eq.mockImplementation((_column: string, userId: string) => userId === "user-a"
      ? Promise.resolve({ data: [{ id: "member-a", organization_id: "org-a", role: "admin" }], error: null })
      : userBResult);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const scopedWrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, rerender } = renderHook(({ userId }) => useCurrentMembership(userId), {
      initialProps: { userId: "user-a" as string | null },
      wrapper: scopedWrapper,
    });
    await waitFor(() => expect(result.current.data?.organization_id).toBe("org-a"));

    rerender({ userId: "user-b" });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);

    resolveUserB({ data: [], error: null });
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});
