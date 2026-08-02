import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePermissions } from "../../lib/auth/usePermissions";

const { mockedGetUser, mockedMaybeSingle } = vi.hoisted(() => ({
  mockedGetUser: vi.fn(),
  mockedMaybeSingle: vi.fn(),
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: mockedGetUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: mockedMaybeSingle,
          })),
        })),
      })),
    })),
  },
}));

describe("usePermissions", () => {
  beforeEach(() => {
    mockedGetUser.mockResolvedValue({ data: { user: { id: "profile-123" } } });
    mockedMaybeSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns admin permissions when the organization member role is admin", async () => {
    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.role).toBe("admin");
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canEdit).toBe(true);
  });
});
