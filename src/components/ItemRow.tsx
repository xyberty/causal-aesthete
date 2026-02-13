import { Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Item, PriorityMode, usePlanStore } from "@/store/usePlanStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatMoney } from "@/lib/utils";

export function ItemRow({
  item,
  onEdit,
  priorityMode,
  dragHandle,
}: {
  item: Item;
  onEdit: (item: Item) => void;
  priorityMode: PriorityMode;
  /** Optional drag handle (e.g. for sortable list) */
  dragHandle?: React.ReactNode;
}) {
  const toggleAchieved = usePlanStore((s) => s.toggleAchieved);
  const deleteItem = usePlanStore((s) => s.deleteItem);

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 p-3">
      <div className="min-w-0 flex-1 flex items-start gap-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button
            className="mt-0.5 text-neutral-500 hover:text-neutral-900"
            onClick={() => toggleAchieved(item.id)}
            aria-label={item.achieved ? "Mark as active" : "Mark as achieved"}
          >
            <CheckCircle2 className={cn("h-5 w-5", item.achieved ? "text-neutral-900" : "text-neutral-300")} />
          </button>

          <div className="min-w-0">
            <div className={cn("truncate text-sm font-medium", item.achieved && "line-through text-neutral-400")}>
              {item.title}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span>{formatMoney(item.price, item.currency)}</span>
              <Badge variant="secondary">
                {priorityMode === "rank" ? `Rank ${item.priority}` : `Weight ${item.priority}`}
              </Badge>
              <Badge variant="outline">{item.category === "need" ? "Need" : "Want"}</Badge>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="icon" onClick={() => onEdit(item)} aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (confirm("Delete this item?")) deleteItem(item.id);
          }}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
