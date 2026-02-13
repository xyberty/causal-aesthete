import { Item, PlanSettings } from "@/store/usePlanStore";
import { addMonths, ymKeyFromDate, formatMoney } from "@/lib/utils";

export type PlannedItem = {
  id: string;
  title: string;
  category: "need" | "want";
  /** Price in base currency (used for planning) */
  price: number;
  currency: string;
  /** Original price when item was in another currency (for display) */
  originalPrice?: number;
  priority: number;
  achieved: boolean;
  score: number;
  /** Target month when item should be achieved (for manual items) */
  targetMonthKey?: string;
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

/** Convert amount to base currency. Returns null if no rate (exclude from plan). */
function toBaseAmount(
  price: number,
  currency: string,
  baseCurrency: string,
  fxRates: Record<string, number>
): number | null {
  if (currency === baseCurrency) return price;
  const rate = fxRates[currency];
  if (rate == null || rate <= 0 || !Number.isFinite(rate)) return null;
  const converted = price * rate;
  return Number.isFinite(converted) ? converted : null;
}

function desirabilityScore(priceInBase: number, priority: number, settings: PlanSettings, maxRank: number) {
  const alpha = settings.alphaPricePenalty ?? 0.35;
  const raw =
    settings.priorityMode === "rank"
      ? Math.max(1, (maxRank + 1) - priority)
      : Math.max(0, priority);

  const p = Math.max(0.01, priceInBase);
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

/** First unspent (incomplete) month the item fits into, given existing achieved items' months. Used when marking achieved. */
export function getCurrentMonthForNewAchieved(
  settings: PlanSettings,
  items: Item[],
  itemId: string,
  overrideAchievedMonths?: Record<string, string>
): string {
  const item = items.find((i) => i.id === itemId);
  if (!item) return new Date().toISOString().slice(0, 7);

  const priceInBase = toBaseAmount(
    item.price,
    item.currency,
    settings.baseCurrency,
    settings.fxRates ?? {}
  );
  if (priceInBase == null || priceInBase <= 0) return new Date(settings.startDate + "T00:00:00").toISOString().slice(0, 7);

  const achievedWithMonth = items.filter(
    (i) => i.achieved && (i.achievedInMonthKey ?? overrideAchievedMonths?.[i.id])
  );
  const byMonth: Record<string, { priceInBase: number }[]> = {};
  for (const it of achievedWithMonth) {
    const monthKey = it.achievedInMonthKey ?? overrideAchievedMonths?.[it.id];
    if (!monthKey) continue;
    const p = toBaseAmount(it.price, it.currency, settings.baseCurrency, settings.fxRates ?? {});
    if (p != null && p > 0) {
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push({ priceInBase: p });
    }
  }

  const start = new Date(settings.startDate + "T00:00:00");
  const monthlyBudget = Number(settings.monthlyBudget || 0);
  const carryover = !!settings.carryover;
  const maxMonths = Math.max(1, settings.maxMonths ?? 36);

  let carry = 0;
  for (let m = 0; m < maxMonths; m++) {
    const monthDate = addMonths(start, m);
    const monthKey = ymKeyFromDate(monthDate);
    let remaining = monthlyBudget + (carryover ? carry : 0);
    const inMonth = byMonth[monthKey] ?? [];
    for (const { priceInBase: p } of inMonth) remaining -= p;
    if (remaining >= priceInBase) return monthKey;
    carry = carryover ? remaining : 0;
  }
  return ymKeyFromDate(start);
}

export function buildAcquisitionPlan(items: Item[], settings: PlanSettings): AcquisitionPlan {
  const baseCurrency = settings.baseCurrency;
  const startDate = settings.startDate;
  const monthlyBudget = Number(settings.monthlyBudget || 0);
  const carryover = !!settings.carryover;

  const active = items.filter((it) => !it.achieved);
  const fxRates = settings.fxRates ?? {};

  // Convert to base: include items in base currency or with a manual FX rate
  type WithBase = { item: Item; priceInBase: number };
  const withBase: WithBase[] = [];
  const excluded: PlannedItem[] = [];

  for (const it of active) {
    const priceInBase = toBaseAmount(it.price, it.currency, baseCurrency, fxRates);
    if (priceInBase !== null) {
      withBase.push({ item: it, priceInBase });
    } else {
      excluded.push({
        id: it.id,
        title: it.title,
        category: it.category,
        price: it.price,
        currency: it.currency,
        priority: it.priority,
        achieved: it.achieved,
        score: 0,
      });
    }
  }

  // Separate items with targetMonthKey (manual) from automatic items
  const needsWithTarget = withBase.filter((w) => w.item.category === "need" && w.item.targetMonthKey);
  const wantsWithTarget = withBase.filter((w) => w.item.category === "want" && w.item.targetMonthKey);
  const needsAuto = withBase.filter((w) => w.item.category === "need" && !w.item.targetMonthKey);
  const wantsAuto = withBase.filter((w) => w.item.category === "want" && !w.item.targetMonthKey);

  const maxRank = settings.priorityMode === "rank"
    ? Math.max(1, ...withBase.map((w) => w.item.priority || 1))
    : 1;

  // Manual items (with targetMonthKey) - these get highest priority
  const manualNeedsByMonth: Record<string, PlannedItem[]> = {};
  for (const { item: it, priceInBase } of needsWithTarget) {
    const monthKey = it.targetMonthKey!;
    if (!manualNeedsByMonth[monthKey]) manualNeedsByMonth[monthKey] = [];
    manualNeedsByMonth[monthKey].push({
      id: it.id,
      title: it.title,
      category: it.category,
      price: priceInBase,
      currency: it.currency,
      ...(it.currency !== baseCurrency && { originalPrice: it.price }),
      priority: it.priority,
      achieved: it.achieved,
      targetMonthKey: monthKey,
      // Give manual items a very high score to prioritize them
      score: desirabilityScore(priceInBase, it.priority, settings, maxRank) * 1000,
    });
  }

  const manualWantsByMonth: Record<string, PlannedItem[]> = {};
  for (const { item: it, priceInBase } of wantsWithTarget) {
    const monthKey = it.targetMonthKey!;
    if (!manualWantsByMonth[monthKey]) manualWantsByMonth[monthKey] = [];
    manualWantsByMonth[monthKey].push({
      id: it.id,
      title: it.title,
      category: it.category,
      price: priceInBase,
      currency: it.currency,
      ...(it.currency !== baseCurrency && { originalPrice: it.price }),
      priority: it.priority,
      achieved: it.achieved,
      targetMonthKey: monthKey,
      // Give manual items a very high score to prioritize them
      score: desirabilityScore(priceInBase, it.priority, settings, maxRank) * 1000,
    });
  }

  // Automatic items (without targetMonthKey) - sorted by score
  let needsPool: PlannedItem[] = needsAuto.map(({ item: it, priceInBase }) => ({
    id: it.id,
    title: it.title,
    category: it.category,
    price: priceInBase,
    currency: it.currency,
    ...(it.currency !== baseCurrency && { originalPrice: it.price }),
    priority: it.priority,
    achieved: it.achieved,
    score: desirabilityScore(priceInBase, it.priority, settings, maxRank),
  })).sort(sortByScoreDesc);

  let wantsPool: PlannedItem[] = wantsAuto.map(({ item: it, priceInBase }) => ({
    id: it.id,
    title: it.title,
    category: it.category,
    price: priceInBase,
    currency: it.currency,
    ...(it.currency !== baseCurrency && { originalPrice: it.price }),
    priority: it.priority,
    achieved: it.achieved,
    score: desirabilityScore(priceInBase, it.priority, settings, maxRank),
  })).sort(sortByScoreDesc);

  const ratioNeeds = Math.max(1, settings.fairnessRatioNeeds || 2);
  const ratioWants = Math.max(1, settings.fairnessRatioWants || 1);

  // Achieved items: assign month (stored or first month they fit), then place in plan
  const achievedItems = items.filter((it) => it.achieved);
  const achievedWithKey = achievedItems.filter((it) => it.achievedInMonthKey);
  const achievedNoKey = achievedItems.filter((it) => !it.achievedInMonthKey).sort((a, b) => a.id.localeCompare(b.id));
  const tempMonths: Record<string, string> = {};
  for (const it of achievedWithKey) tempMonths[it.id] = it.achievedInMonthKey!;
  for (const it of achievedNoKey) tempMonths[it.id] = getCurrentMonthForNewAchieved(settings, items, it.id, tempMonths);

  const achievedByMonth: Record<string, PlannedItem[]> = {};
  for (const it of achievedItems) {
    const priceInBase = toBaseAmount(it.price, it.currency, baseCurrency, fxRates);
    if (priceInBase == null) continue;
    const monthKey = tempMonths[it.id] ?? it.achievedInMonthKey!;
    const planned: PlannedItem = {
      id: it.id,
      title: it.title,
      category: it.category,
      price: priceInBase,
      currency: it.currency,
      ...(it.currency !== baseCurrency && { originalPrice: it.price }),
      priority: it.priority,
      achieved: true,
      score: 0,
    };
    if (!achievedByMonth[monthKey]) achievedByMonth[monthKey] = [];
    achievedByMonth[monthKey].push(planned);
  }

  const months: PlanMonth[] = [];
  const maxMonths = Math.max(1, settings.maxMonths || 36);

  const start = new Date(startDate + "T00:00:00");
  let carry = 0;

  for (let m = 0; m < maxMonths; m++) {
    const monthDate = addMonths(start, m);
    const monthKey = ymKeyFromDate(monthDate);
    const achievedPicks = achievedByMonth[monthKey] ?? [];
    
    // Check if we should continue (manual items might be in future months)
    const hasManualItems = (manualNeedsByMonth[monthKey]?.length ?? 0) > 0 || 
                           (manualWantsByMonth[monthKey]?.length ?? 0) > 0;
    if (needsPool.length === 0 && wantsPool.length === 0 && achievedPicks.length === 0 && !hasManualItems) break;

    const budgetAdded = monthlyBudget;
    const allowExceed = settings.allowBudgetExceed ?? false;
    // Carry-in: if carryover is enabled OR allowExceed is enabled, use carry (can be negative)
    // Otherwise, no carry-in
    const budgetCarryIn = (carryover || allowExceed) ? carry : 0;
    let remaining = budgetAdded + budgetCarryIn;

    const picks: PlannedItem[] = [...achievedPicks];
    for (const p of achievedPicks) remaining -= p.price;
    let pickedNeeds = achievedPicks.filter((p) => p.category === "need").length;
    let pickedWants = achievedPicks.filter((p) => p.category === "want").length;

    // First, place manual items (with targetMonthKey) for this month
    const manualNeeds = manualNeedsByMonth[monthKey] ?? [];
    const manualWants = manualWantsByMonth[monthKey] ?? [];
    
    // Sort manual items by priority (rank: lower first, weight: higher first)
    const sortedManualNeeds = [...manualNeeds].sort((a, b) => {
      if (settings.priorityMode === "rank") return a.priority - b.priority;
      return b.priority - a.priority;
    });
    const sortedManualWants = [...manualWants].sort((a, b) => {
      if (settings.priorityMode === "rank") return a.priority - b.priority;
      return b.priority - a.priority;
    });

    // Place manual items - if allowExceed is true, place them even if exceeding budget
    for (const manualItem of [...sortedManualNeeds, ...sortedManualWants]) {
      if (allowExceed || manualItem.price <= remaining) {
        picks.push(manualItem);
        remaining -= manualItem.price;
        if (manualItem.category === "need") pickedNeeds += 1;
        else pickedWants += 1;
        // Remove from manual pools
        if (manualItem.category === "need") {
          const idx = manualNeedsByMonth[monthKey]?.findIndex((p) => p.id === manualItem.id);
          if (idx !== undefined && idx >= 0) manualNeedsByMonth[monthKey].splice(idx, 1);
        } else {
          const idx = manualWantsByMonth[monthKey]?.findIndex((p) => p.id === manualItem.id);
          if (idx !== undefined && idx >= 0) manualWantsByMonth[monthKey].splice(idx, 1);
        }
      }
    }

    // Then, fill remaining budget with automatic items
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
    // If allowExceed is true, allow negative carryout (overconsumption) even if carryover is false
    // This shows the overconsumption amount in the UI
    // Otherwise, carryout is 0 if negative (no carryover of debt)
    const budgetCarryOut = allowExceed 
      ? remaining  // Can be negative, showing overconsumption
      : (carryover ? Math.max(0, remaining) : 0);  // Only positive if carryover enabled
    // Carry forward: if allowExceed is true, carry negative values (debt); 
    // if carryover is enabled, carry positive values; otherwise don't carry
    if (allowExceed) {
      carry = budgetCarryOut;  // Can be negative (debt carries forward)
    } else if (carryover) {
      carry = Math.max(0, budgetCarryOut);  // Only positive carryover
    } else {
      carry = 0;  // No carryover
    }

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

  // Collect remaining unplanned items (automatic + manual that couldn't fit)
  const remainingManual: PlannedItem[] = [];
  for (const monthItems of Object.values(manualNeedsByMonth)) {
    remainingManual.push(...monthItems);
  }
  for (const monthItems of Object.values(manualWantsByMonth)) {
    remainingManual.push(...monthItems);
  }
  const remainingUnplanned = [...needsPool, ...wantsPool, ...remainingManual].sort(sortByScoreDesc);

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
