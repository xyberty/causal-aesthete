import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Pencil, X } from "lucide-react";
import { usePlanStore } from "@/store/usePlanStore";
import { buildAcquisitionPlan } from "@/lib/planner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BorderedBox } from "@/components/ui/bordered-box";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { cn, formatMoney } from "@/lib/utils";

function InlineBudgetEditor({
  monthKey,
  currentBudget,
  defaultBudget,
  baseCurrency,
  overrides,
  onOverrideChange,
}: {
  monthKey: string;
  currentBudget: number;
  defaultBudget: number;
  baseCurrency: string;
  overrides: Record<string, number>;
  onOverrideChange: (monthKey: string, value: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(currentBudget));
  const hasOverride = overrides[monthKey] !== undefined;

  useEffect(() => {
    if (!editing) {
      setInputValue(String(currentBudget));
    }
  }, [currentBudget, editing]);

  const handleSave = () => {
    const numValue = Number(inputValue);
    if (Number.isFinite(numValue) && numValue >= 0) {
      onOverrideChange(monthKey, numValue === defaultBudget ? null : numValue);
      setEditing(false);
    } else {
      setInputValue(String(currentBudget));
      setEditing(false);
    }
  };

  const handleReset = () => {
    onOverrideChange(monthKey, null);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <Input
          type="number"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
            if (e.key === "Escape") {
              setInputValue(String(currentBudget));
              setEditing(false);
            }
          }}
          className="h-5 w-20 px-1.5 text-xs"
          autoFocus
        />
        <span className="text-xs">{baseCurrency}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {formatMoney(currentBudget, baseCurrency)}
      <span className="inline-flex items-center gap-0">
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          onClick={() => {
            setEditing(true);
            setInputValue(String(currentBudget));
          }}
          aria-label="Edit budget"
        >
          <Pencil className="h-3" />
        </Button>
        {hasOverride && (
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            className="text-neutral-400 hover:text-red-600 dark:hover:text-red-500"
            onClick={handleReset}
            aria-label="Reset to default"
          >
            <X className="h-3" />
          </Button>
        )}
      </span>
    </span>
  );
}

export function PlanView() {
  const items = usePlanStore((s) => s.items);
  const settings = usePlanStore((s) => s.settings);
  const setSettings = usePlanStore((s) => s.setSettings);

  const plan = useMemo(() => buildAcquisitionPlan(items, settings), [items, settings]);

  return (
    <div className="space-y-4">
      {plan.excludedOtherCurrencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted" />
              Items excluded (currency mismatch)
            </CardTitle>
            <CardDescription>
              Budgeting uses base currency <b>{plan.baseCurrency}</b>. Convert these items to plan currency to include them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plan.excludedOtherCurrencies.map((it) => (
                <BorderedBox key={it.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{it.title}</div>
                    <div className="text-xs text-muted">
                      {it.category === "need" ? "Need" : "Want"} • {formatMoney(it.price, it.currency)}
                    </div>
                  </div>
                </BorderedBox>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {plan.months.map((m) => (
          <Card key={m.monthKey}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{m.monthKey}</span>
                <span className={cn(
                  "text-sm font-medium",
                  m.spent > m.budgetAdded + m.budgetCarryIn
                    ? "text-destructive"
                    : "text-neutral-600 dark:text-neutral-300"
                )}>
                  Spent {formatMoney(m.spent, plan.baseCurrency)}
                </span>
              </CardTitle>
              <CardDescription>
                <span className="inline-flex items-center gap-1">
                  Added{" "}
                  {settings.enableMonthlyBudgetOverrides ? (
                    <InlineBudgetEditor
                      monthKey={m.monthKey}
                      currentBudget={m.budgetAdded}
                      defaultBudget={plan.monthlyBudget}
                      baseCurrency={plan.baseCurrency}
                      overrides={settings.monthlyBudgetOverrides ?? {}}
                      onOverrideChange={(monthKey, value) => {
                        const newOverrides = { ...(settings.monthlyBudgetOverrides ?? {}) };
                        if (value === null || value === undefined || value === plan.monthlyBudget) {
                          delete newOverrides[monthKey];
                        } else {
                          newOverrides[monthKey] = value;
                        }
                        setSettings({ monthlyBudgetOverrides: newOverrides });
                      }}
                    />
                  ) : (
                    formatMoney(m.budgetAdded, plan.baseCurrency)
                  )}
                </span>{" "}
                • Carry-in{" "}
                <span className={m.budgetCarryIn < 0 ? "text-destructive font-medium" : ""}>
                  {formatMoney(m.budgetCarryIn, plan.baseCurrency)}
                </span> • Carry-out{" "}
                <span className={m.budgetCarryOut < 0 ? "text-destructive font-medium" : ""}>
                  {formatMoney(m.budgetCarryOut, plan.baseCurrency)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {m.picks.length === 0 ? (
                <div className="text-sm text-muted">No affordable items this month.</div>
              ) : (
                <div className="space-y-2">
                  {m.picks.map((p, idx) => (
                    <BorderedBox key={p.id} variant={p.achieved ? "filled" : "default"}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className={cn(
                              "truncate text-sm font-medium",
                              p.achieved && "text-muted line-through"
                            )}
                          >
                            {idx + 1}. {p.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            {p.achieved && (
                              <Badge variant="secondary">Achieved</Badge>
                            )}
                            <Badge variant="outline">{p.category === "need" ? "Need" : "Want"}</Badge>
                            {p.targetMonthKey && (
                              <Badge variant="info">{p.targetMonthKey}</Badge>
                            )}
                            <span>{formatMoney(p.price, plan.baseCurrency)}</span>
                            {p.originalPrice != null && (
                              <span className="text-muted">
                                (≈ {formatMoney(p.originalPrice, p.currency)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </BorderedBox>
                  ))}
                </div>
              )}

              {plan.remainingUnplanned.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="text-xs text-muted">
                    Remaining unplanned items: {plan.remainingUnplanned.length} (may require more months / bigger budget)
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
