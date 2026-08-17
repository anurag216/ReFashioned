import { lazy, Suspense, useState, useEffect } from "react";
import { Switch, Route, Link, Redirect, useLocation } from "wouter";
import {
  LayoutDashboard, GitBranch, Building2, Settings as SettingsIcon,
  Bell, Grid, ChevronDown, User, FileCheck, ClipboardList,
  Users, Calculator, Globe, LogOut, Package, CreditCard, ScrollText, Upload,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import LoginScreen from "./LoginScreen";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { useCurrentMembership } from "./lib/auth/useCurrentMembership";
import { useOrg } from "./lib/api/useOrg";
import { AuthUserProvider } from "./lib/auth/AuthUserContext";
import { useSupplierAccess } from "./lib/auth/useSupplierAccess";
import { SupplierWorkspace } from "./pages/SupplierWorkspace";

const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Traceability = lazy(() => import("./pages/Traceability").then(m => ({ default: m.Traceability })));
const SupplierPortal = lazy(() => import("./pages/SupplierPortal").then(m => ({ default: m.SupplierPortal })));
const DigitalProductPassport = lazy(() => import("./pages/DigitalProductPassport").then(m => ({ default: m.DigitalProductPassport })));
const BrandProfile = lazy(() => import("./pages/BrandProfile").then(m => ({ default: m.BrandProfile })));
const SettingsPage = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const CSRDReport = lazy(() => import("./pages/CSRDReport").then(m => ({ default: m.CSRDReport })));
const CarbonCalculator = lazy(() => import("./pages/CarbonCalculator").then(m => ({ default: m.CarbonCalculator })));
const RegulatoryRadar = lazy(() => import("./pages/RegulatoryRadar").then(m => ({ default: m.RegulatoryRadar })));
const NotFound = lazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));
const ProductCatalog = lazy(() => import("./pages/ProductCatalog").then(m => ({ default: m.ProductCatalog })));
const PublicPassport = lazy(() => import("./pages/PublicPassport").then(m => ({ default: m.PublicPassport })));
const Onboarding = lazy(() => import("./pages/Onboarding").then(m => ({ default: m.Onboarding })));
const Join = lazy(() => import("./pages/Join").then(m => ({ default: m.Join })));
const TeamJoin = lazy(() => import("./pages/TeamJoin").then(m => ({ default: m.TeamJoin })));
const Billing = lazy(() => import("./pages/Billing").then(m => ({ default: m.Billing })));
const AuditLogPage = lazy(() => import("./pages/AuditLog").then(m => ({ default: m.AuditLogPage })));
const DataImport = lazy(() => import("./pages/DataImport").then(m => ({ default: m.DataImport })));

function DarkSpinner({ fullScreen = false }: { fullScreen?: boolean }) {
  const inner = (
    <svg
      className="animate-spin w-8 h-8"
      style={{ color: "#6AE096" }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(152 53% 8%)" }}>
        {inner}
      </div>
    );
  }
  return (
    <div className="flex-1 flex items-center justify-center" style={{ minHeight: "40vh" }}>
      {inner}
    </div>
  );
}

function SidebarOrgBadge() {
  const { data: org } = useOrg();
  if (!org?.name) return null;
  return <span className="text-[10px] text-sidebar-foreground/50 truncate leading-tight">{org.name}</span>;
}

const navItems = [
  { path: "/dashboard",    label: "Dashboard",                icon: LayoutDashboard },
  { path: "/products",     label: "Products",                 icon: Package         },
  { path: "/import",       label: "Import Data",              icon: Upload          },
  { path: "/traceability", label: "Lifecycle Traceability",   icon: GitBranch       },
  { path: "/profile",      label: "Brand Profile",            icon: Building2       },
  { path: "/passport",     label: "Digital Product Passport", icon: FileCheck       },
  { path: "/reports/csrd", label: "CSRD Report",              icon: ClipboardList   },
  { path: "/suppliers",    label: "Supplier Portal",          icon: Users           },
  { path: "/calculator",   label: "Carbon Calculator",        icon: Calculator      },
  { path: "/regulatory",   label: "Regulatory Radar",         icon: Globe           },
  { path: "/settings",     label: "Settings",                 icon: SettingsIcon    },
  { path: "/settings/billing", label: "Billing",              icon: CreditCard      },
  { path: "/audit",        label: "Audit Trail",              icon: ScrollText      },
];

