"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="boot-error" role="alert">
      <h1>Não foi possível abrir esta página</h1>
      <p>Seus dados salvos foram preservados. Tente novamente em instantes.</p>
      <button type="button" onClick={reset}>
        Tentar novamente
      </button>
      <Link href="/">Voltar para a pesquisa</Link>
    </div>
  );
}
