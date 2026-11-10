import { Music, FileText, CheckCircle, ExternalLink, Loader2, AlertCircle } from "lucide-react";

export type WorkStatus =
  | "draft"
  | "splits_pending"
  | "splits_signed"
  | "ready_to_register"
  | "submitted"
  | "released"
  | "iswc_pending"
  | "verified"
  | "needs_correction";

export const statusLabels: Record<WorkStatus, string> = {
  draft: "Borrador",
  splits_pending: "Splits pendientes",
  splits_signed: "Splits firmados",
  ready_to_register: "Listo para registrar",
  submitted: "Enviada",
  released: "Lanzada",
  iswc_pending: "ISWC pendiente",
  verified: "Verificada",
  needs_correction: "Requiere corrección",
};

export const statusConfig: Record<WorkStatus, { label: string; icon: typeof Music; color: string; bgColor: string }> = {
  draft: { label: "Borrador", icon: Music, color: "text-secondary-foreground", bgColor: "bg-secondary" },
  splits_pending: { label: "Splits pendientes", icon: FileText, color: "text-primary", bgColor: "bg-cream" },
  splits_signed: { label: "Splits firmados", icon: CheckCircle, color: "text-ink", bgColor: "bg-lavender" },
  ready_to_register: { label: "Listo para registrar", icon: ExternalLink, color: "text-foreground", bgColor: "bg-blue" },
  submitted: { label: "Enviada", icon: Loader2, color: "text-primary-foreground", bgColor: "bg-primary" },
  released: { label: "Lanzada", icon: Music, color: "text-ink", bgColor: "bg-mint" },
  iswc_pending: { label: "ISWC pendiente", icon: AlertCircle, color: "text-ink", bgColor: "bg-olive" },
  verified: { label: "Verificada", icon: CheckCircle, color: "text-ink", bgColor: "bg-mint" },
  needs_correction: { label: "Requiere corrección", icon: AlertCircle, color: "text-destructive-foreground", bgColor: "bg-destructive" },
};