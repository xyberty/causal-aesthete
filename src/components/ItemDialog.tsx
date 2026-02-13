import { useEffect, useMemo, useState } from "react";
import { Item, Category, usePlanStore } from "@/store/usePlanStore";
import { CURRENCIES, toCurrency } from "@/lib/currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabelCombobox } from "@/components/LabelCombobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type FormState = {
  title: string;
  price: string;
  currency: string;
  category: Category;
  labels: string[];
};

function toForm(item?: Item): FormState {
  return {
    title: item?.title ?? "",
    price: item ? String(item.price) : "",
    currency: item ? toCurrency(item.currency) : "EUR",
    category: item?.category ?? "need",
    labels: item?.labels ? [...item.labels] : [],
  };
}

export function ItemDialog({
  open,
  onOpenChange,
  editing,
  defaultCategory,
  defaultPriority,
  enableLabels,
  allLabels,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Item | null;
  /** When set, add form uses this category and hides the category field */
  defaultCategory?: Category;
  /** When adding with defaultCategory, use this priority (append to bottom of list) */
  defaultPriority?: number;
  /** When true, show label selector (advanced feature). */
  enableLabels?: boolean;
  /** All labels ever used on any item (for dropdown suggestions). */
  allLabels?: string[];
}) {
  const addItem = usePlanStore((s) => s.addItem);
  const updateItem = usePlanStore((s) => s.updateItem);

  const [form, setForm] = useState<FormState>(() => toForm(editing ?? undefined));
  useEffect(() => {
    const base = editing ?? undefined;
    const initial = toForm(base);
    if (!base && defaultCategory) initial.category = defaultCategory;
    setForm(initial);
  }, [editing, open, defaultCategory]);

  const isEdit = !!editing;

  const parsed = useMemo(() => {
    const price = Number(form.price);
    return {
      title: form.title.trim(),
      price: Number.isFinite(price) ? price : NaN,
    };
  }, [form]);

  const valid = parsed.title.length > 0 && Number.isFinite(parsed.price) && parsed.price >= 0;

  function submit() {
    if (!valid) return;

    const priority =
      editing !== undefined && editing !== null
        ? editing.priority
        : defaultPriority !== undefined
          ? defaultPriority
          : 1;

    const payload = {
      title: parsed.title,
      price: parsed.price,
      currency: toCurrency(form.currency.trim().toUpperCase() || "EUR"),
      category: form.category,
      priority,
      achieved: editing?.achieved ?? false,
      ...(enableLabels && { labels: form.labels }),
    };

    if (editing) updateItem(editing.id, payload);
    else addItem(payload);

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : defaultCategory ? `Add ${defaultCategory === "need" ? "need" : "wish"}` : "Add item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="e.g., New headphones"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Price</Label>
              <Input
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <select
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                value={toCurrency(form.currency)}
                onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}
              >
                {CURRENCIES.map((ccy) => (
                  <option key={ccy} value={ccy}>
                    {ccy}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(!defaultCategory || isEdit) && (
            <div className="space-y-1">
              <Label>Category</Label>
              <select
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                value={form.category}
                onChange={(e) => setForm((s) => ({ ...s, category: e.target.value as Category }))}
              >
                <option value="need">Need</option>
                <option value="want">Want</option>
              </select>
            </div>
          )}

          {enableLabels && (
            <div className="space-y-1">
              <Label>Labels</Label>
              <LabelCombobox
                value={form.labels}
                onChange={(labels) => setForm((s) => ({ ...s, labels }))}
                allLabels={allLabels ?? []}
                placeholder="Search or add label…"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!valid}>
              {isEdit ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
