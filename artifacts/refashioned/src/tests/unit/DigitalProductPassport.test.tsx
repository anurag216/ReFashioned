import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DigitalProductPassport } from "../../pages/DigitalProductPassport";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), role: "admin" }));
vi.mock("wouter", () => ({ useSearch: () => "?productId=93000000-0000-0000-0000-000000000001" }));
vi.mock("../../lib/auth/usePermissions", () => ({ usePermissions: () => ({ isAdmin: mocks.role === "admin" }) }));
vi.mock("../../lib/supabaseClient", () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));

const slug = "a".repeat(64);
const preview = { schema_version: 2 as const, brand: { name: "Published Brand" }, product: { name: "Real Product", identifier: "REAL" }, materials: [], impact: {}, lifecycle: [], certifications: [] };
const state = (changes = false, published = false) => [{ public_slug: slug, is_published: published, published_at: published ? "2026-08-08" : null, payload_generated_at: "2026-08-08", stored_payload_hash: "x", current_payload_hash: changes ? "y" : "x", has_unpublished_changes: changes }];
function setupData(changes = false, published = false) {
  mocks.from.mockImplementation((table: string) => {
    const chain = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), order: vi.fn() };
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain);
    chain.maybeSingle.mockResolvedValue({ data: table === "products" ? { id: "93000000-0000-0000-0000-000000000001", name: "Real Product", sku: "REAL", season: null } : null });
    chain.order.mockResolvedValue({ data: [] }); return chain;
  });
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === "get_product_passport_preview") return { data: preview, error: null };
    if (name === "get_product_passport_publication_state") return { data: state(changes, published), error: null };
    if (name === "publish_product_passport") return { data: [{ public_slug: slug }], error: null };
    if (name === "rotate_product_passport_slug") return { data: "b".repeat(64), error: null };
    if (name === "get_public_product_passport") return { data: { schema_version: 2, published_at: "2026-08-08", payload_generated_at: "2026-08-08", payload: preview }, error: null };
    return { data: null, error: null };
  });
}

describe("DigitalProductPassport publication controls", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.role = "admin"; vi.spyOn(window, "confirm").mockReturnValue(true); setupData(); });
  it("shows controls only to admins and renders the real lifecycle empty state", async () => {
    const { unmount } = render(<DigitalProductPassport onBack={vi.fn()} />);
    expect(await screen.findByText("Publish Passport")).toBeInTheDocument();
    expect(screen.getByText("Not publicly available")).toBeInTheDocument();
    expect(screen.queryByText("EcoFibers Cooperative Ltd.")).not.toBeInTheDocument(); unmount();
    mocks.role = "manager"; setupData(); render(<DigitalProductPassport onBack={vi.fn()} />);
    await screen.findByText("Real Product"); expect(screen.queryByText("Publish Passport")).not.toBeInTheDocument();
  });
  it("publishes through the RPC and refreshes publication state", async () => {
    render(<DigitalProductPassport onBack={vi.fn()} />); fireEvent.click(await screen.findByText("Publish Passport"));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("publish_product_passport", { p_product_id: expect.any(String) }));
    expect(mocks.rpc.mock.calls.filter(c => c[0] === "get_product_passport_publication_state").length).toBeGreaterThan(1);
  });
  it("uses RPC dirty state to emphasize republishing", async () => {
    vi.clearAllMocks(); setupData(true, true); render(<DigitalProductPassport onBack={vi.fn()} />);
    expect(await screen.findByText("Internal data has changed. The public link still serves the published snapshot until an admin publishes updates.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Publish updates")); await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("publish_product_passport", expect.anything()));
  });
  it("shares the returned slug and never the product UUID", async () => {
    vi.clearAllMocks(); setupData(false, true); render(<DigitalProductPassport onBack={vi.fn()} />);
    fireEvent.click(await screen.findByText("Show QR code"));
    expect(await screen.findByText(new RegExp(`/p/${slug}`))).toBeInTheDocument();
    expect(screen.queryByText(/\/p\/93000000-/)).not.toBeInTheDocument();
  });
  it("unpublishes and rotates only through RPCs", async () => {
    vi.clearAllMocks(); setupData(false, true); render(<DigitalProductPassport onBack={vi.fn()} />);
    fireEvent.click(await screen.findByText("Unpublish")); await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("unpublish_product_passport", expect.anything()));
    fireEvent.click(screen.getByText("Rotate public link")); await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("rotate_product_passport_slug", expect.anything()));
  });
});
