import { LoginForm } from "@/components/orbit/login-form";
import { safeReturnTo } from "@/lib/supabase/redirect";
import { Orbit, ShieldCheck, Compass } from "lucide-react";
export default async function Login({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const returnTo = safeReturnTo((await searchParams).return_to);
  return (
    <main id="main-content" className="login-page">
      <div className="login-card panel">
        <div className="logo-word">
          <Orbit size={33} className="text-primary" />
          orbit
        </div>
        <div className="login-symbol">
          <Compass size={38} />
        </div>
        <h1>
          Seu próximo cliente
          <br />
          está perto.
        </h1>
        <p>
          Entre no workspace para descobrir negócios, criar demonstrações e
          acompanhar oportunidades.
        </p>
        <LoginForm returnTo={returnTo} />
        <small>
          <ShieldCheck size={14} />
          Seu workspace, protegido e separado por conta.
        </small>
      </div>
    </main>
  );
}
