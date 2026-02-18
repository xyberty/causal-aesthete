import { ReactNode } from "react";
import { useTheme } from "next-themes";
import { Check, Heart, MoreHorizontal, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportExport } from "@/components/ImportExport";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { usePlanStore } from "@/store/usePlanStore";

type ThemeValue = "system" | "light" | "dark";

const THEME_OPTIONS: { value: ThemeValue; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export type LayoutProps = {
  children: ReactNode;
  openPlanConfig?: () => void;
  openFxRates?: () => void;
  openHelp?: () => void;
};

export function Layout({ children, openPlanConfig, openFxRates, openHelp }: LayoutProps) {
  const resetAll = usePlanStore((s) => s.resetAll);
  const { theme, setTheme } = useTheme();

  const current = (theme ?? "system") as ThemeValue;
  const themeLabel: Record<ThemeValue, string> = {
    system: "System",
    light: "Light",
    dark: "Dark",
  };
  const ThemeIcon = THEME_OPTIONS.find((o) => o.value === current)?.Icon ?? Monitor;

  return (
    <div className="min-h-screen bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900">
              <Heart className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">DNWP</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Local-only wish list + acquisition planner</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Theme: ${themeLabel[current]}`}
                  title={`Theme: ${themeLabel[current]}`}
                >
                  <ThemeIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {THEME_OPTIONS.map(({ value, label, Icon }) => (
                  <DropdownMenuItem
                    key={value}
                    onSelect={() => setTheme(value)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {current === value && <Check className="h-4 w-4 shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Menu">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(openPlanConfig != null || openFxRates != null) && (
                  <>
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                    {openPlanConfig != null && (
                      <DropdownMenuItem onSelect={openPlanConfig}>Plan configuration…</DropdownMenuItem>
                    )}
                    {openFxRates != null && (
                      <DropdownMenuItem onSelect={openFxRates}>FX rates…</DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                {openHelp != null && (
                  <>
                    <DropdownMenuLabel>Help</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={openHelp}>How it works?</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuLabel>Data</DropdownMenuLabel>
                <ImportExport />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500"
                  onSelect={(e) => {
                    e.preventDefault();
                    if (confirm("Reset everything? This cannot be undone.")) resetAll();
                  }}
                >
                  Reset all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-4">{children}</main>

      <footer className="mx-auto max-w-4xl px-4 pb-8 pt-2 text-xs text-neutral-400 dark:text-neutral-500">
        Built for local device storage. No network calls.
      </footer>
    </div>
  );
}
