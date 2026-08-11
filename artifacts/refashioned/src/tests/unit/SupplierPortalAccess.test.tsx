import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupplierPortal } from "../../pages/SupplierPortal";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), role: "admin", refetch: vi.fn() }));
vi.mock("../../lib/supabaseClient", () => ({ supabase: { rpc: mocks.rpc, auth: { getUser: vi.fn() }, from: vi.fn() } }));
vi.mock("../../lib/auth/AuthUserContext", () => ({ useAuthUserId: () => "user-1" }));
vi.mock("../../lib/auth/useCurrentMembership", () => ({ useCurrentMembership: () => ({ data: { role: mocks.role } }) }));
vi.mock("../../lib/api/useSuppliers", () => ({ useSuppliers: () => ({
  data: [{ id: "supplier-1", name: "Safe Mill", contact: "—", location: "India", tier: 1, status: "active", stage: "Mill", certs: [], dataCompleteness: 20, lastActivity: "Today" }],
  isLoading: false, error: null, refetch: mocks.refetch,
}) }));

const pending = { supplier_contact_id: null, contact_name: null, contact_email: "pending@example.test", active_access_membership_id: null, access_state: "inactive", pending_invitation_id: "invite-secret-id", invitation_state: "pending", invitation_expires_at: "2030-01-01T00:00:00Z" };
const active = { ...pending, supplier_contact_id: "contact-secret-id", contact_name: "Alice", contact_email: "alice@example.test", active_access_membership_id: "access-secret-id", access_state: "active", pending_invitation_id: null, invitation_state: "none", invitation_expires_at: null };

describe("Supplier Portal access administration", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.role = "admin"; mocks.rpc.mockResolvedValue({ data: [pending, active], error: null }); });

  it("loads and safely displays active access and contactless pending invitations", async () => {
    render(<SupplierPortal />);
    fireEvent.click(screen.getByLabelText("Manage portal access for Safe Mill"));
    expect(await screen.findByText("pending@example.test")).toBeInTheDocument();
    expect(screen.getByText("Access: active")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("get_supplier_access_admin", { p_supplier_id: "supplier-1" });
    expect(screen.getByRole("button", { name: "Revoke invitation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke access" })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("invite-secret-id");
    expect(document.body).not.toHaveTextContent("access-secret-id");
  });

  it("requires a reason, invokes revocation, and refreshes state", async () => {
    render(<SupplierPortal />); fireEvent.click(screen.getByLabelText("Manage portal access for Safe Mill"));
    fireEvent.click(await screen.findByRole("button", { name: "Revoke access" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("meaningful revocation reason");
    fireEvent.change(screen.getByLabelText("Access revocation reason"), { target: { value: "Contract ended" } });
    fireEvent.click(screen.getByRole("button", { name: "Revoke access" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("revoke_supplier_access", { p_access_membership_id: "access-secret-id", p_reason: "Contract ended" }));
    await waitFor(() => expect(mocks.rpc.mock.calls.filter(call => call[0] === "get_supplier_access_admin")).toHaveLength(2));
  });

  it("revokes a pending invitation with the secured RPC", async () => {
    render(<SupplierPortal />); fireEvent.click(screen.getByLabelText("Manage portal access for Safe Mill"));
    fireEvent.click(await screen.findByRole("button", { name: "Revoke invitation" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("revoke_supplier_invite", { p_invitation_id: "invite-secret-id" }));
  });

  it("shows safe authorization errors without rendering sensitive identity data", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "profile 00000000-0000-0000-0000-000000000999 token_hash deadbeef" } });
    render(<SupplierPortal />); fireEvent.click(screen.getByLabelText("Manage portal access for Safe Mill"));
    expect(await screen.findByRole("alert")).toHaveTextContent("not authorized");
    expect(document.body).not.toHaveTextContent("00000000-0000-0000-0000-000000000999");
    expect(document.body).not.toHaveTextContent("deadbeef");
  });

  it("maps active-access invite errors and never persists the generated token", async () => {
    const localSpy = vi.spyOn(Storage.prototype, "setItem");
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "55000", message: "supplier contact already has active portal access" } });
    render(<SupplierPortal />); fireEvent.click(screen.getByTestId("button-invite-supplier"));
    fireEvent.change(screen.getByTestId("select-invite-supplier"), { target: { value: "supplier-1" } });
    fireEvent.change(screen.getByTestId("input-invite-email"), { target: { value: "alice@example.test" } });
    fireEvent.click(screen.getByTestId("button-send-invite"));
    expect(await screen.findByText("This supplier contact already has portal access.")).toBeInTheDocument();
    expect(localSpy).not.toHaveBeenCalled();
    localSpy.mockRestore();
  });

  it("keeps a generated magic-link token in transient component state only", async () => {
    const localSpy = vi.spyOn(window.localStorage, "setItem");
    const sessionSpy = vi.spyOn(window.sessionStorage, "setItem");
    mocks.rpc.mockResolvedValue({ data: [{ invitation_id: "inv", token: "one-time-token", expires_at: "2030-01-01T00:00:00Z" }], error: null });
    render(<SupplierPortal />); fireEvent.click(screen.getByTestId("button-invite-supplier"));
    fireEvent.change(screen.getByTestId("select-invite-supplier"), { target: { value: "supplier-1" } });
    fireEvent.change(screen.getByTestId("input-invite-email"), { target: { value: "alice@example.test" } });
    fireEvent.click(screen.getByTestId("button-send-invite"));
    expect(await screen.findByDisplayValue(/one-time-token/)).toBeInTheDocument();
    expect(localSpy).not.toHaveBeenCalled(); expect(sessionSpy).not.toHaveBeenCalled();
    localSpy.mockRestore(); sessionSpy.mockRestore();
  });

  it.each(["manager", "viewer"])("hides security mutations from a %s", async role => {
    mocks.role = role; render(<SupplierPortal />); fireEvent.click(screen.getByLabelText("Manage portal access for Safe Mill"));
    await screen.findByText("pending@example.test");
    expect(screen.queryByRole("button", { name: "Revoke invitation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke access" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-invite-supplier")).not.toBeInTheDocument();
  });
});
