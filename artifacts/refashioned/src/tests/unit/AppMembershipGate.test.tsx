import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import App from "../../App";

vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

const { useCurrentMembership, useSupplierAccess, session, authCallbacks } = vi.hoisted(() => ({
  useCurrentMembership: vi.fn(),
  useSupplierAccess: vi.fn(),
  session: { user: { id: "user-a", email: "user@example.test" } } as Session,
  authCallbacks: { change: undefined as undefined | ((event: string, session: Session | null) => void) },
}));

vi.mock("../../lib/auth/useCurrentMembership", () => ({ useCurrentMembership }));
vi.mock("../../lib/auth/useSupplierAccess", () => ({
  useSupplierAccess,
}));
vi.mock("../../lib/api/useOrg", () => ({
  useOrg: () => ({ data: { id: "org-a", name: "Tenant A" }, isLoading: false, error: null }),
}));
vi.mock("../../pages/Dashboard", () => ({ Dashboard: () => <div>Brand dashboard</div> }));
vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
      onAuthStateChange: vi.fn((callback) => {
        authCallbacks.change = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signOut: vi.fn(),
    },
  },
}));

function renderApp() {
  const queryClient = new QueryClient();
  return { queryClient, ...render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  ) };
}

describe("application membership gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSupplierAccess.mockReturnValue({ isLoading: false, data: null, error: null });
    window.history.replaceState({}, "", "/");
  });

  it("blocks while membership is loading", async () => {
    useCurrentMembership.mockReturnValue({ isLoading: true, data: undefined, error: null });
    renderApp();
    await waitFor(() => expect(useCurrentMembership).toHaveBeenCalledWith("user-a"));
    expect(screen.queryByText(/Complete Setup/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Signed in/i)).not.toBeInTheDocument();
  });

  it("shows onboarding only for a confirmed zero-membership result", async () => {
    useCurrentMembership.mockReturnValue({ isLoading: false, data: null, error: null });
    renderApp();
    expect(await screen.findByRole("button", { name: "Complete Setup" })).toBeInTheDocument();
  });

  it("enters the application for exactly one membership", async () => {
    useCurrentMembership.mockReturnValue({
      isLoading: false,
      data: { id: "member-a", organization_id: "org-a", role: "viewer" },
      error: null,
    });
    renderApp();
    expect(await screen.findByText("Signed in")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete Setup" })).not.toBeInTheDocument();
  });

  it("enters only the supplier workspace for a supplier identity", async () => {
    useCurrentMembership.mockReturnValue({ isLoading: false, data: null, error: null });
    useSupplierAccess.mockReturnValue({ isLoading: false, data: { supplier_name: "Mill", organization_name: "Brand" }, error: null });
    renderApp();
    expect(await screen.findByText("Supplier access active")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete Setup" })).not.toBeInTheDocument();
    expect(screen.queryByText("Supplier Portal")).not.toBeInTheDocument();
  });

  it("blocks conflicting internal and supplier identities", async () => {
    useCurrentMembership.mockReturnValue({ isLoading: false, data: { id: "m", organization_id: "o", role: "viewer" }, error: null });
    useSupplierAccess.mockReturnValue({ isLoading: false, data: { supplier_name: "Mill", organization_name: "Brand" }, error: null });
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent(/conflicting/i);
    expect(screen.queryByText("Signed in")).not.toBeInTheDocument();
  });

  it("blocks a multiple-membership error instead of entering onboarding", async () => {
    useCurrentMembership.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new Error("Multiple organization memberships are not supported yet."),
    });
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent(/contact support/i);
    expect(screen.queryByRole("button", { name: "Complete Setup" })).not.toBeInTheDocument();
    expect(screen.queryByText("Signed in")).not.toBeInTheDocument();
  });

  it("blocks other membership-query failures with support guidance", async () => {
    useCurrentMembership.mockReturnValue({ isLoading: false, data: undefined, error: new Error("network") });
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent(/contact support/i);
  });

  it("cannot enter with User A's cached membership while User B resolves", async () => {
    useCurrentMembership.mockImplementation((userId: string | null) => userId === "user-a"
      ? { isLoading: false, data: { id: "member-a", organization_id: "org-a", role: "admin" }, error: null }
      : { isLoading: true, data: undefined, error: null });
    renderApp();
    expect(await screen.findByText("Signed in")).toBeInTheDocument();

    const userB = { user: { id: "user-b", email: "user-b@example.test" } } as Session;
    act(() => authCallbacks.change?.("SIGNED_IN", userB));

    await waitFor(() => expect(useCurrentMembership).toHaveBeenLastCalledWith("user-b"));
    expect(screen.queryByText("Signed in")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete Setup" })).not.toBeInTheDocument();
  });

  it("does not reuse User A's supplier cache when switching to User B", async () => {
    useCurrentMembership.mockReturnValue({ isLoading: false, data: null, error: null });
    useSupplierAccess.mockImplementation((userId: string | null) => userId === "user-a"
      ? { isLoading: false, data: { supplier_name: "Mill", organization_name: "Brand" }, error: null }
      : { isLoading: true, data: undefined, error: null });
    renderApp();
    expect(await screen.findByText("Supplier access active")).toBeInTheDocument();
    act(() => authCallbacks.change?.("SIGNED_IN", { user: { id: "user-b", email: "b@test.invalid" } } as Session));
    await waitFor(() => expect(useSupplierAccess).toHaveBeenLastCalledWith("user-b"));
    expect(screen.queryByText("Supplier access active")).not.toBeInTheDocument();
  });

  it("clears auth-scoped query state for non-button sign-outs", async () => {
    useCurrentMembership.mockReturnValue({ isLoading: false, data: null, error: null });
    const { queryClient } = renderApp();
    const clear = vi.spyOn(queryClient, "clear");
    await waitFor(() => expect(authCallbacks.change).toBeTypeOf("function"));

    act(() => authCallbacks.change?.("SIGNED_OUT", null));

    expect(clear).toHaveBeenCalledOnce();
  });
});
