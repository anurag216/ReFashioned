import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Join } from "../../pages/Join";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), from: vi.fn(), getSession: vi.fn(), signIn: vi.fn(), signUp: vi.fn(),
}));
vi.mock("../../lib/supabaseClient", () => ({ supabase: {
  from: mocks.from, rpc: mocks.rpc,
  auth: {
    getSession: mocks.getSession,
    signInWithPassword: mocks.signIn,
    signUp: mocks.signUp,
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
} }));

const usable = { invitation_state: "usable", organization_name: "Tenant", supplier_name: "Mill", masked_email: "s***@example.test", expiration: "2030-01-01" };
function setToken(value = "a") { window.history.replaceState({}, "", "/join?token=" + value.repeat(64)); }

describe("Join", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.signIn.mockResolvedValue({ data: { session: {} }, error: null });
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("loads usable safe RPC metadata and never reads the table", async () => {
    mocks.rpc.mockResolvedValue({ data: [usable], error: null }); setToken(); render(<Join />);
    expect(await screen.findByText("Join Tenant")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("get_supplier_invite_metadata", { p_token: "a".repeat(64) });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("handles a missing token without making a metadata request", async () => {
    window.history.replaceState({}, "", "/join"); render(<Join />);
    expect(await screen.findByText("Invitation missing")).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each(["invalid", "expired", "revoked", "redeemed"])("handles the %s state without exposing names", async state => {
    mocks.rpc.mockResolvedValue({ data: [{ ...usable, invitation_state: state, organization_name: null, supplier_name: null, masked_email: null }], error: null });
    setToken(state[0]); render(<Join />);
    expect(await screen.findByText(`Invitation ${state}`)).toBeInTheDocument();
    expect(screen.queryByText("Tenant")).not.toBeInTheDocument();
  });

  it("preserves the token through password sign-in", async () => {
    mocks.rpc.mockResolvedValue({ data: [usable], error: null }); setToken(); render(<Join />);
    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "supplier@test.invalid" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalled());
    expect(window.location.search).toContain("token=" + "a".repeat(64));
  });

  it("preserves the token and return URL through sign-up", async () => {
    mocks.rpc.mockResolvedValue({ data: [usable], error: null }); setToken("b"); render(<Join />);
    fireEvent.click(await screen.findByRole("button", { name: "Create an account" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "supplier@test.invalid" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret1" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { emailRedirectTo: expect.stringContaining("token=" + "b".repeat(64)) } })));
  });

  it("shows a safe redemption error without consuming client state", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { email: "wrong@test.invalid" } } } });
    mocks.rpc.mockImplementation((name: string) => Promise.resolve(name === "redeem_supplier_invite"
      ? { data: null, error: { message: "sign in with the invited email address" } }
      : { data: [usable], error: null }));
    setToken(); render(<Join />);
    fireEvent.click(await screen.findByRole("button", { name: "Accept supplier invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/invited email/i);
    expect(window.location.search).toContain("token=");
  });
});
