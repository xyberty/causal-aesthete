import { useRef, useEffect, useState, useMemo } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function normalizeLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-");
}

const CREATE_PREFIX = "__create__";

export function LabelCombobox({
  value,
  onChange,
  allLabels,
  placeholder = "Search or add label…",
  className,
  inputClassName,
}: {
  value: string[];
  onChange: (labels: string[]) => void;
  allLabels: string[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = normalizeLabel(query);
  const available = useMemo(() => {
    const selected = new Set(value);
    return allLabels.filter((l) => !selected.has(l));
  }, [allLabels, value]);
  const filtered = useMemo(() => {
    if (!normalizedQuery) return available;
    return available.filter((l) => l.includes(normalizedQuery));
  }, [available, normalizedQuery]);
  const exactMatch = normalizedQuery && available.includes(normalizedQuery);
  const showCreate =
    normalizedQuery.length > 0 &&
    !exactMatch &&
    !value.includes(normalizedQuery);
  const options = useMemo(() => {
    const list = filtered.map((l) => ({ __create: false as const, label: l }));
    if (showCreate)
      return [...list, { __create: true as const, label: normalizedQuery }];
    return list;
  }, [filtered, showCreate, normalizedQuery]);

  const selectLabel = (label: string) => {
    const norm = label.startsWith(CREATE_PREFIX)
      ? label.slice(CREATE_PREFIX.length)
      : label;
    if (norm && !value.includes(norm)) {
      onChange([...value, norm].sort());
    }
    setQuery("");
    setHighlightIndex(0);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      setHighlightIndex(0);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [open, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, options.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlightIndex];
      if (opt) {
        const toAdd = opt.__create ? opt.label : opt.label;
        selectLabel(opt.__create ? CREATE_PREFIX + toAdd : toAdd);
      }
      return;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:focus-within:ring-neutral-700">
        {value.map((l) => (
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
              className="hover:bg-neutral-300 dark:hover:bg-neutral-700"
              onClick={() => onChange(value.filter((x) => x !== l))}
              aria-label={`Remove ${l}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className={`min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 ${inputClassName ?? ""}`}
          autoComplete="off"
        />
      </div>
      {open && (query.length > 0 || available.length > 0 || showCreate) && (
        <ul
          className="absolute z-50 mt-1 max-h-48 w-full min-w-[12rem] overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-950"
          role="listbox"
        >
          {options.length === 0 && !showCreate ? (
            <li className="px-3 py-2 text-sm text-muted">No labels yet</li>
          ) : (
            options.map((opt, i) => {
              const isCreate = opt.__create;
              const label = opt.label;
              const display = isCreate ? `Add "${label}" as new label` : label;
              const valueKey = isCreate ? CREATE_PREFIX + label : label;
              return (
                <li
                  key={valueKey}
                  role="option"
                  aria-selected={i === highlightIndex}
                  className={`cursor-pointer px-3 py-2 text-sm ${i === highlightIndex ? "bg-neutral-100 dark:bg-neutral-900" : ""} ${isCreate ? "text-neutral-600 italic dark:text-neutral-300" : ""}`}
                  onMouseEnter={() => setHighlightIndex(i)}
                  onClick={() =>
                    selectLabel(isCreate ? CREATE_PREFIX + label : label)
                  }
                >
                  {display}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
