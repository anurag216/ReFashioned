import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Join } from "../../pages/Join";

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("../../lib/supabaseClient", () => ({ supabase: {
  from, rpc,
  auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
} }));

describe("Join", () => {
  it("loads only safe RPC metadata and never reads the invitation table", async () => {
    rpc.mockResolvedValue({ data: [{ invitation_state: "usable", organization_name: "Tenant", supplier_name: "Mill", masked_email: "s***@example.test", expiration: "2030-01-01" }], error: null });
    window.history.replaceState({}, "", "/join?token=" + "a".repeat(64)); render(<Join />);
    expect(await screen.findByText("Join Tenant")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("get_supplier_invite_metadata", { p_token: "a".repeat(64) }); expect(from).not.toHaveBeenCalled();
  });
  it("handles an expired invitation without exposing names", async () => {
    rpc.mockResolvedValue({ data: [{ invitation_state: "expired", organization_name: null, supplier_name: null, masked_email: null, expiration: "2020-01-01" }], error: null });
    window.history.replaceState({}, "", "/join?token=" + "b".repeat(64)); render(<Join />);
    await waitFor(() => expect(screen.getByText("Invitation expired")).toBeInTheDocument()); expect(screen.queryByText("Tenant")).not.toBeInTheDocument();
  });
});
