"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateIdentifier } from "@/lib/publishing/queries";
import type { PublishingWork } from "@/lib/publishing/types";

interface IdentifierDialogProps {
  work: PublishingWork;
  kind: "isrc" | "iswc";
  onSave: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IdentifierDialog({
  work,
  kind,
  onSave,
  open,
  onOpenChange,
}: IdentifierDialogProps) {
  const [value, setValue] = useState("");
  const [formatted, setFormatted] = useState("");
  const [issues, setIssues] = useState<string[]>([]);

  const label = kind === "isrc" ? "ISRC" : "ISWC / Song Code / BMI Work ID";
  const placeholder = kind === "isrc" ? "USABC2600001" : "T-123.456.789-0";

  const handleChange = (val: string) => {
    setValue(val);
    const { valid, formatted: f, issues } = validateIdentifier(kind, val);
    setFormatted(f);
    setIssues(issues);
  };

  const handleSave = () => {
    const { valid, issues } = validateIdentifier(kind, value);
    if (!valid) {
      setIssues(issues);
      return;
    }
    onSave(formatted || value);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Agregar {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Asigna el {label} a «{work.title}».
          </DialogDescription>
        </DialogHeader>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="text-sm"
        />
        {issues.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Identificador no válido</AlertTitle>
            <AlertDescription>{issues.join(" ")}</AlertDescription>
          </Alert>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={issues.length > 0 || !value.trim()}>
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
