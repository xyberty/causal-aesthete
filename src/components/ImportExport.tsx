import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePlanStore } from "@/store/usePlanStore";

export function ImportExport() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const state = usePlanStore((s) => ({ version: s.version, items: s.items, settings: s.settings }));
  const importState = usePlanStore((s) => s.importState);

  function doExport() {
    const payload = {
      ...state,
      exportedAt: new Date().toISOString(),
      app: "wish-plan",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wish-plan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || parsed.version !== 1) {
      alert("Unsupported file format (version mismatch).");
      return;
    }
    importState(parsed);
  }

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          doExport();
        }}
      >
        <Download className="mr-2 h-4 w-4" />
        Export JSON
      </DropdownMenuItem>

      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          fileRef.current?.click();
        }}
      >
        <Upload className="mr-2 h-4 w-4" />
        Import JSON
      </DropdownMenuItem>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImportFile(f);
          e.currentTarget.value = "";
        }}
      />
    </>
  );
}
