import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicPassport } from "../../pages/PublicPassport";

const { rpc, from, storage } = vi.hoisted(() => ({
  rpc: vi.fn(), from: vi.fn(), storage: { from: vi.fn() },
}));
vi.mock("../../lib/supabaseClient", () => ({ supabase: { rpc, from, storage } }));

const basePayload = {
  schema_version: 1 as const,
  brand: { name: "Published Brand" },
  product: { name: "Published Shirt", identifier: "SKU-1" },
  materials: [{ name: "Cotton", percentage: 100 }],
  lifecycle: [{ order: 1, name: "Sourcing", summary: "Public summary", co2_kg: 0, water_l: 20, certifications: [{ name: "Stage Certificate" }] }],
};
const response = (payload: object) => ({ schema_version: 1, published_at: "2026-08-08T12:00:00Z", payload_generated_at: "2026-08-08T12:00:00Z", payload });

describe("PublicPassport", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("uses exactly one projection RPC and no table or storage API", async () => {
    rpc.mockResolvedValue({ data: response({ ...basePayload, impact: { total_co2_kg: 0, total_water_l: 20 } }), error: null });
    render(<PublicPassport publicSlug={"a".repeat(64)} />);
    expect(await screen.findByText("Published Shirt")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_public_product_passport", { p_public_slug: "a".repeat(64) });
    expect(from).not.toHaveBeenCalled(); expect(storage.from).not.toHaveBeenCalled();
  });
  it.each(["bad", "00000000-0000-0000-0000-000000000001", "f".repeat(64)])("renders the same unavailable result for %s", async slug => {
    rpc.mockResolvedValue({ data: null, error: null });
    render(<PublicPassport publicSlug={slug} />);
    expect(await screen.findByRole("heading", { name: "Passport unavailable" })).toBeInTheDocument();
  });
  it("renders only snapshot values and retains a real numeric zero", async () => {
    rpc.mockResolvedValue({ data: response({ ...basePayload, impact: { total_co2_kg: 0 } }), error: null });
    render(<PublicPassport publicSlug={"a".repeat(64)} />);
    expect(await screen.findByText("Published Brand")).toBeInTheDocument();
    expect(screen.getByText("0 kg")).toBeInTheDocument();
    expect(screen.queryByText("Total water use")).not.toBeInTheDocument();
    expect(screen.getByText("Stage Certificate")).toBeInTheDocument();
    for (const forbidden of ["Supplier Secret", "Exact Location", "EcoThread", "Industry Avg"]) expect(screen.queryByText(forbidden)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("omits impact cards when impact is unavailable", async () => {
    rpc.mockResolvedValue({ data: response(basePayload), error: null });
    render(<PublicPassport publicSlug={"a".repeat(64)} />);
    await screen.findByText("Published Shirt");
    expect(screen.queryByText("Total CO₂ impact")).not.toBeInTheDocument();
    expect(screen.queryByText("Total water use")).not.toBeInTheDocument();
  });
  it("renders a neutral lifecycle empty state", async () => {
    rpc.mockResolvedValue({ data: response({ ...basePayload, lifecycle: [] }), error: null });
    render(<PublicPassport publicSlug={"a".repeat(64)} />);
    expect(await screen.findByText("Not publicly available")).toBeInTheDocument();
  });
  it("uses the generic unavailable screen for RPC errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "not found" } });
    render(<PublicPassport publicSlug={"a".repeat(64)} />);
    await waitFor(() => expect(screen.getByText("Passport unavailable")).toBeInTheDocument());
  });
});
