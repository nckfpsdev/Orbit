"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Compass,
  ChartNoAxesCombined,
  Sparkles,
  PanelsTopLeft,
  Kanban,
  FolderHeart,
  MessageSquareText,
  History,
  Settings2,
  ShieldCheck,
  ChevronsUpDown,
  Sun,
  Moon,
  Monitor,
  Search,
  Plus,
  CircleHelp,
  Zap,
  Check,
  LogOut,
  Orbit,
} from "lucide-react";
import { useWorkspace } from "./providers";
const NAV = [
  { href: "/dashboard", label: "Visão geral", icon: ChartNoAxesCombined },
  { href: "/", label: "Explorar negócios", icon: Compass },
  { href: "/opportunities", label: "Oportunidades", icon: Sparkles },
  { href: "/crm", label: "Meu CRM", icon: Kanban },
  { href: "/lists", label: "Listas de leads", icon: FolderHeart },
  { href: "/sites", label: "Sites & propostas", icon: PanelsTopLeft },
  { href: "/scripts", label: "Abordagens", icon: MessageSquareText },
  { href: "/history", label: "Histórico", icon: History },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const { data } = useWorkspace();
  const path = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [command, setCommand] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommand((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const current =
    NAV.find((n) => n.href === path)?.label ??
    (path.startsWith("/leads")
      ? "Detalhes do lead"
      : path.startsWith("/sites")
        ? "Estúdio de sites"
        : path === "/admin"
          ? "Administração"
          : path === "/onboarding"
            ? "Primeiros passos"
            : "Configurações");
  const active = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
      className="workspace-root"
    >
      <Sidebar className="orbit-sidebar">
        <SidebarHeader>
          <Link href="/" className="logo-word">
            <Orbit className="logo-icon" size={29} />
            orbit<span className="logo-suffix">intelligence</span>
          </Link>
          <div className="workspace-switch">
            <span className="workspace-avatar">M</span>
            <div>
              <strong>Meu workspace</strong>
              <small>Prospecção local</small>
            </div>
            <ChevronsUpDown size={14} />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>WORKSPACE</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((n) => (
                  <SidebarMenuItem key={n.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active(n.href)}
                      tooltip={n.label}
                    >
                      <Link href={n.href}>
                        <n.icon size={18} />
                        <span>{n.label}</span>
                        {n.href === "/opportunities" &&
                          data.stats.strong > 0 && (
                            <span className="nav-count">
                              {data.stats.strong}
                            </span>
                          )}
                        {n.href === "/crm" && data.stats.saved > 0 && (
                          <span className="nav-count muted-count">
                            {data.stats.saved}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="sidebar-bottom-group">
            <SidebarGroupLabel>GERENCIAR</SidebarGroupLabel>
            <SidebarMenu>
              {[
                { href: "/settings", label: "Configurações", icon: Settings2 },
                ...(data.provider_status.admin
                  ? [
                      {
                        href: "/admin",
                        label: "Administração",
                        icon: ShieldCheck,
                      },
                    ]
                  : []),
              ].map((n) => (
                <SidebarMenuItem key={n.href}>
                  <SidebarMenuButton asChild isActive={active(n.href)}>
                    <Link href={n.href}>
                      <n.icon size={18} />
                      <span>{n.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <div className="credit-card">
            <div>
              <Zap size={16} />
              <span>Seus créditos</span>
              <strong>{data.organization.credits}</strong>
            </div>
            <div className="credit-track">
              <span
                style={{
                  width: `${Math.min(100, (data.organization.credits / 250) * 100)}%`,
                }}
              />
            </div>
            <Link href="/settings?tab=credits">Ver consumo</Link>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="account-button">
                <span className="user-avatar">
                  {data.user.name.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong>{data.user.name.split(" ")[0]}</strong>
                  <small>Conta pessoal</small>
                </span>
                <ChevronsUpDown size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => router.push("/settings")}>
                Minha conta
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="/signout-with-chatgpt?return_to=%2Flogin"
                  target="_top"
                >
                  <LogOut size={15} />
                  Sair
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="orbit-inset">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger aria-label="Abrir ou fechar navegação" />
            <span className="breadcrumb-root">Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <Button
              variant="ghost"
              className="command-search"
              onClick={() => setCommand(true)}
            >
              <Search size={16} />
              <span>Busca rápida</span>
              <kbd>⌘ K</kbd>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Alterar tema">
                  <Sun size={18} className="light-theme-icon" />
                  <Moon size={18} className="dark-theme-icon" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[
                  { value: "light", label: "Claro", icon: Sun },
                  { value: "dark", label: "Escuro", icon: Moon },
                  { value: "system", label: "Sistema", icon: Monitor },
                ].map((t) => (
                  <DropdownMenuItem
                    key={t.value}
                    onSelect={() => setTheme(t.value)}
                  >
                    <t.icon size={16} />
                    {t.label}
                    {theme === t.value && <Check size={14} />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href="/onboarding"
              aria-label="Primeiros passos"
              className="icon-link"
            >
              <CircleHelp size={18} />
            </Link>
            <span className="topbar-avatar">{data.user.name.slice(0, 1)}</span>
          </div>
        </header>
        <main id="main-content" className="workspace-content">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>Orbit · seu próximo cliente está perto.</span>
          <div>
            <Link href="/privacy">Privacidade</Link>
            <Link href="/terms">Termos</Link>
          </div>
        </footer>
      </SidebarInset>
      <CommandDialog
        open={command}
        onOpenChange={setCommand}
        title="Busca rápida"
        description="Navegue no workspace ou abra um lead"
      >
        <CommandInput placeholder="Buscar páginas e negócios…" />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
          <CommandGroup heading="Navegação">
            {NAV.map((n) => (
              <CommandItem
                key={n.href}
                onSelect={() => {
                  router.push(n.href);
                  setCommand(false);
                }}
              >
                <n.icon size={16} />
                {n.label}
              </CommandItem>
            ))}
            <CommandItem
              onSelect={() => {
                router.push("/");
                setCommand(false);
              }}
            >
              <Plus size={16} />
              Nova pesquisa
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Negócios">
            {data.businesses.slice(0, 30).map((b) => (
              <CommandItem
                key={b.id}
                onSelect={() => {
                  router.push(`/leads/${b.id}`);
                  setCommand(false);
                }}
              >
                {b.business_name}
                <span className="dim">{b.city}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  );
}
