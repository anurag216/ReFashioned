import { CheckCircle2, LogOut } from "lucide-react";
import type { SupplierAccess } from "../lib/auth/useSupplierAccess";

export function SupplierWorkspace({ access, email, onSignOut }: { access: SupplierAccess; email: string; onSignOut: () => void }) {
  return <main className="min-h-screen bg-emerald-950 p-6 flex items-center justify-center">
    <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
      <h1 className="mt-4 text-2xl font-bold">Supplier access active</h1>
      <p className="mt-2 text-muted-foreground">You are securely connected to the inviting organization.</p>
      <dl className="mt-6 space-y-3 text-sm">
        <div><dt className="text-muted-foreground">Supplier</dt><dd className="font-semibold">{access.supplier_name}</dd></div>
        <div><dt className="text-muted-foreground">Inviting organization</dt><dd className="font-semibold">{access.organization_name}</dd></div>
        <div><dt className="text-muted-foreground">Signed in as</dt><dd className="font-semibold">{email}</dd></div>
      </dl>
      <p className="mt-6 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Supplier data features will appear here after supplier-specific access policies are available.</p>
      <button onClick={onSignOut} className="mt-6 flex items-center gap-2 rounded-md border px-4 py-2 text-sm"><LogOut className="h-4 w-4" />Sign out</button>
    </section>
  </main>;
}
