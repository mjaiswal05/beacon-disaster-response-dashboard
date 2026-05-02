import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { authService } from "../services/auth";
import type { AuthUser, ERTLoginRequest } from "../types/auth.types";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isSysAdmin: boolean;
  isERTMember: boolean;
  login: (credentials: ERTLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const isRun = useRef(false);

  useEffect(() => {
    if (isRun.current) return;
    isRun.current = true;

    const isAuth = authService.isAuthenticated();
    const storedUser = authService.getCurrentUser();

    if (isAuth && storedUser) {
      setUser(storedUser);
    }
    setIsInitializing(false);
  }, []);

  const login = useCallback(async (credentials: ERTLoginRequest) => {
    const loggedInUser = await authService.loginERT(credentials);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const isAuthenticated = user !== null;
  const role = user?.role ?? "";
  const isSysAdmin = role === "ROLE_SYS_ADMIN" || role === "admin";
  const isERTMember =
    role === "ROLE_ERT_MEMBER" ||
    role === "ROLE_ERT_MEMBERS" ||
    role === "ert_member" ||
    role === "ERT" ||
    role === "ert";

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isInitializing,
        isSysAdmin,
        isERTMember,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
