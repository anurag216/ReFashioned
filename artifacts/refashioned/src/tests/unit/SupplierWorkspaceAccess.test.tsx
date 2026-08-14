import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupplierWorkspace } from "../../pages/SupplierWorkspace";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), upload: vi.fn(), signOut: vi.fn() }));
vi.mock("../../lib/supabaseClient", () => ({ supabase: {
  rpc: mocks.rpc,
  storage: { from: vi.fn(() => ({ upload: mocks.upload })) },
} }));
vi.mock("../../components/ui/SecureDocumentLink", () => ({ SecureDocumentLink: () => <span>Document</span> }));

const task = { lifecycle_stage_id: "stage-secret", stage_name: "Dyeing", product_name: "Shirt", document_requirement: "Evidence document", evidence_status: null, evidence_id: null, rejection_reason: null };
const props = { access: { supplier_name: "Safe Mill", organization_name: "Brand" }, email: "supplier@example.test", onSignOut: mocks.signOut };

describe("Supplier Workspace access revocation", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: [task], error: null }); });

  it("loads active supplier tasks", async () => {
    render(<SupplierWorkspace {...props} />);
    expect(await screen.findByText(/Shirt/)).toBeInTheDocument();
    expect(screen.getByText("Supplier access active")).toBeInTheDocument();
  });

  it("moves a revoked task session to the disabled state with sign-out", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "supplier portal access is not active" } });
    render(<SupplierWorkspace {...props} />);
    expect(await screen.findByText("Your supplier portal access is no longer active.")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("stage-secret");
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(mocks.signOut).toHaveBeenCalled();
  });

  it("stops before Storage when upload authorization was revoked", async () => {
    mocks.rpc.mockImplementation((name: string) => Promise.resolve(name === "get_my_supplier_evidence_tasks"
      ? { data: [task], error: null }
      : { data: null, error: { message: "not authorized" } }));
    const { container } = render(<SupplierWorkspace {...props} />);
    await screen.findByText(/Shirt/);
    const input = container.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["pdf"], "proof.pdf", { type: "application/pdf" })] } });
    expect(await screen.findByText("Your supplier portal access is no longer active.")).toBeInTheDocument();
    await waitFor(() => expect(mocks.upload).not.toHaveBeenCalled());
  });

  it("moves to revoked state when finalization authorization is lost", async () => {
    mocks.upload.mockResolvedValue({ error: null });
    mocks.rpc.mockImplementation((name: string) => {
      if (name === "get_my_supplier_evidence_tasks") return Promise.resolve({ data: [task], error: null });
      if (name === "create_evidence_upload_intent") return Promise.resolve({ data: [{ evidence_id: "evidence-secret", bucket_id: "compliance_docs", storage_path: "private-secret", upload_expires_at: "2030-01-01" }], error: null });
      return Promise.resolve({ data: null, error: { message: "authorization is no longer valid" } });
    });
    const { container } = render(<SupplierWorkspace {...props} />); await screen.findByText(/Shirt/);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["pdf"], "proof.pdf", { type: "application/pdf" })] } });
    expect(await screen.findByText("Your supplier portal access is no longer active.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("stage-secret");
    expect(document.body).not.toHaveTextContent("evidence-secret");
    expect(document.body).not.toHaveTextContent("private-secret");
  });
});
