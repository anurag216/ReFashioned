import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupplierWorkspace } from "../../pages/SupplierWorkspace";

const mocks = vi.hoisted(() => ({ rpcImplementation: vi.fn(), upload: vi.fn(), signOut: vi.fn() }));
vi.mock("../../lib/supabaseClient", () => {
  const supabaseMock = {
    rest: {},
    rpc: vi.fn(function (this: unknown, name: string, args?: unknown) {
      if (this !== supabaseMock) throw new TypeError("Supabase rpc called without client receiver");
      return mocks.rpcImplementation(name, args);
    }),
    storage: { from: vi.fn(() => ({ upload: mocks.upload })) },
  };
  return { supabase: supabaseMock };
});
vi.mock("../../components/ui/SecureDocumentLink", () => ({ SecureDocumentLink: () => <span>Document</span> }));

const task = { lifecycle_stage_id: "stage-secret", stage_name: "E2E Material Production", product_name: "Tenant A Product", document_requirement: "Evidence document", evidence_status: null, evidence_id: null, rejection_reason: null };
const props = { access: { supplier_name: "Safe Mill", organization_name: "Brand" }, email: "supplier@example.test", onSignOut: mocks.signOut };

describe("Supplier Workspace", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.rpcImplementation.mockResolvedValue({ data: [task], error: null }); });

  it("loads active supplier tasks", async () => {
    render(<SupplierWorkspace {...props} />);
    expect(await screen.findByText(/Tenant A Product — E2E Material Production/)).toBeInTheDocument();
    expect(screen.getByText("Evidence document")).toBeInTheDocument();
    expect(screen.getByText("Status: Not submitted")).toBeInTheDocument();
    expect(mocks.rpcImplementation).toHaveBeenCalledWith("get_my_supplier_evidence_tasks", undefined);
    expect(screen.getByText("Supplier access active")).toBeInTheDocument();
  });

  it("keeps the complete evidence upload RPC chain receiver-bound", async () => {
    let taskLoads = 0;
    mocks.upload.mockResolvedValue({ error: null });
    mocks.rpcImplementation.mockImplementation((name: string) => {
      if (name === "get_my_supplier_evidence_tasks") {
        taskLoads += 1;
        return Promise.resolve({ data: [taskLoads === 1 ? task : { ...task, evidence_status: "quarantined", scan_status: "pending", evidence_id: "evidence-1" }], error: null });
      }
      if (name === "create_evidence_upload_intent") return Promise.resolve({
        data: [{ evidence_id: "evidence-1", bucket_id: "compliance_docs", storage_path: "private/evidence-1", upload_expires_at: "2030-01-01" }],
        error: null,
      });
      if (name === "finalize_evidence_upload") return Promise.resolve({ data: null, error: null });
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const { container } = render(<SupplierWorkspace {...props} />);
    await screen.findByText(/Tenant A Product/);
    const file = new File(["pdf"], "proof.pdf", { type: "application/pdf" });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });

    await screen.findByText("Status: Security scan pending");
    expect(mocks.rpcImplementation).toHaveBeenCalledWith("create_evidence_upload_intent", {
      p_lifecycle_stage_id: "stage-secret",
      p_document_type: "certificate",
      p_original_filename: "proof.pdf",
      p_mime_type: "application/pdf",
      p_size_bytes: 3,
    });
    expect(mocks.upload).toHaveBeenCalledWith("private/evidence-1", file, { upsert: false, contentType: "application/pdf" });
    expect(mocks.rpcImplementation).toHaveBeenCalledWith("finalize_evidence_upload", { p_evidence_id: "evidence-1" });
    expect(mocks.rpcImplementation).toHaveBeenCalledWith("get_my_supplier_evidence_tasks", undefined);
  });

  it("moves a revoked task session to the disabled state with sign-out", async () => {
    mocks.rpcImplementation.mockResolvedValue({ data: null, error: { message: "supplier portal access is not active" } });
    render(<SupplierWorkspace {...props} />);
    expect(await screen.findByText("Your supplier portal access is no longer active.")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("stage-secret");
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(mocks.signOut).toHaveBeenCalled();
  });

  it("stops before Storage when upload authorization was revoked", async () => {
    mocks.rpcImplementation.mockImplementation((name: string) => Promise.resolve(name === "get_my_supplier_evidence_tasks"
      ? { data: [task], error: null }
      : { data: null, error: { message: "not authorized" } }));
    const { container } = render(<SupplierWorkspace {...props} />);
    await screen.findByText(/Tenant A Product/);
    const input = container.querySelector('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["pdf"], "proof.pdf", { type: "application/pdf" })] } });
    expect(await screen.findByText("Your supplier portal access is no longer active.")).toBeInTheDocument();
    await waitFor(() => expect(mocks.upload).not.toHaveBeenCalled());
  });

  it("moves to revoked state when finalization authorization is lost", async () => {
    mocks.upload.mockResolvedValue({ error: null });
    mocks.rpcImplementation.mockImplementation((name: string) => {
      if (name === "get_my_supplier_evidence_tasks") return Promise.resolve({ data: [task], error: null });
      if (name === "create_evidence_upload_intent") return Promise.resolve({ data: [{ evidence_id: "evidence-secret", bucket_id: "compliance_docs", storage_path: "private-secret", upload_expires_at: "2030-01-01" }], error: null });
      return Promise.resolve({ data: null, error: { message: "authorization is no longer valid" } });
    });
    const { container } = render(<SupplierWorkspace {...props} />); await screen.findByText(/Tenant A Product/);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["pdf"], "proof.pdf", { type: "application/pdf" })] } });
    expect(await screen.findByText("Your supplier portal access is no longer active.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("stage-secret");
    expect(document.body).not.toHaveTextContent("evidence-secret");
    expect(document.body).not.toHaveTextContent("private-secret");
  });
});
