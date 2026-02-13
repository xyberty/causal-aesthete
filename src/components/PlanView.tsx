import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { usePlanStore } from "@/store/usePlanStore";
import { buildAcquisitionPlan } from "@/lib/planner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatMoney } from "@/lib/utils";

export function PlanView() {
  const items = usePlanStore((s) => s.items);
  const settings = usePlanStore((s) => s.settings);

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
                <span className="text-sm font-medium text-neutral-600">
                  Spent {formatMoney(m.spent, plan.baseCurrency)}
                </span>
              </CardTitle>
              <CardDescription>
                Added {formatMoney(m.budgetAdded, plan.baseCurrency)} • Carry-in{" "}
                {formatMoney(m.budgetCarryIn, plan.baseCurrency)} • Carry-out{" "}
                {formatMoney(m.budgetCarryOut, plan.baseCurrency)}
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
