import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, GripVertical } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { usePlanStore, type Item, type Category, type PriorityMode, type PlanSettings } from "@/store/usePlanStore";
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

  const editing = useMemo(() => items.find((i) => i.id === editingId) ?? null, [items, editingId]);

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
      const saved = await loadState<any>();
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
            <CardTitle>Your plan</CardTitle>
            <CardDescription>
              {formatMoney(settings.monthlyBudget, base)} / month • Start {settings.startDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">Active needs</div>
                <div className="text-lg font-semibold">{activeNeeds.length}</div>
              </div>
              <div className="rounded-xl border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">Active wants</div>
                <div className="text-lg font-semibold">{activeWants.length}</div>
              </div>
              <div className="rounded-xl border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">Achieved</div>
                <div className="text-lg font-semibold">{achieved.length}</div>
              </div>
              <div className="rounded-xl border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">Planned</div>
                <div className="text-lg font-semibold">{plannedCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="needs">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="needs">Needs</TabsTrigger>
            <TabsTrigger value="wants">Wants</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
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
              <select
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                value={toCurrency(settings.baseCurrency)}
                onChange={(e) => setSettings({ baseCurrency: e.target.value as Currency })}
              >
                {CURRENCIES.map((ccy) => (
                  <option key={ccy} value={ccy}>
                    {ccy}
                  </option>
                ))}
              </select>
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
            <select
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
              value={settings.carryover ? "yes" : "no"}
              onChange={(e) => setSettings({ carryover: e.target.value === "yes" })}
            >
              <option value="yes">Yes (unused budget rolls)</option>
              <option value="no">No (reset each month)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Priority mode</Label>
            <select
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
              value={settings.priorityMode}
              onChange={(e) => setSettings({ priorityMode: e.target.value as PriorityMode })}
            >
              <option value="rank">Rank (1 is highest)</option>
              <option value="weight">Weight (higher is better)</option>
            </select>
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
          <p className="text-xs text-neutral-500">
            Budget: {formatMoney(settings.monthlyBudget, base)} / month
          </p>
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
          <select
            className="h-10 w-24 rounded-xl border border-neutral-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
            value={newCcy}
            onChange={(e) => setNewCcy(e.target.value ? (e.target.value as Currency) : "")}
          >
            <option value="">—</option>
            {currenciesForRate.map((ccy) => (
              <option key={ccy} value={ccy}>
                {ccy}
              </option>
            ))}
          </select>
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
        <ul className="space-y-1 rounded-xl border border-neutral-200 p-2">
          {entries.map(([ccy, rate]) => (
            <li key={ccy} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">1 {ccy}</span>
              <span className="text-neutral-500">=</span>
              <Input
                className="h-8 w-24"
                inputMode="decimal"
                value={rate}
                onChange={(e) => updateRate(ccy, Number(e.target.value))}
              />
              <span className="text-neutral-500">{baseCurrency}</span>
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
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
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
}: {
  item: Item;
  onEdit: (id: string) => void;
  priorityMode: PriorityMode;
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
        dragHandleIcon={<GripVertical className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden />}
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
}: {
  category: Category;
  title: string;
  description: string;
  items: Item[];
  onEdit: (id: string) => void;
  onAdd?: () => void;
  addButtonLabel?: string;
  priorityMode: PriorityMode;
}) {
  const reorderItems = usePlanStore((s) => s.reorderItems);
  const active = items.filter((i) => !i.achieved);
  const achieved = items.filter((i) => i.achieved);

  const sorted = useMemo(() => {
    const activeItems = items.filter((i) => !i.achieved);
    return [...activeItems].sort((a, b) => {
      if (priorityMode === "rank") return a.priority - b.priority;
      return b.priority - a.priority;
    });
  }, [items, priorityMode]);
  const sortedAchieved = [...achieved].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const sortedIds = useMemo(() => sorted.map((i) => i.id), [sorted]);

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
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="text-sm text-neutral-500">No active items.</div>
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
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {sortedAchieved.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="mb-2 text-xs text-neutral-500">Achieved</div>
              <div className="space-y-2">
                {sortedAchieved.map((it) => (
                  <ItemRow key={it.id} item={it} onEdit={() => onEdit(it.id)} priorityMode={priorityMode} />
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
