import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import App from "../../App";

const { useCurrentMembership, session } = vi.hoisted(() => ({
  useCurrentMembership: vi.fn(),
  session: { user: { id: "user-a", email: "user@example.test" } } as Session,
}));

vi.mock("../../lib/auth/useCurrentMembership", () => ({ useCurrentMembership }));
vi.mock("../../lib/api/useOrg", () => ({
  useOrg: () => ({ data: { id: "org-a", name: "Tenant A" }, isLoading: false, error: null }),
}));
vi.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
  },
}));

function renderApp() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>,
  );
}

describe("application membership gate", () => {
  beforeEach(() => { vi.clearAllMocks(); window.history.replaceState({}, "", "/"); });

  it("blocks while membership is loading", async () => {
    useCurrentMembership.mockReturnValue({ isLoading: true, data: undefined, error: null });
    renderApp();
    await waitFor(() => expect(useCurrentMembership).toHaveBeenCalledWith(true));
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
});
