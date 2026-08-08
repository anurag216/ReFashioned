import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, createSignedUrl } = vi.hoisted(() => ({ rpc: vi.fn(), createSignedUrl: vi.fn() }));
vi.mock("../../lib/supabaseClient", () => ({
  supabase: { rpc, storage: { from: vi.fn(() => ({ createSignedUrl })) } },
}));
import { SecureDocumentLink } from "../../components/ui/SecureDocumentLink";

describe("SecureDocumentLink", () => {
  beforeEach(() => { vi.restoreAllMocks(); rpc.mockReset(); createSignedUrl.mockReset(); vi.spyOn(window, "open").mockImplementation(() => null); });
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
  it("handles authorization errors without signing", async () => {
    rpc.mockResolvedValue({data:null,error:{message:"denied"}});
    render(<SecureDocumentLink evidenceId="forbidden"/>); fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toBeInTheDocument(); expect(createSignedUrl).not.toHaveBeenCalled();
  });
  it("handles signing errors without opening a window", async () => {
    rpc.mockResolvedValue({data:[{bucket_id:"compliance_docs",storage_path:"secret.pdf",original_filename:"safe.pdf",mime_type:"application/pdf"}],error:null});
    createSignedUrl.mockResolvedValue({data:null,error:{message:"failed"}});
    render(<SecureDocumentLink evidenceId="e1"/>); fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be opened"); expect(window.open).not.toHaveBeenCalled();
  });
  it("prevents concurrent double-click signing and never persists or logs URLs", async () => {
    let resolve!: (value:unknown)=>void;
    rpc.mockReturnValue(new Promise(r=>{resolve=r;}));
    const local=vi.spyOn(Storage.prototype,"setItem"); const log=vi.spyOn(console,"log");
    render(<SecureDocumentLink evidenceId="e1"/>); const button=screen.getByRole("button"); fireEvent.click(button); fireEvent.click(button);
    expect(rpc).toHaveBeenCalledTimes(1);
    resolve({data:[{bucket_id:"private-bucket",storage_path:"raw-secret.pdf",original_filename:"safe.pdf",mime_type:"application/pdf"}],error:null});
    createSignedUrl.mockResolvedValue({data:{signedUrl:"https://signed.example/private"},error:null});
    await waitFor(()=>expect(createSignedUrl).toHaveBeenCalled());
    expect(createSignedUrl).toHaveBeenCalledWith("raw-secret.pdf",60,{download:"safe.pdf"});
    expect(local).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalledWith(expect.stringContaining("signed.example"));
    expect(screen.queryByText("raw-secret.pdf")).not.toBeInTheDocument();
  });
});
