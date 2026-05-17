import { LayoutDashboard, GitBranch, Building2, Settings as SettingsIcon, Download, AlertTriangle, Leaf, RefreshCw, Scissors, Droplets, Shirt, Package, Share, Copy, QrCode, Edit2, Bell, Grid, ChevronDown, CheckCircle2, User, Camera } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useState } from "react";

export function Dashboard() {
  const [chartToggle1, setChartToggle1] = useState("Quarterly");
  const [chartToggle2, setChartToggle2] = useState("Quarterly");

  const co2Data = [
    { name: 'Q1', lastYear: 120, thisYear: 150 },
    { name: 'Q2', lastYear: 180, thisYear: 200 },
    { name: 'Q3', lastYear: 160, thisYear: 220 },
    { name: 'Q4', lastYear: 140, thisYear: 280 },
  ];

  const waterData = [
    { name: 'Q1', lastYear: 200, thisYear: 250 },
    { name: 'Q2', lastYear: 280, thisYear: 320 },
    { name: 'Q3', lastYear: 260, thisYear: 380 },
    { name: 'Q4', lastYear: 220, thisYear: 410 },
  ];

  const sparklineData1 = [{ v: 400 }, { v: 450 }, { v: 500 }, { v: 600 }, { v: 650 }, { v: 800 }, { v: 847 }];
  const sparklineData2 = [{ v: 800 }, { v: 850 }, { v: 900 }, { v: 950 }, { v: 1100 }, { v: 1150 }, { v: 1200 }];
  const sparklineData3 = [{ v: 60 }, { v: 62 }, { v: 65 }, { v: 68 }, { v: 71 }, { v: 74 }, { v: 76.8 }];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sustainability Metrics</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your brand's environmental impact and progress</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-white border border-border rounded-md px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option>Last 30 days</option>
            <option>Last Quarter</option>
            <option>Last Year</option>
          </select>
          <button className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Leaf className="w-4 h-4 text-primary" /> CO₂ Saved
              </p>
              <h3 className="text-3xl font-bold mt-2">847.3 <span className="text-lg font-normal text-muted-foreground">tons</span></h3>
            </div>
            <div className="bg-accent/20 text-primary px-2 py-1 rounded text-xs font-medium">+12.4%</div>
          </div>
          <div className="h-16 mt-4 -mx-2 -mb-2">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData1}>
                  <Area type="monotone" dataKey="v" stroke="#12382B" fill="#12382B" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" /> Water Saved
              </p>
              <h3 className="text-3xl font-bold mt-2">1.2M <span className="text-lg font-normal text-muted-foreground">liters</span></h3>
            </div>
            <div className="bg-accent/20 text-primary px-2 py-1 rounded text-xs font-medium">+8.7%</div>
          </div>
          <div className="h-16 mt-4 -mx-2 -mb-2">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData2}>
                  <Area type="monotone" dataKey="v" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-500" /> Recycled Materials
              </p>
              <h3 className="text-3xl font-bold mt-2">76.8 <span className="text-lg font-normal text-muted-foreground">%</span></h3>
            </div>
            <div className="bg-accent/20 text-primary px-2 py-1 rounded text-xs font-medium">+5.2%</div>
          </div>
          <div className="h-16 mt-4 -mx-2 -mb-2">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData3}>
                  <Area type="monotone" dataKey="v" stroke="#A855F7" fill="#A855F7" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1 */}
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-foreground">CO₂ Reduction Trend</h3>
            <div className="flex bg-muted rounded-md p-1">
              <button onClick={() => setChartToggle1("Monthly")} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${chartToggle1 === "Monthly" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
              <button onClick={() => setChartToggle1("Quarterly")} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${chartToggle1 === "Quarterly" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Quarterly</button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={co2Data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="lastYear" name="Last Year" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="thisYear" name="This Year" fill="#6AE096" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-card rounded-lg p-5 shadow-sm border border-card-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-foreground">Water Conservation Trend</h3>
            <div className="flex bg-muted rounded-md p-1">
              <button onClick={() => setChartToggle2("Monthly")} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${chartToggle2 === "Monthly" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
              <button onClick={() => setChartToggle2("Quarterly")} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${chartToggle2 === "Quarterly" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Quarterly</button>
              <button onClick={() => setChartToggle2("Yearly")} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${chartToggle2 === "Yearly" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Yearly</button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="lastYear" name="Last Year" fill="#94A3B8" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="thisYear" name="This Year" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Traceability() {
  const rows = [
    {
      stage: "Raw Material Sourcing",
      subtitle: "Organic Cotton",
      icon: Leaf,
      iconColor: "text-white",
      iconBg: "bg-primary",
      location: "Maharashtra, India",
      locSub: "Cooperative Farm",
      materials: "100% Organic Cotton",
      matSub: "Non-GMO Seeds",
      certs: [{ name: "GOTS", color: "bg-green-100 text-green-700 border-green-200" }, { name: "Fair Trade", color: "bg-green-100 text-green-700 border-green-200" }],
      co2: "-30% vs. conventional",
      co2Val: "42.3 kg CO₂e",
      co2Pos: true,
      water: "-40% vs. convention",
      waterVal: "1,800 L",
      flagged: false
    },
    {
      stage: "Processing & Spinning",
      subtitle: "Yarn Production",
      icon: RefreshCw,
      iconColor: "text-white",
      iconBg: "bg-blue-600",
      location: "Tamil Nadu, India",
      locSub: "EcoSpin Facility",
      materials: "Organic Cotton Yarn",
      matSub: "30/1 Combed",
      certs: [{ name: "BlueSign", color: "bg-blue-100 text-blue-700 border-blue-200" }, { name: "ZDHC", color: "bg-teal-100 text-teal-700 border-teal-200" }],
      co2: "-15% vs. industry avg",
      co2Val: "18.7 kg CO₂e",
      co2Pos: true,
      water: "-25% vs. industry avg",
      waterVal: "450 L",
      flagged: false
    },
    {
      stage: "Fabric Production",
      subtitle: "Knitting & Weaving",
      icon: Scissors,
      iconColor: "text-white",
      iconBg: "bg-purple-600",
      location: "Tiruppur, India",
      locSub: "GreenWeave Mills",
      materials: "Jersey Knit Fabric",
      matSub: "180 GSM",
      certs: [{ name: "GOTS", color: "bg-green-100 text-green-700 border-green-200" }, { name: "BlueSign", color: "bg-blue-100 text-blue-700 border-blue-200" }],
      co2: "-20% vs. industry avg",
      co2Val: "15.2 kg CO₂e",
      co2Pos: true,
      water: "-30% vs. industry avg",
      waterVal: "380 L",
      flagged: false
    },
    {
      stage: "Dyeing & Finishing",
      subtitle: "Natural Dye Process",
      icon: Droplets,
      iconColor: "text-white",
      iconBg: "bg-amber-500",
      location: "Tiruppur, India",
      locSub: "EcoDye Facility",
      materials: "Natural Indigo Dye",
      matSub: "Low-Impact Process",
      certs: [{ name: "ZDHC", color: "bg-teal-100 text-teal-700 border-teal-200" }, { name: "OEKO-TEX", color: "bg-red-100 text-red-700 border-red-200", alert: true }],
      co2: "-45% vs. chemical dyes",
      co2Val: "8.3 kg CO₂e",
      co2Pos: true,
      water: "-60% vs. chemical d...",
      waterVal: "210 L",
      flagged: true
    },
    {
      stage: "Garment Manufacturing",
      subtitle: "Cutting & Sewing",
      icon: Shirt,
      iconColor: "text-white",
      iconBg: "bg-pink-500",
      location: "Dhaka, Bangladesh",
      locSub: "FairStitch Factory",
      materials: "T-shirt, Dress, Pants",
      matSub: "Summer Collection",
      certs: [{ name: "Fair Trade", color: "bg-green-100 text-green-700 border-green-200" }, { name: "SA8000", color: "bg-purple-100 text-purple-700 border-purple-200" }],
      co2: "-10% vs. industry avg",
      co2Val: "5.8 kg CO₂e",
      co2Pos: true,
      water: "-5% vs. industry avg",
      waterVal: "120 L",
      flagged: false
    },
    {
      stage: "Quality Control & Packaging",
      subtitle: "Final Inspection",
      icon: Package,
      iconColor: "text-white",
      iconBg: "bg-slate-500",
      location: "Dhaka, Bangladesh",
      locSub: "FairStitch Factory",
      materials: "Recycled Paper Tags",
      matSub: "Compostable Packaging",
      certs: [{ name: "FSC", color: "bg-green-100 text-green-700 border-green-200" }, { name: "Plastic-Free", color: "bg-blue-100 text-blue-700 border-blue-200" }],
      co2: "-70% vs. plastic packaging",
      co2Val: "1.2 kg CO₂e",
      co2Pos: true,
      water: "-90% vs. plastic pac...",
      waterVal: "5 L",
      flagged: false
    }
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Journey</h1>
          <p className="text-sm text-muted-foreground mt-1">Track materials sourcing, production stages, and environmental impact</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select className="bg-white border border-border rounded-md px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64">
            <option>Summer Collection 2023 - Essential Cotton Tee</option>
            <option>Winter Collection 2023 - Wool Sweater</option>
          </select>
          <button className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm shrink-0">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="bg-[#FEF3C7] border border-amber-300 rounded-lg p-4 flex items-start sm:items-center gap-4 shadow-sm">
        <div className="bg-amber-100 p-2 rounded-full shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-900">AI Copilot Anomaly Detected</h4>
          <p className="text-sm text-amber-800 mt-0.5">Tier 2 processing data (Dyeing & Finishing) conflicts with OEKO-TEX certificate validity dates. Human review required.</p>
        </div>
        <button className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm mt-2 sm:mt-0">
          Review
        </button>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-card-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-gray-50/50">
          <h2 className="font-semibold text-foreground">Product Lifecycle Stages</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-6 py-3 font-semibold">Stage</th>
                <th className="px-6 py-3 font-semibold">Location</th>
                <th className="px-6 py-3 font-semibold">Materials</th>
                <th className="px-6 py-3 font-semibold">Certifications</th>
                <th className="px-6 py-3 font-semibold">CO₂ Impact</th>
                <th className="px-6 py-3 font-semibold">Water Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {rows.map((row, i) => (
                <tr key={i} className={`hover:bg-muted/50 transition-colors ${row.flagged ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`${row.iconBg} w-8 h-8 rounded-md flex items-center justify-center shrink-0 shadow-sm`}>
                        <row.icon className={`w-4 h-4 ${row.iconColor}`} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{row.stage}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{row.subtitle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-foreground">{row.location}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{row.locSub}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-foreground">{row.materials}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{row.matSub}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-2">
                      {row.certs.map((cert, j) => (
                        <span key={j} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cert.color}`}>
                          {cert.alert && <AlertTriangle className="w-3 h-3" />}
                          {cert.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-muted-foreground">{row.co2}</div>
                    <div className={`font-medium mt-0.5 ${row.co2Pos ? 'text-primary' : 'text-foreground'}`}>{row.co2Val}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-muted-foreground">{row.water}</div>
                    <div className="font-medium mt-0.5 text-foreground">{row.waterVal}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function BrandProfile() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Brand Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Your public-facing sustainability profile</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors shadow-sm bg-white">
            Preview
          </button>
          <button className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
            <Share className="w-4 h-4" /> Share Profile
          </button>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <div>
            <h4 className="text-sm font-medium text-primary">Your brand profile is public</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Last updated: June 15, 2023</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-border rounded-md pl-3 pr-1 py-1 shadow-sm w-full sm:w-auto">
          <span className="text-xs text-muted-foreground truncate">refashioned.com/brands/ecothread</span>
          <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors" title="Copy URL">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors border-l border-border ml-1 pl-2" title="Show QR">
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border relative">
          <button className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-foreground mb-4">Brand Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Company</p>
              <p className="text-sm font-medium text-foreground">EcoThread</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Tagline</p>
              <p className="text-sm text-foreground">Sustainable fashion brand focused on eco-friendly materials and ethical production practices</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Founded</p>
                <p className="text-sm text-foreground">2018</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Headquarters</p>
                <p className="text-sm text-foreground">Stockholm, Sweden</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Website</p>
                <a href="#" className="text-sm text-blue-600 hover:underline">ecothread.com</a>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Industry</p>
                <p className="text-sm text-foreground">Sustainable Fashion</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border relative">
          <button className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <h3 className="font-semibold text-foreground mb-6">Sustainability Snapshot</h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-md">
                  <Leaf className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">CO₂ Reduction</span>
              </div>
              <span className="text-lg font-semibold text-primary">42%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-md">
                  <Droplets className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-foreground">Water Conservation</span>
              </div>
              <span className="text-lg font-semibold text-blue-600">35%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/10 p-2 rounded-md">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-foreground">Recycled Materials</span>
              </div>
              <span className="text-lg font-semibold text-purple-600">76.8%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 rounded-md">
                  <User className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-foreground">Fair Labor</span>
              </div>
              <span className="text-lg font-semibold text-amber-600">100%</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              View detailed metrics <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg p-6 shadow-sm border border-card-border relative">
        <button className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-foreground mb-6">Sustainability Journey</h3>
        
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {[
            { year: "2018", title: "Founded with Sustainability Mission", desc: "Launched with a commitment to sustainable materials and ethical production practices." },
            { year: "2020", title: "100% Organic Cotton", desc: "Transitioned entire cotton supply chain to GOTS certified organic." },
            { year: "2021", title: "Launched Take-Back Program", desc: "Introduced circularity initiative for post-consumer garments." },
            { year: "2023", title: "Joined RE:Fashioned", desc: "Committed to radical transparency and data verification." }
          ].map((item, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-card bg-primary text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                <span className="text-[10px] font-bold">{item.year.slice(2)}</span>
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-border shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm text-foreground">{item.title}</h4>
                  <span className="text-xs font-medium text-primary px-2 py-0.5 bg-primary/10 rounded-full">{item.year}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState("account");

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
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
          Save Changes
        </button>
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
                  <input type="email" defaultValue="emma.johnson@fashionbrand.com" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
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
                    <input type="text" defaultValue="EcoStyle Fashion" className="w-full bg-white border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
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

export default function App() {
  const [activeView, setActiveView] = useState("traceability");

  const views = {
    dashboard: <Dashboard />,
    traceability: <Traceability />,
    brandProfile: <BrandProfile />,
    settings: <Settings />
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "traceability", label: "Lifecycle Traceability", icon: GitBranch },
    { id: "brandProfile", label: "Brand Profile", icon: Building2 },
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0 border border-sidebar-border">
              <User className="w-5 h-5 text-sidebar-foreground/70" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">Emma Johnson</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">Sustainability Manager</p>
            </div>
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
              <span className="text-sm font-medium hidden sm:block">Emma Johnson</span>
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
