import { useRef, useState, type ChangeEvent } from "react";
import type { Course } from "../domain/course";
import type { AcademicTerm } from "../domain/plan";
import {
  MAX_PLAN_FILE_BYTES,
  parsePlan,
  planExportFilename,
  serializePlan,
} from "../domain/portablePlan";
import "./PlanTransfer.css";

interface PlanTransferProps {
  catalog: readonly Course[];
  terms: readonly AcademicTerm[];
  onImport: (terms: AcademicTerm[]) => void;
}

interface TransferStatus {
  kind: "error" | "success";
  message: string;
}

export function PlanTransfer({
  catalog,
  terms,
  onImport,
}: PlanTransferProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<TransferStatus | null>(null);

  function exportPlan(): void {
    const exportedAt = new Date();
    const url = URL.createObjectURL(
      new Blob([serializePlan(terms, exportedAt)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = planExportFilename(exportedAt);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus({ kind: "success", message: "Plan exported as a JSON file." });
  }

  async function importPlan(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_PLAN_FILE_BYTES) {
      setStatus({
        kind: "error",
        message: "The selected file is larger than 256 KiB.",
      });
      return;
    }

    try {
      const source = await file.text();
      const knownCodes = new Set(catalog.map((course) => course.code));
      const result = parsePlan(source, knownCodes);
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error });
        return;
      }

      onImport(result.terms);
      setStatus({
        kind: "success",
        message: `Imported ${result.terms.length} terms successfully.`,
      });
    } catch {
      setStatus({
        kind: "error",
        message: "CampusFlow could not read the selected file.",
      });
    }
  }

  return (
    <div className="plan-transfer" aria-label="Plan backup tools">
      <button className="text-button" type="button" onClick={exportPlan}>
        Export plan
      </button>
      <button
        className="text-button"
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        Import plan
      </button>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".json,application/json"
        aria-label="Choose a CampusFlow JSON plan to import"
        onChange={(event) => void importPlan(event)}
      />
      {status && (
        <span
          className={`transfer-status ${status.kind}`}
          role={status.kind === "error" ? "alert" : "status"}
        >
          {status.message}
        </span>
      )}
    </div>
  );
}
