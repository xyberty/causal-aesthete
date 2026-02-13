import { Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Item, PriorityMode, usePlanStore } from "@/store/usePlanStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatAchievedDate, formatMoney } from "@/lib/utils";

export function ItemRow({
  item,
  onEdit,
  priorityMode,
  dragHandleProps,
  dragHandleIcon,
  showLabels,
}: {
  item: Item;
  onEdit: (item: Item) => void;
  priorityMode: PriorityMode;
  /** When set, the main content area is draggable (for sortable lists) */
  dragHandleProps?: { attributes?: object; listeners?: object };
  /** Optional icon shown on the right of the draggable area (e.g. grip) */
  dragHandleIcon?: React.ReactNode;
  /** When true, show item labels (advanced feature). */
  showLabels?: boolean;
}) {
  const toggleAchieved = usePlanStore((s) => s.toggleAchieved);
  const deleteItem = usePlanStore((s) => s.deleteItem);

  const content = (
    <div className="min-w-0 flex-1 flex items-start gap-2">
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
              {item.achieved && (
                <span className="text-neutral-500">Achieved {formatAchievedDate(item.updatedAt)}</span>
              )}
              <span>{formatMoney(item.price, item.currency)}</span>
              {/* <Badge variant="secondary">
                {priorityMode === "rank" ? `Rank ${item.priority}` : `Weight ${item.priority}`}
              </Badge> */}
              <Badge variant="outline">{item.category === "need" ? "Need" : "Want"}</Badge>
              {item.targetMonthKey && (
                <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                  {item.targetMonthKey}
                </Badge>
              )}
              {showLabels && (item.labels ?? []).length > 0 && (
                <>
                  {(item.labels ?? []).map((l) => (
                    <Badge key={l} variant="outline" className="font-normal text-neutral-500">
                      {l}
                    </Badge>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 p-3">
      {dragHandleProps ? (
        <div
          {...(dragHandleProps.attributes ?? {})}
          {...(dragHandleProps.listeners ?? {})}
          className="min-w-0 flex-1 flex items-center gap-2 cursor-grab touch-none active:cursor-grabbing rounded-lg -m-1 p-1"
          aria-label="Drag to reorder"
        >
          {content}
        </div>
      ) : (
        content
      )}

      <div className="flex shrink-0 gap-2 items-center">
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
        {dragHandleIcon}
        </div>
    </div>
  );
}
