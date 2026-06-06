import { useState, useEffect } from "react";
import { Settings as SettingsIcon, User, Camera, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { usePermissions } from "../lib/auth/usePermissions";

export function Settings() {
  const [activeTab, setActiveTab] = useState("account");

  const [orgId,          setOrgId]          = useState<string | null>(null);
  const [orgName,        setOrgName]        = useState("");
  const [userEmail,      setUserEmail]      = useState("");
  const [orgSaving,      setOrgSaving]      = useState(false);
  const [orgSaveError,   setOrgSaveError]   = useState<string | null>(null);
  const [orgSaveSuccess, setOrgSaveSuccess] = useState(false);
  const { isAdmin } = usePermissions();

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    (async () => {
      const { data: { user } } = await client.auth.getUser();
      if (user?.email) setUserEmail(user.email);
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: member } = await (client.from("organization_members").select("organization_id").eq("profile_id", user.id).limit(1).maybeSingle() as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id: string | null = (member as any)?.organization_id ?? null;
      setOrgId(id);
      if (!id) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: org } = await (client.from("organizations").select("name").eq("id", id).maybeSingle() as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((org as any)?.name) setOrgName((org as any).name);
    })();
  }, []);

  async function handleSaveChanges() {
    if (!supabase || !orgId || !orgName.trim()) {
      setOrgSaveError("Company name cannot be empty.");
      return;
    }
    setOrgSaving(true); setOrgSaveError(null); setOrgSaveSuccess(false);
    const client = supabase;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await ((client.from("organizations") as any).update({ name: orgName.trim() }).eq("id", orgId));
      if (error) throw error;
      setOrgSaveSuccess(true);
      setTimeout(() => setOrgSaveSuccess(false), 4000);
    } catch (e: unknown) {
      setOrgSaveError(e instanceof Error ? e.message : "Save failed — please try again.");
    } finally {
      setOrgSaving(false);
    }
  }

  const tabs = [
    { id: "account", label: "Account Information" },
    { id: "notifications", label: "Notifications" },
    { id: "preferences", label: "Preferences" },
    { id: "api", label: "API Access" },
    { id: "security", label: "Security" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize your account information and platform features</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleSaveChanges}
            disabled={orgSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {orgSaving
              ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg> Saving…</>
              : "Save Changes"
            }
          </button>
        )}
      </div>

      <div className="border-b border-border overflow-x-auto hide-scrollbar">
        <div className="flex gap-6 min-w-max px-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {orgSaveSuccess && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">Changes saved successfully.</p>
        </div>
      )}
      {orgSaveError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{orgSaveError}</p>
        </div>
      )}

      {activeTab === "account" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border text-center flex flex-col items-center">
              <div className="relative mb-4 group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="font-semibold text-foreground">Emma Johnson</h3>
              <p className="text-sm text-muted-foreground mb-4">Sustainability Manager</p>
              
              <div className="flex gap-2 w-full">
                <button className="flex-1 bg-white border border-border hover:bg-muted text-foreground text-xs font-medium py-2 rounded transition-colors shadow-sm">
                  Upload New
                </button>
                <button className="px-3 bg-white border border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-muted-foreground text-xs font-medium py-2 rounded transition-colors shadow-sm">
                  Remove
                </button>
              </div>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border">
              <h3 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Account Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="text-sm text-muted-foreground">Account Type</span>
                  <span className="text-sm font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Enterprise Plan</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Subscription</span>
                    <a href="#" className="text-sm text-blue-600 hover:underline">Manage</a>
                  </div>
                  <span className="text-sm font-medium text-foreground">Renews on Nov 15, 2023</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border">
              <h3 className="font-semibold text-foreground mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">First Name</label>
                  <input type="text" defaultValue="Emma" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Last Name</label>
                  <input type="text" defaultValue="Johnson" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Email Address</label>
                  <input
                    type="email"
                    value={userEmail}
                    readOnly
                    className="w-full bg-muted/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none text-muted-foreground cursor-default"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Phone Number</label>
                  <input type="tel" defaultValue="+1(555) 123-4567" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Job Title</label>
                  <input type="text" defaultValue="Sustainability Manager" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Department</label>
                  <select className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>Sustainability</option>
                    <option>Sourcing & Procurement</option>
                    <option>Compliance</option>
                    <option>Operations</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border">
              <h3 className="font-semibold text-foreground mb-4">Company Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Company Name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      placeholder="Your organisation name"
                      className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Industry</label>
                    <select className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option>Apparel & Fashion</option>
                      <option>Textile Manufacturing</option>
                      <option>Retail</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Company Address</label>
                  <input type="text" defaultValue="123 Fashion Avenue, Suite 500" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-2" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="City" defaultValue="New York" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 col-span-1" />
                    <input type="text" placeholder="State" defaultValue="NY" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 col-span-1" />
                    <input type="text" placeholder="Zip" defaultValue="10001" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 col-span-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab !== "account" && (
        <div className="bg-card rounded-lg p-12 shadow-sm border border-card-border text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <SettingsIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">Settings section coming soon</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">This section is currently under development. Please check back later for updates to these preferences.</p>
        </div>
      )}
    </div>
  );
}
