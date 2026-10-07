"use client";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
export function LogoutButton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={async () => {
        if (pending) return;
        setPending(true);
        try {
          const response = await fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
          if (!response.ok) throw new Error();
          window.location.replace("/login");
        } catch {
          toast.error("Não foi possível sair. Tente novamente.");
          setPending(false);
        }
      }}
    >
      {children}
    </button>
  );
}
