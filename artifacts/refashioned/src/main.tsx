import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthCallback } from "./pages/AuthCallback";
import { ResetPassword } from "./pages/ResetPassword";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const pathname = window.location.pathname;
const entry = pathname === "/auth/reset-password"
  ? <ResetPassword />
  : pathname === "/auth/callback"
    ? <AuthCallback />
    : <App />;

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    {entry}
  </QueryClientProvider>
);
