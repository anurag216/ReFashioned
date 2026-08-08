import { createContext, useContext, type ReactNode } from "react";

const AuthUserIdContext = createContext<string | null>(null);

export function AuthUserProvider({ userId, children }: { userId: string; children: ReactNode }) {
  return <AuthUserIdContext.Provider value={userId}>{children}</AuthUserIdContext.Provider>;
}

export function useAuthUserId(): string | null {
  return useContext(AuthUserIdContext);
}
