import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, GripVertical, X, ListFilterIcon } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Layout } from "@/components/Layout";
import { PlanView } from "@/components/PlanView";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BorderedBox } from "@/components/ui/bordered-box";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemDialog } from "@/components/ItemDialog";
import { ItemRow } from "@/components/ItemRow";
import { Badge } from "@/components/ui/badge";
import { usePlanStore, type Item, type Category, type PriorityMode, type PlanSettings, type AppState } from "@/store/usePlanStore";
import { CURRENCIES, Currency, toCurrency } from "@/lib/currencies";
import { loadState, saveState } from "@/lib/storage";
import { buildAcquisitionPlan } from "@/lib/planner";
import { formatMoney } from "@/lib/utils";

export default function App() {
  const hydrated = usePlanStore((s) => s.hydrated);
  const setHydrated = usePlanStore((s) => s.setHydrated);
  const importState = usePlanStore((s) => s.importState);

  const items = usePlanStore((s) => s.items);
  const settings = usePlanStore((s) => s.settings);
  const setSettings = usePlanStore((s) => s.setSettings);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState<"need" | "want" | null>(null);
  const [settingsModal, setSettingsModal] = useState<"plan-config" | "fx-rates" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [filterLabelsNeed, setFilterLabelsNeed] = useState<string[]>([]);
  const [filterLabelsWant, setFilterLabelsWant] = useState<string[]>([]);

  const editing = useMemo(() => items.find((i) => i.id === editingId) ?? null, [items, editingId]);

  const allLabels = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => (i.labels ?? []).forEach((l) => set.add(l)));
    return [...set].sort();
  }, [items]);

  function nextPriorityForBottom(cat: Category): number {
    const inCategory = items.filter((i) => i.category === cat && !i.achieved);
    if (inCategory.length === 0) return settings.priorityMode === "rank" ? 1 : 0;
    const priorities = inCategory.map((i) => i.priority);
    if (settings.priorityMode === "rank") return Math.max(...priorities) + 1;
    return Math.min(...priorities) - 1;
  }
  const defaultPriority = addCategory ? nextPriorityForBottom(addCategory) : undefined;

  // Hydrate from IndexedDB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadState<AppState>();
      if (!cancelled && saved) {
        importState(saved);
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [importState, setHydrated]);

  // Persist changes (debounced)
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      const state = usePlanStore.getState();
      saveState({ version: state.version, items: state.items, settings: state.settings }).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [hydrated, items, settings]);

  const activeNeeds = items.filter((i) => i.category === "need" && !i.achieved);
  const activeWants = items.filter((i) => i.category === "want" && !i.achieved);
  const achieved = items.filter((i) => i.achieved);

  // Quick summary for header card
  const plan = useMemo(() => buildAcquisitionPlan(items, settings), [items, settings]);
  const plannedCount = plan.months.reduce((n, m) => n + m.picks.length, 0);

  const base = settings.baseCurrency;

  return (
    <Layout
      openPlanConfig={() => setSettingsModal("plan-config")}
      openFxRates={() => setSettingsModal("fx-rates")}
      openHelp={() => setHelpOpen(true)}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
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
              <BorderedBox className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">
                No plan generated. Add items and set a monthly budget (optional but recommended).
              </BorderedBox>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="needs">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="needs">
              Needs&ensp;<span className="text-muted">{activeNeeds.length}</span>
            </TabsTrigger>
            <TabsTrigger value="wants">
              Wants&ensp;<span className="text-muted">{activeWants.length}</span>
            </TabsTrigger>
            <TabsTrigger value="plan">
              Acquisition&ensp;<span className="text-muted">{achieved.length}/{plannedCount}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="needs">
            <ListSection
              category="need"
              title="Needs"
              description="Priority group 1"
              items={items.filter((i) => i.category === "need")}
              onEdit={(id) => {
                setEditingId(id);
                setAddCategory(null);
                setDialogOpen(true);
              }}
              onAdd={() => {
                setEditingId(null);
                setAddCategory("need");
                setDialogOpen(true);
              }}
              addButtonLabel="Add Need"
              priorityMode={settings.priorityMode}
              showLabels={settings.enableLabels}
              filterLabels={filterLabelsNeed}
              onFilterLabelsChange={setFilterLabelsNeed}
              onClearFilter={() => setFilterLabelsNeed([])}
              allLabels={allLabels}
            />
          </TabsContent>

          <TabsContent value="wants">
            <ListSection
              category="want"
              title="Wants"
              description="Priority group 2"
              items={items.filter((i) => i.category === "want")}
              onEdit={(id) => {
                setEditingId(id);
                setAddCategory(null);
                setDialogOpen(true);
              }}
              onAdd={() => {
                setEditingId(null);
                setAddCategory("want");
                setDialogOpen(true);
              }}
              addButtonLabel="Add Wish"
              priorityMode={settings.priorityMode}
              showLabels={settings.enableLabels}
              filterLabels={filterLabelsWant}
              onFilterLabelsChange={setFilterLabelsWant}
              onClearFilter={() => setFilterLabelsWant([])}
              allLabels={allLabels}
            />
          </TabsContent>

          <TabsContent value="plan">
            <div className="mt-4">
              <PlanView />
            </div>
          </TabsContent>
        </Tabs>

        <ItemDialog
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v);
            if (!v) {
              setEditingId(null);
              setAddCategory(null);
            }
          }}
          editing={editing}
          defaultCategory={!editing ? addCategory ?? undefined : undefined}
          defaultPriority={defaultPriority}
          enableLabels={settings.enableLabels}
          allLabels={allLabels}
        />

        <PlanConfigModal
          open={settingsModal === "plan-config"}
          onOpenChange={(open) => !open && setSettingsModal(null)}
          settings={settings}
          setSettings={setSettings}
        />
        <FxRatesModal
          open={settingsModal === "fx-rates"}
          onOpenChange={(open) => !open && setSettingsModal(null)}
          baseCurrency={base}
          fxRates={settings.fxRates ?? {}}
          onRatesChange={(fxRates) => setSettings({ fxRates })}
        />
        <HelpModal open={helpOpen} onOpenChange={setHelpOpen} />
      </div>
    </Layout>
  );
}

