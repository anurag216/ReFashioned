import { LayoutDashboard, GitBranch, Building2, Settings as SettingsIcon, Download, AlertTriangle, Leaf, RefreshCw, Scissors, Droplets, Shirt, Package, Share, Copy, QrCode, Edit2, Bell, Grid, ChevronDown, CheckCircle2, User, Camera, ScanLine, ArrowLeft, ShieldCheck, MapPin, ThumbsUp, ThumbsDown, Recycle, FileCheck, ClipboardList, TrendingUp, Clock, FileText, ChevronRight, Target, Globe, Users, Briefcase, Zap, Circle, Info, XCircle, Send, Upload, Link2, MailOpen, UserCheck, FileBadge, X, Filter, Search, ChevronDown as ChevDown, Building, MoreHorizontal, Plus, RefreshCcw, Calculator, Sliders, ArrowRight, FlameKindling, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ReferenceLine, ComposedChart, Cell } from 'recharts';
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import LoginScreen from "./LoginScreen";
import { Dashboard } from "./pages/Dashboard";
import { Traceability } from "./pages/Traceability";
import { SupplierPortal } from "./pages/SupplierPortal";
import { DigitalProductPassport } from "./pages/DigitalProductPassport";
import { BrandProfile } from "./pages/BrandProfile";
import { Settings } from "./pages/Settings";
import { CSRDReport } from "./pages/CSRDReport";
import { CarbonCalculator } from "./pages/CarbonCalculator";
import { RegulatoryRadar } from "./pages/RegulatoryRadar";

export default function App() {
  const [activeView, setActiveView] = useState("traceability");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(152 53% 8%)" }}>
        <svg className="animate-spin w-8 h-8" style={{ color: "hsl(145 65% 66%)" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  // DPP is full-screen — render without the shell
  if (activeView === "dpp") {
    return <DigitalProductPassport onBack={() => setActiveView("traceability")} />;
  }

  const views: Record<string, ReactNode> = {
    dashboard: <Dashboard onViewMetrics={() => setActiveView("traceability")} />,
    traceability: <Traceability onViewDPP={() => setActiveView("dpp")} />,
    brandProfile: <BrandProfile onViewDashboard={() => setActiveView("dashboard")} />,
    dpp: <DigitalProductPassport onBack={() => setActiveView("traceability")} />,
    csrd: <CSRDReport />,
    suppliers: <SupplierPortal />,
    carbon: <CarbonCalculator />,
    regulatory: <RegulatoryRadar />,
    settings: <Settings />,
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "traceability", label: "Lifecycle Traceability", icon: GitBranch },
    { id: "brandProfile", label: "Brand Profile", icon: Building2 },
    { id: "dpp", label: "Digital Product Passport", icon: FileCheck },
    { id: "csrd", label: "CSRD Report", icon: ClipboardList },
    { id: "suppliers", label: "Supplier Portal", icon: Users },
    { id: "carbon", label: "Carbon Calculator", icon: Calculator },
    { id: "regulatory", label: "Regulatory Radar", icon: Globe },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/30">
          <div className="flex items-center gap-2">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground p-1.5 rounded-md">
              <Grid className="w-4 h-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight">RE:Fashioned</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-3">
          <nav className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeView === item.id 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className={`w-4 h-4 ${activeView === item.id ? "opacity-100" : "opacity-70"}`} />
                {item.label}
              </button>
            ))}
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
              onClick={() => supabase?.auth.signOut()}
              title="Sign out"
              className="shrink-0 p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-end px-6 shrink-0 z-10 relative">
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="h-6 w-px bg-border"></div>
            <button className="flex items-center gap-2 hover:bg-muted px-2 py-1 -mr-2 rounded-md transition-colors">
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium hidden sm:block max-w-[160px] truncate">{session.user.email}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto relative">
          {views[activeView as keyof typeof views]}
        </div>
      </main>
    </div>
  );
}
