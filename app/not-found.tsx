import Link from "next/link";
export default function NotFound() {
  return (
    <main className="boot-error" id="main-content">
      <h1>Página não encontrada</h1>
      <p>O endereço pode ter mudado ou não estar disponível para sua conta.</p>
      <Link href="/">Voltar para a pesquisa</Link>
    </main>
  );
}
