"use client";
import { useState, type FormEvent } from "react";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [signup, setSignup] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(
        "/api/auth/" + (signup ? "signup" : "login"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: fields.get("email"),
            password: fields.get("password"),
            ...(signup ? { name: fields.get("name") } : {}),
            return_to: returnTo,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message || "Não foi possível entrar. Tente novamente.",
        );
      if (result.data.redirect) window.location.assign(result.data.redirect);
      else setMessage(result.data.message);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Confira a conexão e tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="login-form">
      {signup && (
        <label>
          Nome
          <input name="name" autoComplete="name" maxLength={180} required />
        </label>
      )}
      <label>
        E-mail
        <input
          type="email"
          name="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
      <label>
        Senha
        <input
          type="password"
          name="password"
          minLength={8}
          maxLength={128}
          autoComplete={signup ? "new-password" : "current-password"}
          required
        />
      </label>
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
      <button type="submit" className="login-button" disabled={pending}>
        {pending ? "Aguarde…" : signup ? "Criar conta" : "Entrar no Orbit"}
      </button>
      <button
        type="button"
        className="btn ghost"
        disabled={pending}
        onClick={() => {
          setSignup(!signup);
          setMessage("");
        }}
      >
        {signup ? "Já tenho uma conta" : "Criar minha conta"}
      </button>
    </form>
  );
}