function PlanConfigModal({
  open,
  onOpenChange,
  settings,
  setSettings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PlanSettings;
  setSettings: (patch: Partial<PlanSettings>) => void;
}) {
  const base = settings.baseCurrency;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plan configuration</DialogTitle>
          <DialogDescription>
            Base currency, budget, start date, and how needs vs wants are balanced.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Base currency</Label>
              <Select
                value={toCurrency(settings.baseCurrency)}
                onChange={(e) => setSettings({ baseCurrency: e.target.value as Currency })}
              >
                {CURRENCIES.map((ccy) => (
                  <option key={ccy} value={ccy}>
                    {ccy}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Start date</Label>
              <Input
                type="date"
                value={settings.startDate}
                onChange={(e) => setSettings({ startDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Monthly free budget ({base})</Label>
            <Input
              inputMode="decimal"
              value={String(settings.monthlyBudget)}
              onChange={(e) => setSettings({ monthlyBudget: Number(e.target.value || 0) })}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label>Carryover</Label>
            <Select
              value={settings.carryover ? "yes" : "no"}
              onChange={(e) => setSettings({ carryover: e.target.value === "yes" })}
            >
              <option value="yes">Yes (unused budget rolls)</option>
              <option value="no">No (reset each month)</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Priority mode</Label>
            <Select
              value={settings.priorityMode}
              onChange={(e) => setSettings({ priorityMode: e.target.value as PriorityMode })}
            >
              <option value="rank">Rank (1 is highest)</option>
              <option value="weight">Weight (higher is better)</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Need:Want ratio</Label>
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                value={String(settings.fairnessRatioNeeds)}
                onChange={(e) => setSettings({ fairnessRatioNeeds: Math.max(1, Number(e.target.value || 1)) })}
                placeholder="2"
              />
              <Input
                inputMode="numeric"
                value={String(settings.fairnessRatioWants)}
                onChange={(e) => setSettings({ fairnessRatioWants: Math.max(1, Number(e.target.value || 1)) })}
                placeholder="1"
              />
            </div>
          </div>
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Advanced</div>
              <Checkbox
              label="Enable labels on items"
                checked={settings.enableLabels ?? false}
                onChange={(e) => setSettings({ enableLabels: e.target.checked })}
            >
              e.g. family, bike, living-room
            </Checkbox>
              <Checkbox
              label="Allow monthly budget exceed"
                checked={settings.allowBudgetExceed ?? false}
                onChange={(e) => setSettings({ allowBudgetExceed: e.target.checked })}
            >
              Manual items with target month can exceed budget
            </Checkbox>
              <Checkbox
              label="Enable monthly budget overrides"
                checked={settings.enableMonthlyBudgetOverrides ?? false}
                onChange={(e) => setSettings({ enableMonthlyBudgetOverrides: e.target.checked })}
            >
              Override budget for specific months
            </Checkbox>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FxRatesModal({
  open,
  onOpenChange,
  baseCurrency,
  fxRates,
  onRatesChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseCurrency: string;
  fxRates: Record<string, number>;
  onRatesChange: (rates: Record<string, number>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>FX rates</DialogTitle>
          <DialogDescription>
            Manual rates to convert other currencies to base ({baseCurrency}). 1 unit of currency = ? {baseCurrency}. Offline only.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <FxRatesEditor
            baseCurrency={baseCurrency}
            fxRates={fxRates}
            onRatesChange={onRatesChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FxRatesEditor({
  baseCurrency,
  fxRates,
  onRatesChange,
}: {
  baseCurrency: string;
  fxRates: Record<string, number>;
  onRatesChange: (rates: Record<string, number>) => void;
}) {
  const [newCcy, setNewCcy] = useState<Currency | "">("");
  const [newRate, setNewRate] = useState("");

  const addRate = () => {
    if (!newCcy || newCcy === baseCurrency) return;
    const rate = Number(newRate);
    if (!Number.isFinite(rate) || rate <= 0) return;
    onRatesChange({ ...fxRates, [newCcy]: rate });
    setNewCcy("");
    setNewRate("");
  };

  const removeRate = (ccy: string) => {
    const next = { ...fxRates };
    delete next[ccy];
    onRatesChange(next);
  };

  const updateRate = (ccy: string, value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    onRatesChange({ ...fxRates, [ccy]: value });
  };

  const entries = Object.entries(fxRates).filter(([ccy]) => ccy !== baseCurrency);
  const currenciesForRate = CURRENCIES.filter((c) => c !== baseCurrency);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Currency</Label>
          <Select
            className="w-24"
            value={newCcy}
            onChange={(e) => setNewCcy(e.target.value ? (e.target.value as Currency) : "")}
          >
            <option value="">—</option>
            {currenciesForRate.map((ccy) => (
              <option key={ccy} value={ccy}>
                {ccy}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Rate (1 = ? {baseCurrency})</Label>
          <Input
            className="w-24"
            inputMode="decimal"
            placeholder="0.92"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
          />
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addRate}>
          Add rate
        </Button>
      </div>
      {entries.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
          {entries.map(([ccy, rate]) => (
            <li key={ccy} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">1 {ccy}</span>
              <span className="text-muted">=</span>
              <Input
                className="h-8 w-24"
                inputMode="decimal"
                value={rate}
                onChange={(e) => updateRate(ccy, Number(e.target.value))}
              />
              <span className="text-muted">{baseCurrency}</span>
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => removeRate(ccy)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HelpModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How monthly planning works</DialogTitle>
          <DialogDescription>
            Each month adds your free budget (starting from the start date). The planner picks affordable items using a
            fair need/want ratio, with carryover optional.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
          <li>Only non-achieved items are considered.</li>
          <li>Items in base currency are planned; others use manual FX rates (Settings) to convert to base.</li>
          <li>Needs are favored but wants are interleaved (ratio control).</li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function SortableItemRow({
  item,
  onEdit,
  priorityMode,
  showLabels,
}: {
  item: Item;
  onEdit: (id: string) => void;
  priorityMode: PriorityMode;
  showLabels?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : undefined}>
      <ItemRow
        item={item}
        onEdit={() => onEdit(item.id)}
        priorityMode={priorityMode}
        dragHandleProps={{ attributes, listeners }}
        dragHandleIcon={<GripVertical className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-600" aria-hidden />}
        showLabels={showLabels}
      />
    </div>
  );
}

function ListSection({
  category,
  title,
  description,
  items,
  onEdit,
  onAdd,
  addButtonLabel,
  priorityMode,
  showLabels,
  filterLabels,
  onFilterLabelsChange,
  onClearFilter,
  allLabels,
}: {
  category: Category;
  title: string;
  description: string;
  items: Item[];
  onEdit: (id: string) => void;
  onAdd?: () => void;
  addButtonLabel?: string;
  priorityMode: PriorityMode;
  showLabels?: boolean;
  filterLabels?: string[];
  onFilterLabelsChange?: (labels: string[]) => void;
  onClearFilter?: () => void;
  allLabels?: string[];
}) {
  const reorderItems = usePlanStore((s) => s.reorderItems);

  const filteredItems = useMemo(() => {
    const list = filterLabels?.length && showLabels
      ? items.filter((i) => {
          const itemLabels = i.labels ?? [];
          return filterLabels.every((f) => itemLabels.includes(f));
        })
      : items;
    return list;
  }, [items, filterLabels, showLabels]);

  const achieved = filteredItems.filter((i) => i.achieved);

  const sorted = useMemo(() => {
    const activeItems = filteredItems.filter((i) => !i.achieved);
    return [...activeItems].sort((a, b) => {
      if (priorityMode === "rank") return a.priority - b.priority;
      return b.priority - a.priority;
    });
  }, [filteredItems, priorityMode]);
  const sortedAchieved = [...achieved].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const sortedIds = useMemo(() => sorted.map((i) => i.id), [sorted]);
  const hasFilter = showLabels && (filterLabels?.length ?? 0) > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = sortedIds.indexOf(active.id as string);
      const newIndex = sortedIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrder = arrayMove(sortedIds, oldIndex, newIndex);
      reorderItems(category, newOrder);
    },
    [category, sortedIds, reorderItems]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {showLabels && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <ListFilterIcon className="h-3.5 w-3.5" />
              </span>
              {hasFilter && (filterLabels ?? []).map((l) => (
                <Badge
                  key={l}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1 text-xs"
                >
                  {l}
                  <Button
                    type="button"
                    variant="ghost"
                    size="iconSm"
                    // className="hover:bg-neutral-300 dark:hover:bg-neutral-700"
                    onClick={() =>
                      onFilterLabelsChange?.(
                        (filterLabels ?? []).filter((x) => x !== l)
                      )
                    }
                    aria-label={`Remove filter ${l}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <Select
                className="h-8 w-auto min-w-[10rem] shrink-0 rounded-lg px-2 text-xs text-neutral-600 dark:text-neutral-300"
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  const current = filterLabels ?? [];
                  if (!current.includes(v)) {
                    onFilterLabelsChange?.([...current, v].sort());
                  }
                  e.currentTarget.value = "";
                }}
              >
                <option value="">Choose label…</option>
                {(allLabels ?? []).filter((l) => !(filterLabels ?? []).includes(l)).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
              {hasFilter && (
                <Button
                  type="button"
                  variant={null}
                  size="sm"
                  className="h-8 text-xs text-muted"
                  onClick={onClearFilter}
                >
                    <X size={16} />
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="text-sm text-muted">
              {hasFilter ? "No items match the filter." : "No active items."}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sorted.map((it) => (
                    <SortableItemRow
                      key={it.id}
                      item={it}
                      onEdit={onEdit}
                      priorityMode={priorityMode}
                      showLabels={showLabels}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {sortedAchieved.length > 0 && (
            <>
              <div className="mt-4 mb-2 text-xs text-muted">Achieved</div>
              <div className="space-y-2">
                {sortedAchieved.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    onEdit={() => onEdit(it.id)}
                    priorityMode={priorityMode}
                    showLabels={showLabels}
                  />
                ))}
              </div>
            </>
          )}

          {onAdd && addButtonLabel && (
            <div className="mt-4">
              <Button onClick={onAdd} className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                {addButtonLabel}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
