"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TriangleAlert, RefreshCw, WifiOff } from "lucide-react";
import type { BootData, Business } from "@/lib/domain/types";
import { api, errorMessage } from "@/lib/client/api";
interface WorkspaceValue {
  data: BootData;
  refresh: () => Promise<void>;
  updateBusiness: (business: Business) => void;
}
const WorkspaceContext = createContext<WorkspaceValue | null>(null);
export function ThemeRoot({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </>
    </ThemeProvider>
  );
}
const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<BootData | null>(null);
  const [error, setError] = useState("");
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const refresh = useCallback(async () => {
    const next = await api<BootData>("bootstrap");
    setData(next);
    setError("");
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api<BootData>("bootstrap", undefined, controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      });
    return () => controller.abort();
  }, []);
  const updateBusiness = useCallback(
    (b: Business) =>
      setData((old) =>
        old
          ? {
              ...old,
              businesses: old.businesses.some((x) => x.id === b.id)
                ? old.businesses.map((x) => (x.id === b.id ? b : x))
                : [b, ...old.businesses],
            }
          : old,
      ),
    [],
  );
  if (error && !data)
    return (
      <div className="boot-state">
        <TriangleAlert size={36} />
        <h1>Não foi possível abrir o workspace</h1>
        <p>{error}</p>
        <Button
          onClick={() => void refresh().catch((e) => setError(errorMessage(e)))}
        >
          <RefreshCw size={16} />
          Tentar novamente
        </Button>
        <a href="/signin-with-chatgpt?return_to=%2F" target="_top">
          Entrar novamente
        </a>
      </div>
    );
  if (!data)
    return (
      <div className="boot-loading">
        <div className="logo-word">
          <span className="brand-symbol">o</span>orbit
          <span className="dim">/</span>
        </div>
        <Skeleton className="h-10 w-72" />
        <div className="skeleton-grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[55vh] rounded-2xl" />
        <p>Preparando seu workspace…</p>
      </div>
    );
  return (
    <WorkspaceContext.Provider value={{ data, refresh, updateBusiness }}>
      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff size={16} />
          Você está offline. Reconecte para pesquisar ou salvar alterações.
        </div>
      )}
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("WorkspaceProvider required");
  return ctx;
}
