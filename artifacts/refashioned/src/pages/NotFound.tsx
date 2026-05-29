import { useLocation } from "wouter";

export function NotFound() {
  const [location, setLocation] = useLocation();

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center select-none"
      style={{ background: "linear-gradient(160deg, hsl(152 53% 6%) 0%, hsl(152 40% 10%) 100%)" }}
    >
      {/* Stylised 404 */}
      <div className="relative mb-8">
        <p
          className="text-[10rem] sm:text-[14rem] font-black leading-none tracking-tighter"
          style={{
            background: "linear-gradient(135deg, hsl(145 65% 20%) 0%, hsl(145 65% 40%) 50%, hsl(145 65% 66%) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 48px hsl(145 65% 30%))",
          }}
        >
          404
        </p>
        {/* Glowing ring accent */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div
            className="w-48 h-48 sm:w-64 sm:h-64 rounded-full opacity-10 blur-3xl"
            style={{ background: "hsl(145 65% 66%)" }}
          />
        </div>
      </div>

      {/* Icon + heading */}
      <div className="mb-2 flex items-center justify-center w-14 h-14 rounded-full border border-[#6AE096]/30 bg-[#6AE096]/10">
        <svg
          className="w-7 h-7"
          style={{ color: "#6AE096" }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      </div>

      <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">Page not found</h1>
      <p className="mt-3 text-sm sm:text-base text-white/50 max-w-sm leading-relaxed">
        The path{" "}
        <code className="px-1.5 py-0.5 rounded bg-white/10 text-[#6AE096] text-xs font-mono">
          {location}
        </code>{" "}
        doesn't exist. It may have been moved, deleted, or you may have mistyped the URL.
      </p>

      <button
        onClick={() => setLocation("/dashboard")}
        className="mt-8 flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-[0_0_24px_hsl(145_65%_50%/0.4)] focus:outline-none focus:ring-2 focus:ring-[#6AE096]/50"
        style={{
          background: "linear-gradient(135deg, #6AE096 0%, #3dcc72 100%)",
          color: "#0d2a1f",
        }}
      >
        <svg
          className="w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75v-4.5h-4.5V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
        </svg>
        Return to Dashboard
      </button>

      <p className="mt-6 text-xs text-white/25">RE:Fashioned · Sustainability Intelligence Platform</p>
    </div>
  );
}
