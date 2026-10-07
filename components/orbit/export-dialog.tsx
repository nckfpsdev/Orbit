"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Download, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { EXPORT_FIELDS } from "@/lib/domain/constants";
import { Action, Pick } from "./primitives";
export function ExportDialog({
  ids,
  close,
}: {
  ids: string[];
  close: () => void;
}) {
  const [fields, setFields] = useState<string[]>([...EXPORT_FIELDS]);
  const [format, setFormat] = useState("csv");
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const r = await fetch("/api/v1/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, fields, format }),
      });
      if (!r.ok) {
        const e = (await r.json()) as { error?: { message: string } };
        throw new Error(e.error?.message ?? "Falha na exportação.");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orbit-leads.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${ids.length} leads exportados.`);
      close();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível exportar.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="modal-medium">
        <DialogHeader>
          <DialogTitle>Exportar leads</DialogTitle>
          <DialogDescription>
            {ids.length} registros selecionados. Escolha o formato e os campos.
          </DialogDescription>
        </DialogHeader>
        <Pick
          value={format}
          onChange={setFormat}
          label="Formato"
          items={[
            { value: "csv", label: "CSV · compatível com planilhas" },
            { value: "xlsx", label: "XLSX · Excel" },
          ]}
        />
        <div className="export-fields">
          {EXPORT_FIELDS.map((f) => (
            <label key={f}>
              <Checkbox
                checked={fields.includes(f)}
                onCheckedChange={(v) =>
                  setFields((old) =>
                    v === true ? [...old, f] : old.filter((x) => x !== f),
                  )
                }
              />
              {f}
            </label>
          ))}
        </div>
        <p className="note inline-flex items-start gap-2">
          <ShieldCheck size={16} />
          Origem e identificação de dados fictícios acompanham a exportação.
          Apenas registros autorizados pela fonte podem ser exportados.
        </p>
        <div className="footer-actions">
          <Action
            disabled={!fields.length}
            busy={busy}
            onClick={() => void download()}
          >
            <Download size={16} />
            Baixar arquivo
          </Action>
        </div>
      </DialogContent>
    </Dialog>
  );
}
