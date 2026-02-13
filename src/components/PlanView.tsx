import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Pencil, X } from "lucide-react";
import { usePlanStore } from "@/store/usePlanStore";
import { buildAcquisitionPlan } from "@/lib/planner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <button
        type="button"
        onClick={() => {
          setEditing(true);
          setInputValue(String(currentBudget));
        }}
        className="inline-flex items-center justify-center rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        aria-label="Edit budget"
      >
        <Pencil className="h-3 w-3" />
      </button>
      {hasOverride && (
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center justify-center rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
          aria-label="Reset to default"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function PlanView() {
  const items = usePlanStore((s) => s.items);
  const settings = usePlanStore((s) => s.settings);
  const setSettings = usePlanStore((s) => s.setSettings);

  const plan = useMemo(() => buildAcquisitionPlan(items, settings), [items, settings]);

  const plannedCount = plan.months.reduce((n, m) => n + m.picks.length, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Acquisition plan</CardTitle>
          <CardDescription>
            Start {plan.startDate} • {formatMoney(plan.monthlyBudget, plan.baseCurrency)} per month •{" "}
            {plan.carryover ? "carryover on" : "carryover off"} • ratio {plan.ratioNeeds}:{plan.ratioWants} (need:want)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Planned: {plannedCount}</Badge>
            <Badge variant="secondary">Unplanned: {plan.remainingUnplanned.length}</Badge>
            {plan.excludedOtherCurrencies.length > 0 && (
              <Badge variant="secondary">Excluded: {plan.excludedOtherCurrencies.length} (currency)</Badge>
            )}
          </div>

          {plan.months.length === 0 && (
            <div className="mt-4 rounded-xl border border-neutral-200 p-3 text-sm text-neutral-600">
              No plan generated. Add items and set a monthly budget (optional but recommended).
            </div>
          )}
        </CardContent>
      </Card>

      {plan.excludedOtherCurrencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-neutral-500" />
              Items excluded (currency mismatch)
            </CardTitle>
            <CardDescription>
              Budgeting uses base currency <b>{plan.baseCurrency}</b>. Convert these items to plan currency to include them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plan.excludedOtherCurrencies.map((it) => (
                <div key={it.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{it.title}</div>
                    <div className="text-xs text-neutral-500">
                      {it.category === "need" ? "Need" : "Want"} • {formatMoney(it.price, it.currency)}
                    </div>
                  </div>
                </div>
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
                  m.spent > m.budgetAdded + m.budgetCarryIn ? "text-red-600 dark:text-red-500" : "text-neutral-600"
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
                <span className={m.budgetCarryIn < 0 ? "text-red-600 dark:text-red-500 font-medium" : ""}>
                  {formatMoney(m.budgetCarryIn, plan.baseCurrency)}
                </span> • Carry-out{" "}
                <span className={m.budgetCarryOut < 0 ? "text-red-600 dark:text-red-500 font-medium" : ""}>
                  {formatMoney(m.budgetCarryOut, plan.baseCurrency)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {m.picks.length === 0 ? (
                <div className="text-sm text-neutral-500">No affordable items this month.</div>
              ) : (
                <div className="space-y-2">
                  {m.picks.map((p, idx) => (
                    <div
                      key={p.id}
                      className={cn(
                        "rounded-xl border p-3",
                        p.achieved
                          ? "border-neutral-200 bg-neutral-50"
                          : "border-neutral-200"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className={cn(
                              "truncate text-sm font-medium",
                              p.achieved && "text-neutral-500 line-through"
                            )}
                          >
                            {idx + 1}. {p.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                            {p.achieved && (
                              <Badge variant="secondary">Achieved</Badge>
                            )}
                            <Badge variant="outline">{p.category === "need" ? "Need" : "Want"}</Badge>
                            {p.targetMonthKey && (
                              <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                                {p.targetMonthKey}
                              </Badge>
                            )}
                            <span>{formatMoney(p.price, plan.baseCurrency)}</span>
                            {p.originalPrice != null && (
                              <span className="text-neutral-400">
                                (≈ {formatMoney(p.originalPrice, p.currency)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {plan.remainingUnplanned.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="text-xs text-neutral-500">
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
