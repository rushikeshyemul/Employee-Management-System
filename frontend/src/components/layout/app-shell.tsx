"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shield,
  SquareKanban,
  UserRound,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { NAV_SECTIONS, visibleNavigation, type NavIconName } from "@/config/navigation";
import { AccessDenied } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/auth-provider";
import { isDemoMode } from "@/lib/demo-mode";
import { canAccessPath } from "@/lib/permissions";
import { notificationService } from "@/lib/api/services";
import { personName } from "@/lib/format";
import { titleCase } from "@/lib/format";
import { resetDb } from "@/lib/mocks/store";
import { useQueryClient } from "@tanstack/react-query";
import { CommandMenu } from "@/components/layout/command-menu";
import { ThemePicker } from "@/components/theme/theme-picker";

const ICONS: Record<NavIconName, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  tasks: ListTodo,
  projects: FolderKanban,
  attendance: ClipboardList,
  leave: CalendarDays,
  notifications: Bell,
  profile: UserRound,
  board: SquareKanban,
  review: ClipboardList,
  approvals: ClipboardList,
  calendar: CalendarDays,
  reports: ChartColumn,
  employees: Users,
  teams: Building2,
  onboarding: UserRoundPlus,
  offboarding: LogOut,
  assets: Package,
  audit: ClipboardList,
  roles: Shield,
  settings: Settings,
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, status, permissions, usingPermissionFallback, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const mobileOpen = menuPath === pathname;
  const [commandOpen, setCommandOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigation = useMemo(() => visibleNavigation(permissions), [permissions]);
  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => notificationService.unreadCount(),
    enabled: status === "authenticated",
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (status === "anonymous") {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [status, router]);

  function setMobileOpen(open: boolean) {
    setMenuPath(open ? pathname : null);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (status !== "authenticated" || !user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  const allowed = canAccessPath(pathname, permissions);
  const sections = NAV_SECTIONS.map((section) => navigation.find((item) => item.id === section.id)).filter(Boolean);

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <aside className={`hidden shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out motion-reduce:transition-none lg:flex ${collapsed ? "w-[72px]" : "w-64"}`}>
        <SidebarBody
          collapsed={collapsed}
          pathname={pathname}
          sections={sections as ReturnType<typeof visibleNavigation>}
          onNavigate={() => undefined}
        />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={(open) => setMobileOpen(open)}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarBody
            collapsed={false}
            pathname={pathname}
            sections={sections as ReturnType<typeof visibleNavigation>}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur-sm md:px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
          <Button variant="outline" size="icon" className="md:hidden" onClick={() => setCommandOpen(true)} aria-label="Search">
            <Search />
          </Button>
          <Button variant="outline" className="hidden h-8 max-w-sm flex-1 justify-start text-muted-foreground md:inline-flex" onClick={() => setCommandOpen(true)}>
            <Search />
            Search tasks and people
            <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <ThemePicker />
            <Button variant="ghost" size="icon" className="relative" nativeButton={false} render={<Link href="/notifications" />} aria-label={`Notifications${unread.data ? `, ${unread.data} unread` : ""}`}>
              <Bell />
              {unread.data ? (
                <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] text-white">
                  {unread.data > 9 ? "9+" : unread.data}
                </span>
              ) : null}
            </Button>
            <div className="hidden min-w-0 items-center gap-2 px-2 sm:flex">
              <UserAvatar name={personName(user)} size="sm" />
              <div className="hidden min-w-0 leading-tight md:block">
                <p className="truncate text-sm font-medium">{personName(user)}</p>
                <p className="truncate text-[11px] text-muted-foreground">{titleCase(user.role)}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sign out">
              <LogOut />
            </Button>
          </div>
        </header>
        {isDemoMode() ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-warning/10 px-4 py-1.5 text-xs">
            <p>Demo mode. Records stay in this browser tab and are not sent to Django.</p>
            <button
              type="button"
              className="font-medium underline"
              onClick={() => {
                resetDb();
                void queryClient.invalidateQueries();
              }}
            >
              Reset demo data
            </button>
          </div>
        ) : null}
        {usingPermissionFallback ? (
          <div className="border-b bg-warning/10 px-4 py-2 text-xs">
            GET /auth/me/ did not include permissions. Navigation is using the documented defaults for {titleCase(user.role)}. The API still enforces access.
          </div>
        ) : null}
        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1440px] px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 md:px-6 md:py-6">
            {allowed ? children : <AccessDenied />}
          </div>
        </main>
      </div>
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}

function SidebarBody({
  collapsed,
  pathname,
  sections,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  sections: ReturnType<typeof visibleNavigation>;
  onNavigate: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={`flex h-14 items-center gap-2 border-b border-sidebar-border px-3 ${collapsed ? "justify-center" : ""}`}>
        <span className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
          WH
        </span>
        {collapsed ? null : (
          <div>
            <p className="text-sm font-semibold">Workforce Hub</p>
            <p className="text-[11px] text-sidebar-foreground/60">Helios Industries</p>
          </div>
        )}
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.id}>
            {collapsed ? null : (
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-sidebar-foreground/50 uppercase">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = item.isActive(pathname);
                return (
                  <li key={`${section.id}-${item.href}-${item.label}`}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      onClick={onNavigate}
                      className={`flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      } ${collapsed ? "justify-center" : ""}`}
                    >
                      <Icon className="size-4 shrink-0" />
                      {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