export default function App() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [location, setLocation] = useLocation();
  const membership = useCurrentMembership(session?.user.id ?? null);
  const supplierAccess = useSupplierAccess(session?.user.id ?? null);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    queryClient.clear();
  }

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") queryClient.clear();
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Public internal-team invite route — accessible without authentication.
  if (location.startsWith("/team/join")) {
    return <Suspense fallback={<DarkSpinner fullScreen />}><TeamJoin /></Suspense>;
  }

  // Public supplier invite route — accessible without authentication
  if (location.startsWith("/join")) {
    return (
      <Suspense fallback={<DarkSpinner fullScreen />}>
        <Join />
      </Suspense>
    );
  }

  // Public DPP route — accessible without authentication
  if (location.startsWith("/p/")) {
    const publicSlug = location.slice(3);
    return (
      <Suspense fallback={<DarkSpinner fullScreen />}>
        <PublicPassport publicSlug={publicSlug} />
      </Suspense>
    );
  }

  if (authLoading) {
    return <DarkSpinner fullScreen />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  // Wait for org membership check before rendering anything authenticated
  if (membership.isLoading || supplierAccess.isLoading) {
    return <DarkSpinner fullScreen />;
  }

  if (membership.error || supplierAccess.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "hsl(152 53% 8%)" }}>
        <div role="alert" className="max-w-md rounded-xl border border-red-400/30 bg-white p-6 text-center">
          <h1 className="font-semibold text-foreground">We couldn't load your organization</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account cannot enter the application safely. Please contact support.</p>
        </div>
      </div>
    );
  }

  // Only a confirmed zero-membership result enters onboarding. Multiple rows
  // are surfaced as an error by the canonical query and are blocked above.
  if (membership.data && supplierAccess.data) {
    return <div role="alert" className="min-h-screen flex items-center justify-center p-6">This account has conflicting internal and supplier access. Please contact support.</div>;
  }

  if (!membership.data && supplierAccess.data) {
    return <SupplierWorkspace access={supplierAccess.data} email={session.user.email ?? ""} onSignOut={() => { void handleSignOut(); }} />;
  }

  if (!membership.data) {
    return (
      <Suspense fallback={<DarkSpinner fullScreen />}>
        <Onboarding
          session={session}
          onComplete={() => setLocation("/dashboard")}
        />
      </Suspense>
    );
  }

  // DPP is a full-screen public-style view — rendered outside the app shell
  if (location === "/passport") {
    return (
      <AuthUserProvider userId={session.user.id}>
        <Suspense fallback={<DarkSpinner fullScreen />}>
          <DigitalProductPassport onBack={() => setLocation("/traceability")} />
        </Suspense>
      </AuthUserProvider>
    );
  }

  return (
    <AuthUserProvider userId={session.user.id}>
    <ErrorBoundary>
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/30">
          <div className="flex items-center gap-2">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground p-1.5 rounded-md shrink-0">
              <Grid className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm tracking-tight leading-tight">RE:Fashioned</span>
              <SidebarOrgBadge />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
          <nav className="space-y-1">
            {navItems.map(item => {
              const isActive = location === item.path ||
                (item.path !== "/" && location.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? "opacity-100" : "opacity-70"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-sidebar-border/30 mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0 border border-sidebar-border">
              <User className="w-5 h-5 text-sidebar-foreground/70" />
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user.email}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Signed in</p>
            </div>
            <button
              onClick={() => { void handleSignOut(); }}
              title="Sign out"
              className="shrink-0 p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-end px-6 shrink-0 z-10 relative">
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>
            <div className="h-6 w-px bg-border" />
            <button className="flex items-center gap-2 hover:bg-muted px-2 py-1 -mr-2 rounded-md transition-colors">
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium hidden sm:block max-w-[160px] truncate">{session.user.email}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Routed page content */}
        <div className="flex-1 overflow-y-auto relative flex flex-col">
          <Suspense fallback={<DarkSpinner />}>
            <Switch>
              <Route path="/">
                <Redirect to="/dashboard" />
              </Route>
              <Route path="/dashboard">
                <Dashboard onViewMetrics={() => setLocation("/traceability")} />
              </Route>
              <Route path="/products">
                <ProductCatalog />
              </Route>
              <Route path="/import">
                <DataImport />
              </Route>
              <Route path="/traceability">
                <Traceability onViewDPP={(id) => setLocation(`/passport?productId=${id}`)} />
              </Route>
              <Route path="/suppliers">
                <SupplierPortal />
              </Route>
              <Route path="/reports/csrd">
                <CSRDReport />
              </Route>
              <Route path="/calculator">
                <CarbonCalculator />
              </Route>
              <Route path="/regulatory">
                <RegulatoryRadar />
              </Route>
              <Route path="/profile">
                <BrandProfile onViewDashboard={() => setLocation("/dashboard")} />
              </Route>
              <Route path="/settings/billing">
                <Billing />
              </Route>
              <Route path="/settings">
                <SettingsPage />
              </Route>
              <Route path="/audit">
                <AuditLogPage />
              </Route>
              <Route>
                <NotFound />
              </Route>
            </Switch>
          </Suspense>
        </div>
      </main>

    </div>
    </ErrorBoundary>
    </AuthUserProvider>
  );
}
