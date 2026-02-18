import { useRef, useState, useEffect } from "react";
import { Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { Item, PriorityMode, usePlanStore } from "@/store/usePlanStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BorderedBox } from "@/components/ui/bordered-box";
import { cn, formatAchievedDate, formatMoney } from "@/lib/utils";

export function ItemRow({
  item,
  onEdit,
  priorityMode: _priorityMode,
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [showActionsOverlay, setShowActionsOverlay] = useState(false);

  // Close overlay when tapping outside the card or when scrolling
  useEffect(() => {
    if (!showActionsOverlay) return;
    const close = () => setShowActionsOverlay(false);
    const handlePointerDown = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) close();
    };
    const handleScroll = () => close();
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showActionsOverlay]);

  const content = (
    <div className="min-w-0 flex-1 flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button
            className="mt-0.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            onClick={(e) => {
              e.stopPropagation();
              toggleAchieved(item.id);
            }}
            aria-label={item.achieved ? "Mark as active" : "Mark as achieved"}
          >
            <CheckCircle2
              className={cn(
                "h-5 w-5",
                item.achieved ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-300 dark:text-neutral-700"
              )}
            />
          </button>

          <div className="min-w-0">
            <div
              className={cn(
                "truncate text-sm font-medium",
                item.achieved && "line-through text-muted"
              )}
            >
              {item.title}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              {item.achieved && (
                <span className="text-muted">Achieved {formatAchievedDate(item.updatedAt)}</span>
              )}
              <span>{formatMoney(item.price, item.currency)}</span>
              {/* <Badge variant="secondary">
                {priorityMode === "rank" ? `Rank ${item.priority}` : `Weight ${item.priority}`}
              </Badge> */}
              {/* <Badge variant="outline">{item.category === "need" ? "Need" : "Want"}</Badge> */}
              {item.targetMonthKey && (
                <Badge variant="info">{item.targetMonthKey}</Badge>
              )}
              {showLabels && (item.labels ?? []).length > 0 && (
                <>
                  {(item.labels ?? []).map((l) => (
                    <Badge key={l} variant="outline" className="font-normal text-muted">
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

  const openOverlay = () => setShowActionsOverlay(true);
  const closeOverlay = () => setShowActionsOverlay(false);

  const handleEdit = () => {
    onEdit(item);
    closeOverlay();
  };
  const handleDelete = () => {
    if (confirm("Delete this item?")) {
      deleteItem(item.id);
      closeOverlay();
    }
  };

  const tappableArea = (
    <div
      className="min-w-0 flex-1 cursor-pointer md:cursor-default"
      onClick={(e) => {
        if (window.matchMedia("(min-width: 768px)").matches) return;
        e.stopPropagation();
        setShowActionsOverlay(true);
      }}
      role="button"
      tabIndex={0}
      aria-label="Show actions"
      onKeyDown={(e) => {
        if (window.matchMedia("(min-width: 768px)").matches) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setShowActionsOverlay(true);
        }
      }}
    >
      {content}
    </div>
  );

  return (
    <BorderedBox
      ref={cardRef}
      className="relative flex items-start justify-between gap-3"
    >
      {dragHandleProps ? (
        <div
          {...(dragHandleProps.attributes ?? {})}
          {...(dragHandleProps.listeners ?? {})}
          className="min-w-0 flex-1 flex items-center gap-2 cursor-grab touch-none active:cursor-grabbing rounded-lg -m-1 p-1"
          aria-label="Drag to reorder"
          onClick={(e) => {
            if (window.matchMedia("(min-width: 768px)").matches) return;
            e.stopPropagation();
            setShowActionsOverlay(true);
          }}
        >
          {content}
        </div>
      ) : (
        tappableArea
      )}

      {/* Desktop: always-visible edit/delete buttons */}
      <div className="hidden md:flex shrink-0 gap-2 items-center">
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

      {/* Mobile: overlay with Edit/Delete when card is tapped */}
      {showActionsOverlay && (
        <div
          className="md:hidden absolute inset-0 z-10 rounded-xl flex items-center justify-end gap-2 pr-3 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeOverlay();
          }}
          role="presentation"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={handleEdit}
            aria-label="Edit"
            className="shrink-0"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDelete}
            aria-label="Delete"
            className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {dragHandleIcon && (
        <div className="hidden md:block shrink-0">{dragHandleIcon}</div>
      )}
    </BorderedBox>
  );
}
