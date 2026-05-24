import { Share, CheckCircle2, Copy, QrCode, Edit2, Leaf, Droplets, RefreshCw, User, ChevronRight } from "lucide-react";

export function BrandProfile({ onViewDashboard }: { onViewDashboard?: () => void }) {
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
            <button onClick={onViewDashboard} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              View detailed metrics <ChevronRight className="w-4 h-4" />
            </button>
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
