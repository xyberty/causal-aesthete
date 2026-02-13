import { Item, PlanSettings } from "@/store/usePlanStore";
import { addMonths, ymKeyFromDate, formatMoney } from "@/lib/utils";

export type PlannedItem = {
  id: string;
  title: string;
  category: "need" | "want";
  price: number;
  currency: string;
  priority: number;
  achieved: boolean;
  score: number;
};

export type PlanMonth = {
  monthKey: string; // YYYY-MM
  budgetAdded: number;
  budgetCarryIn: number;
  spent: number;
  budgetCarryOut: number;
  picks: PlannedItem[];
};

export type AcquisitionPlan = {
  baseCurrency: string;
  startDate: string;
  monthlyBudget: number;
  carryover: boolean;
  ratioNeeds: number;
  ratioWants: number;
  months: PlanMonth[];
  excludedOtherCurrencies: PlannedItem[];
  remainingUnplanned: PlannedItem[];
};

function desirabilityScore(item: Item, settings: PlanSettings, maxRank: number) {
  const alpha = settings.alphaPricePenalty ?? 0.35;
  const raw =
    settings.priorityMode === "rank"
      ? Math.max(1, (maxRank + 1) - item.priority)
      : Math.max(0, item.priority);

  const p = Math.max(0.01, item.price);
  return raw / Math.pow(p, alpha);
}

function sortByScoreDesc(a: PlannedItem, b: PlannedItem) {
  if (b.score !== a.score) return b.score - a.score;
  // tie-break: higher priority first (rank lower; weight higher)
  return a.price - b.price;
}

function nextAffordable(pool: PlannedItem[], remaining: number) {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].achieved && pool[i].price <= remaining) return i;
  }
  return -1;
}

function belowTargetShare(pickedNeeds: number, pickedWants: number, ratioNeeds: number, ratioWants: number) {
  const total = pickedNeeds + pickedWants;
  if (total === 0) return "need" as const; // start with need
  const targetNeeds = ratioNeeds / (ratioNeeds + ratioWants);
  const currentNeeds = pickedNeeds / total;
  return currentNeeds < targetNeeds ? ("need" as const) : ("want" as const);
}

export function buildAcquisitionPlan(items: Item[], settings: PlanSettings): AcquisitionPlan {
  const baseCurrency = settings.baseCurrency;
  const startDate = settings.startDate;
  const monthlyBudget = Number(settings.monthlyBudget || 0);
  const carryover = !!settings.carryover;

  const active = items.filter((it) => !it.achieved);
  const achieved = items.filter((it) => it.achieved); // not used in planning

  // currency handling: plan only baseCurrency items
  const eligible = active.filter((it) => it.currency === baseCurrency);
  const excluded = active.filter((it) => it.currency !== baseCurrency).map((it) => ({
    id: it.id,
    title: it.title,
    category: it.category,
    price: it.price,
    currency: it.currency,
    priority: it.priority,
    achieved: it.achieved,
    score: 0,
  }));

  const needs = eligible.filter((it) => it.category === "need");
  const wants = eligible.filter((it) => it.category === "want");

  // Determine maxRank for score conversion
  const maxRank = settings.priorityMode === "rank"
    ? Math.max(1, ...eligible.map((i) => i.priority || 1))
    : 1;

  let needsPool: PlannedItem[] = needs.map((it) => ({
    id: it.id,
    title: it.title,
    category: it.category,
    price: it.price,
    currency: it.currency,
    priority: it.priority,
    achieved: it.achieved,
    score: desirabilityScore(it, settings, maxRank),
  })).sort(sortByScoreDesc);

  let wantsPool: PlannedItem[] = wants.map((it) => ({
    id: it.id,
    title: it.title,
    category: it.category,
    price: it.price,
    currency: it.currency,
    priority: it.priority,
    achieved: it.achieved,
    score: desirabilityScore(it, settings, maxRank),
  })).sort(sortByScoreDesc);

  const ratioNeeds = Math.max(1, settings.fairnessRatioNeeds || 2);
  const ratioWants = Math.max(1, settings.fairnessRatioWants || 1);

  const months: PlanMonth[] = [];
  const maxMonths = Math.max(1, settings.maxMonths || 36);

  const start = new Date(startDate + "T00:00:00");
  let carry = 0;

  for (let m = 0; m < maxMonths; m++) {
    if (needsPool.length === 0 && wantsPool.length === 0) break;

    const monthDate = addMonths(start, m);
    const monthKey = ymKeyFromDate(monthDate);

    const budgetAdded = monthlyBudget;
    const budgetCarryIn = carryover ? carry : 0;
    let remaining = budgetAdded + budgetCarryIn;

    const picks: PlannedItem[] = [];
    let pickedNeeds = 0;
    let pickedWants = 0;

    // pick loop: while we can afford something in either pool
    // Safety against infinite loop: track if we made progress
    while (true) {
      const canNeed = nextAffordable(needsPool, remaining) !== -1;
      const canWant = nextAffordable(wantsPool, remaining) !== -1;

      if (!canNeed && !canWant) break;

      const preferred = belowTargetShare(pickedNeeds, pickedWants, ratioNeeds, ratioWants);

      let chosenPool = preferred === "need" ? needsPool : wantsPool;
      let altPool = preferred === "need" ? wantsPool : needsPool;

      let idx = nextAffordable(chosenPool, remaining);
      if (idx === -1) {
        idx = nextAffordable(altPool, remaining);
        if (idx === -1) break;
        chosenPool = altPool;
      }

      const chosen = chosenPool.splice(idx, 1)[0];
      picks.push(chosen);
      remaining -= chosen.price;

      if (chosen.category === "need") pickedNeeds += 1;
      else pickedWants += 1;
    }

    const spent = picks.reduce((s, p) => s + p.price, 0);
    const budgetCarryOut = carryover ? remaining : 0;
    carry = budgetCarryOut;

    months.push({
      monthKey,
      budgetAdded,
      budgetCarryIn,
      spent,
      budgetCarryOut,
      picks,
    });

    // If monthlyBudget is 0 and carryover doesn't help, stop to avoid empty months forever
    if (monthlyBudget <= 0 && picks.length === 0) break;
  }

  const remainingUnplanned = [...needsPool, ...wantsPool].sort(sortByScoreDesc);

  return {
    baseCurrency,
    startDate,
    monthlyBudget,
    carryover,
    ratioNeeds,
    ratioWants,
    months,
    excludedOtherCurrencies: excluded,
    remainingUnplanned,
  };
}

export function planSummaryText(plan: AcquisitionPlan) {
  const totalMonths = plan.months.length;
  const totalSpent = plan.months.reduce((s, m) => s + m.spent, 0);
  return `${totalMonths} month(s), spent ${formatMoney(totalSpent, plan.baseCurrency)}`;
}
