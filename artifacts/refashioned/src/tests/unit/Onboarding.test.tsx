import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Onboarding } from "../../pages/Onboarding";
import type { Session } from "@supabase/supabase-js";

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("../../lib/supabaseClient", () => ({ supabase: { rpc, from } }));

const session = { user: { id: "user-a", email: "user@example.test" } } as Session;
function renderOnboarding(onComplete = vi.fn()) {
  const client = new QueryClient();
  return { onComplete, ...render(
    <QueryClientProvider client={client}><Onboarding session={session} onComplete={onComplete} /></QueryClientProvider>,
  ) };
}

describe("Onboarding", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it("creates the organization atomically through the RPC", async () => {
    rpc.mockResolvedValue({ data: "org-a", error: null });
    const { onComplete } = renderOnboarding();
    fireEvent.change(screen.getByPlaceholderText(/Patagonia/), { target: { value: " Acme " } });
    fireEvent.click(screen.getByRole("button", { name: "Complete Setup" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith("create_organization_with_admin", { organization_name: "Acme" });
    expect(from).not.toHaveBeenCalled();
  });

  it("shows a safe message when the RPC fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "internal relation detail" } });
    const { onComplete } = renderOnboarding();
    fireEvent.change(screen.getByPlaceholderText(/Patagonia/), { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete Setup" }));
    expect(await screen.findByText(/couldn't create your organization/i)).toBeInTheDocument();
    expect(screen.queryByText(/internal relation detail/i)).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("defers supplier invitation redemption without creating a brand", async () => {
    localStorage.setItem("refashioned_invite_token", "token");
    renderOnboarding();
    fireEvent.change(screen.getByPlaceholderText(/Patagonia/), { target: { value: "Wrong brand" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete Setup" }));
    expect(await screen.findByText(/Supplier invitations are not available/i)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
