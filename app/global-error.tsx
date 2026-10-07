"use client";
export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main role="alert">
          <h1>Não foi possível carregar o Orbit</h1>
          <p>Tente novamente em instantes.</p>
          <button type="button" onClick={reset}>
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
