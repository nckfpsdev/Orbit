import { chatGPTSignInPath } from "@/app/chatgpt-auth";
import { Orbit, ShieldCheck, Compass } from "lucide-react";
export default function Login() {
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
        <a className="login-button" href={chatGPTSignInPath("/")} target="_top">
          Entrar com ChatGPT
        </a>
        <small>
          <ShieldCheck size={14} />
          Seu workspace, protegido e separado por conta.
        </small>
      </div>
    </main>
  );
}
