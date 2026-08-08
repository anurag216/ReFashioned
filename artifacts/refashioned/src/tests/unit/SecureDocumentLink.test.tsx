import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, createSignedUrl } = vi.hoisted(() => ({ rpc: vi.fn(), createSignedUrl: vi.fn() }));
vi.mock("../../lib/supabaseClient", () => ({
  supabase: { rpc, storage: { from: vi.fn(() => ({ createSignedUrl })) } },
}));
import { SecureDocumentLink } from "../../components/ui/SecureDocumentLink";

describe("SecureDocumentLink", () => {
  beforeEach(() => { rpc.mockReset(); createSignedUrl.mockReset(); vi.spyOn(window, "open").mockImplementation(() => null); });
  it("authorizes and signs for 60 seconds only after a click", async () => {
    rpc.mockResolvedValue({ data: [{ bucket_id: "compliance_docs", storage_path: "opaque/internal/path.pdf", original_filename: "report.pdf", mime_type: "application/pdf" }], error: null });
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.example/temporary" }, error: null });
    render(<SecureDocumentLink evidenceId="evidence-1" />);
    expect(rpc).not.toHaveBeenCalled(); expect(createSignedUrl).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /view document/i }));
    await waitFor(() => expect(createSignedUrl).toHaveBeenCalledWith("opaque/internal/path.pdf", 60, { download: "report.pdf" }));
    expect(rpc).toHaveBeenCalledWith("get_evidence_download_target", { p_evidence_id: "evidence-1" });
    expect(screen.queryByText("opaque/internal/path.pdf")).not.toBeInTheDocument();
  });
  it("fails closed when authorization returns no target", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    render(<SecureDocumentLink evidenceId="forbidden" />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("not authorized");
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});
