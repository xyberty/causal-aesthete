import { ReactNode } from "react";
import { Heart, MoreHorizontal } from "lucide-react";
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

export type LayoutProps = {
  children: ReactNode;
  openPlanConfig?: () => void;
  openFxRates?: () => void;
  openHelp?: () => void;
};

export function Layout({ children, openPlanConfig, openFxRates, openHelp }: LayoutProps) {
  const resetAll = usePlanStore((s) => s.resetAll);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <Heart className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Wish Plan</div>
              <div className="text-xs text-neutral-500">Local-only • Export/Import</div>
            </div>
          </div>

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
                className="text-red-600 focus:text-red-600"
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
      </header>

      <main className="mx-auto max-w-4xl px-4 py-4">{children}</main>

      <footer className="mx-auto max-w-4xl px-4 pb-8 pt-2 text-xs text-neutral-400">
        Built for local device storage. No network calls.
      </footer>
    </div>
  );
}
