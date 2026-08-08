import { useEffect, useState } from "react";
import {
  ScrollText, Archive, GitBranch, Globe, EyeOff,
  Plus, RefreshCw, AlertCircle, ShieldCheck, User,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import type { AuditLog } from "../lib/types";

// ── Action display config ──────────────────────────────────────────────────────

interface ActionConfig {
  label: string;
  icon: typeof Archive;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeColor: string;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  archived: {
    label: "Product Archived",
    icon: Archive,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeColor: "text-amber-700",
  },
  stage_added: {
    label: "Stage Added",
    icon: GitBranch,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-50",
    badgeColor: "text-blue-700",
  },
  passport_published: {
    label: "Passport Published",
    icon: Globe,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    badgeBg: "bg-green-50",
    badgeColor: "text-green-700",
  },
  passport_unpublished: {
    label: "Passport Unpublished",
    icon: EyeOff,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    badgeBg: "bg-slate-50",
    badgeColor: "text-slate-600",
  },
  product_created: {
    label: "Product Created",
    icon: Plus,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    badgeBg: "bg-primary/5",
    badgeColor: "text-primary",
  },
  supplier_invited: {
    label: "Supplier Invited",
    icon: User,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badgeBg: "bg-purple-50",
    badgeColor: "text-purple-700",
  },
};

const DEFAULT_ACTION: ActionConfig = {
  label: "Action",
  icon: ShieldCheck,
  iconBg: "bg-muted",
  iconColor: "text-muted-foreground",
  badgeBg: "bg-muted",
  badgeColor: "text-muted-foreground",
};

function getConfig(action: string): ActionConfig {
  return ACTION_CONFIG[action] ?? { ...DEFAULT_ACTION, label: action.replace(/_/g, " ") };
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileEmails, setProfileEmails] = useState<Record<string, string>>({});

  async function load() {
    if (!supabase) { setLoading(false); return; }
    const client = supabase;
    setLoading(true);
    setError(null);

    const { data: { user } } = await client.auth.getUser();
    if (!user) { setLoading(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (client
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle() as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgId: string | null = (member as any)?.organization_id ?? null;
    if (!orgId) { setLoading(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: fetchError } = await (client
      .from("audit_logs")
      .select("id, organization_id, profile_id, action, entity_type, entity_name, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200) as any);

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as AuditLog[];
    setLogs(rows);

    // Resolve profile emails from profiles table
    const uniqueProfileIds = [...new Set(rows.map(r => r.profile_id).filter((id): id is string => id !== null))];
    if (uniqueProfileIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profiles } = await (client
        .from("profiles")
        .select("id, email")
        .in("id", uniqueProfileIds) as any);
      if (profiles) {
        const map: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (profiles as any[]).forEach((p: any) => { if (p.id && p.email) map[p.id] = p.email; });
        setProfileEmails(map);
      }
    }

    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function actorLabel(profileId: string): string {
    return profileEmails[profileId] ?? "Team Member";
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ScrollText className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Immutable record of all changes made across your organisation
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-border shadow-sm hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Compliance callout ──────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-primary">Legally defensible audit history</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every action is timestamped with the acting user and entity. Records are append-only
            and scoped to your organisation — suitable for CSRD, ESPR, and ISO 14001 audits.
          </p>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── No Supabase ────────────────────────────────────────────── */}
      {!supabase && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Supabase is not configured — audit logs require live credentials.
        </div>
      )}

      {/* ── Feed ───────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl shadow-sm border border-card-border overflow-hidden">

        {/* Column headers */}
        <div className="px-6 py-3 border-b border-border bg-muted/30 grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_160px_120px] gap-4 items-center">
          <span />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:block">Actor</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">When</span>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-48" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
                <div className="h-3 bg-muted rounded w-24 hidden sm:block" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && logs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <ScrollText className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-foreground">No events recorded yet</p>
            <p className="text-sm text-muted-foreground max-w-xs text-center">
              Actions like archiving products, adding lifecycle stages, and publishing passports
              will appear here automatically.
            </p>
          </div>
        )}

        {/* Log entries */}
        {!loading && logs.length > 0 && (
          <div className="divide-y divide-border">
            {logs.map((log, i) => {
              const cfg = getConfig(log.action);
              const Icon = cfg.icon;
              return (
                <div
                  key={log.id ?? i}
                  className="px-6 py-4 hover:bg-muted/20 transition-colors grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_160px_120px] gap-4 items-center"
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                    <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                  </div>

                  {/* Event description */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeColor}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{log.entity_type.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-0.5 truncate">{log.entity_name}</p>
                  </div>

                  {/* Actor */}
                  <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{log.profile_id ? actorLabel(log.profile_id) : "Unknown actor"}</span>
                  </div>

                  {/* Timestamp */}
                  <div className="text-right">
                    <p className="text-xs font-medium text-foreground">{log.created_at ? relativeTime(log.created_at) : "Unknown time"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Count footer */}
        {!loading && logs.length > 0 && (
          <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{logs.length} event{logs.length !== 1 ? "s" : ""} recorded</span>
            <span className="text-xs text-muted-foreground">Showing most recent 200</span>
          </div>
        )}
      </div>
    </div>
  );
}
