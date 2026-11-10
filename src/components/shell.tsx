import { Link, useRouterState } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Sun,
  StickyNote,
  ListChecks,
  Briefcase,
  Music2,
  User,
  Users,
  Send,
  Search,
  Wallet,
  Library,
  Plus,
  Sparkles,
  X,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Image as ImageIcon,
  AtSign,
  Globe2,
  Bot,
  ArrowUp,
  Check,
  Command,
} from "lucide-react";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatAttachment = { id: string; name: string; url: string };
type ChatMessage = {
  id: string;
  me: boolean;
  t: string;
  attachments?: ChatAttachment[];
  agent?: string;
};

const chatAgents = ["Donna", "Agencia", "Música", "Finanzas"];
const chatCommands = [
  {
    id: "deep-search",
    label: "Búsqueda profunda",
    description: "Investigar con más detalle",
    icon: Globe2,
  },
  {
    id: "resumir",
    label: "Resumir mi día",
    description: "Ver prioridades y agenda",
    icon: Sparkles,
  },
  { id: "crear-tarea", label: "Crear tarea", description: "Preparar una nueva tarea", icon: Check },
  { id: "investigar", label: "Investigar", description: "Analizar un tema", icon: Search },
];

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const groups = [
  {
    label: "Personal",
    items: [
      { to: "/", label: "Hoy", icon: Sun },
      { to: "/notas", label: "Notas", icon: StickyNote },
      { to: "/productividad", label: "Productividad", icon: ListChecks },
    ],
  },
  {
    label: "Espacios",
    items: [
      { to: "/agencia", label: "Agencia", icon: Briefcase },
      { to: "/musica", label: "Música", icon: Music2 },
      { to: "/marca", label: "Marca personal", icon: User },
      { to: "/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    label: "Apps",
    items: [
      { to: "/publishing", label: "Publishing", icon: Send },
      { to: "/investigacion", label: "Investigación", icon: Search },
      { to: "/finanzas", label: "Finanzas", icon: Wallet },
      { to: "/biblioteca", label: "Biblioteca", icon: Library },
    ],
  },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [donna, setDonna] = useState(false);
  const [nav, setNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 border-r bg-background p-4 transition-[width,transform] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 md:overflow-x-hidden",
          sidebarCollapsed && "md:w-16 md:px-2",
          nav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "mb-8 flex h-8 items-center justify-between",
            sidebarCollapsed && "md:justify-center",
          )}
        >
          <Link
            to="/"
            title="CEREBRO OS"
            className={cn("flex items-center px-2", sidebarCollapsed && "md:hidden")}
          >
            <span className="whitespace-nowrap text-lg font-semibold tracking-tight">
              CEREBRO OS
            </span>
          </Link>
          <button
            className="hidden shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
            title={sidebarCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>
        {groups.map((g) => (
          <div key={g.label} className="mb-6">
            <div
              className={cn(
                "mb-2 px-2 text-xs uppercase tracking-widest text-muted-foreground",
                sidebarCollapsed && "md:hidden",
              )}
            >
              {g.label}
            </div>
            {g.items.map((i) => {
              const active = path === i.to;
              return (
                <Link
                  key={i.to}
                  to={i.to}
                  onClick={() => setNav(false)}
                  title={i.label}
                  aria-label={i.label}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors",
                    sidebarCollapsed && "md:justify-center md:px-0",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <i.icon className="h-4 w-4 shrink-0" />
                  <span className={cn("whitespace-nowrap", sidebarCollapsed && "md:hidden")}>
                    {i.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <button className="md:hidden" onClick={() => setNav(!nav)} aria-label="Menú">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border px-3 py-2 text-sm text-muted-foreground md:max-w-md">
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Buscar o ejecutar comando…</span>
            <kbd className="ml-auto hidden shrink-0 rounded border px-1.5 text-xs sm:inline">
              ⌘K
            </kbd>
          </div>
          {!path.startsWith("/publishing") && (
            <span className="hidden shrink-0 rounded-full border border-primary/50 px-3 py-1 text-xs text-primary xl:inline">
              Datos de demostración
            </span>
          )}
          <button
            aria-label="Crear"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-foreground p-2 text-sm font-medium text-background sm:px-4 sm:py-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Crear</span>
          </button>
          <button
            aria-label="Abrir Donna"
            onClick={() => setDonna(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-gradient p-2 text-sm font-medium sm:px-4 sm:py-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Donna</span>
          </button>
        </header>
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>

      {donna && <Donna onClose={() => setDonna(false)} />}
    </div>
  );
}

function Donna({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      id: "welcome",
      me: false,
      t: "Buenos días. Tienes 2 entregas hoy y la subida de «Medianoche» está bloqueada por metadatos. ¿Lo preparo?",
      agent: "Donna",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [selectedAgent, setSelectedAgent] = useState("Donna");
  const [deepSearch, setDeepSearch] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const objectUrls = useRef<string[]>([]);
  const agentMatch = /(^|\s)@([\w-]*)$/.exec(draft);
  const commandMatch = /(^|\s)\/([\w-]*)$/.exec(draft);
  const filteredAgents = chatAgents.filter((agent) =>
    normalizeSearchText(agent).startsWith(normalizeSearchText(agentMatch?.[2] ?? "")),
  );
  const filteredCommands = chatCommands.filter((command) =>
    command.id.startsWith(commandMatch?.[2]?.toLowerCase() ?? ""),
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const urlsToRevoke = objectUrls.current;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const insertToken = (token: string) => {
    setDraft((current) => `${current}${current && !/\s$/.test(current) ? " " : ""}${token}`);
    textareaRef.current?.focus();
  };

  const chooseAgent = (agent: string) => {
    setSelectedAgent(agent);
    setDraft((current) => current.replace(/(^|\s)@[\w-]*$/, "$1").trimEnd());
    textareaRef.current?.focus();
  };

  const chooseCommand = (commandId: string) => {
    const command = chatCommands.find((item) => item.id === commandId);
    if (!command) return;
    setDraft((current) => current.replace(/(^|\s)\/[\w-]*$/, "$1").trimEnd());
    if (command.id === "deep-search") {
      setDeepSearch((enabled) => !enabled);
      textareaRef.current?.focus();
      return;
    }
    setDraft((current) => `${current}${current ? " " : ""}/${command.id} `);
    textareaRef.current?.focus();
  };

  const addImages = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    setUploadError("");

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
    const oversizedFiles = imageFiles.filter((file) => file.size > 10 * 1024 * 1024);
    const acceptedFiles = imageFiles.filter((file) => file.size <= 10 * 1024 * 1024);
    const remainingSlots = Math.max(0, 5 - attachments.length);
    const accepted = acceptedFiles.slice(0, remainingSlots).map((file) => {
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      return { id: `${file.name}-${file.lastModified}-${url}`, name: file.name, url };
    });

    if (accepted.length) setAttachments((current) => [...current, ...accepted]);
    if (oversizedFiles.length) setUploadError("Cada imagen debe pesar menos de 10 MB.");
    else if (selectedFiles.length !== imageFiles.length)
      setUploadError("Solo puedes adjuntar imágenes.");
    else if (acceptedFiles.length > remainingSlots)
      setUploadError("Puedes adjuntar hasta 5 imágenes por mensaje.");
  };

  const send = () => {
    if (!draft.trim() && !attachments.length) return;
    const messageId = `message-${Date.now()}`;
    const sentAttachments = attachments;
    const sentText = draft.trim();
    setMsgs((current) => [
      ...current,
      { id: messageId, me: true, t: sentText, attachments: sentAttachments, agent: selectedAgent },
      {
        id: `${messageId}-reply`,
        me: false,
        t: `Entendido. ${deepSearch ? "La búsqueda profunda está seleccionada (demo). " : ""}Preparé un borrador para ${selectedAgent} y lo dejé en tu bandeja para revisión (demo).`,
        agent: selectedAgent,
      },
    ]);
    setDraft("");
    setAttachments([]);
    setUploadError("");
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    const firstAgent = filteredAgents[0];
    const firstCommand = filteredCommands[0];
    if (agentMatch && firstAgent) {
      event.preventDefault();
      chooseAgent(firstAgent);
    } else if (commandMatch && firstCommand) {
      event.preventDefault();
      chooseCommand(firstCommand.id);
    } else {
      event.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col border-l bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-brand-gradient px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-black/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm opacity-80">Espacio de trabajo · Demo</div>
              <div className="text-lg font-semibold leading-tight">{selectedAgent}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-2 transition-colors hover:bg-black/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
          {["Resumir mi día", "Completar metadatos", "Programar posts", "Crear factura"].map(
            (prompt) => (
              <button
                key={prompt}
                onClick={() => setDraft(prompt)}
                className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {prompt}
              </button>
            ),
          )}
        </div>
        <MessageScrollerProvider autoScroll>
          <MessageScroller className="flex-1">
            <MessageScrollerViewport aria-label="Conversación con Donna">
              <MessageScrollerContent className="gap-5 px-4 py-5">
                {msgs.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.me}
                  >
                    <div className={cn("max-w-[88%]", message.me && "ml-auto")}>
                      {!message.me && (
                        <div className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                          <Bot className="h-3.5 w-3.5" />
                          {message.agent ?? selectedAgent}
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          message.me ? "bg-primary text-primary-foreground" : "bg-card",
                        )}
                      >
                        {message.t && <p className="whitespace-pre-wrap">{message.t}</p>}
                        {message.attachments?.length ? (
                          <div
                            className={cn(
                              "mt-2 grid gap-2",
                              message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1",
                            )}
                          >
                            {message.attachments.map((attachment) => (
                              <img
                                key={attachment.id}
                                src={attachment.url}
                                alt={attachment.name}
                                className="max-h-56 w-full rounded-lg object-cover"
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
        <div className="border-t bg-background/70 p-3 sm:p-4">
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="relative">
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="h-16 w-16 rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Quitar ${attachment.name}`}
                    onClick={() =>
                      setAttachments((current) =>
                        current.filter((item) => item.id !== attachment.id),
                      )
                    }
                    className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {agentMatch && filteredAgents.length > 0 && (
            <div
              role="listbox"
              aria-label="Mencionar un agente"
              className="mb-2 rounded-xl border bg-popover p-1 shadow-lg"
            >
              {filteredAgents.map((agent) => (
                <button
                  key={agent}
                  role="option"
                  aria-selected={agent === selectedAgent}
                  onClick={() => chooseAgent(agent)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  {agent}
                  {agent === selectedAgent && <Check className="ml-auto h-4 w-4" />}
                </button>
              ))}
            </div>
          )}
          {commandMatch && filteredCommands.length > 0 && (
            <div
              role="listbox"
              aria-label="Comandos disponibles"
              className="mb-2 rounded-xl border bg-popover p-1 shadow-lg"
            >
              {filteredCommands.map((command) => (
                <button
                  key={command.id}
                  role="option"
                  onClick={() => chooseCommand(command.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <command.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{command.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {command.description}
                    </span>
                  </span>
                  <kbd className="text-xs text-muted-foreground">/{command.id}</kbd>
                </button>
              ))}
            </div>
          )}
          {uploadError && (
            <p role="status" className="mb-2 px-1 text-xs text-destructive">
              {uploadError}
            </p>
          )}
          <div className="rounded-2xl border bg-card shadow-sm focus-within:border-ring">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setUploadError("");
              }}
              onKeyDown={handleComposerKeyDown}
              placeholder={`Escribe a ${selectedAgent}…`}
              aria-label={`Mensaje para ${selectedAgent}`}
              className="min-h-20 resize-none border-0 bg-transparent px-4 pt-3 text-sm shadow-none focus-visible:ring-0"
              rows={3}
            />
            <div className="flex items-center gap-1 px-2 pb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={addImages}
              />
              <button
                type="button"
                aria-label="Adjuntar imágenes"
                title="Adjuntar imágenes"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Insertar una imagen"
                title="Insertar una imagen"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Mencionar agente"
                title="Mencionar agente"
                onClick={() => insertToken("@")}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <AtSign className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Ver comandos"
                title="Ver comandos"
                onClick={() => insertToken("/")}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Command className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-pressed={deepSearch}
                onClick={() => setDeepSearch((enabled) => !enabled)}
                className={cn(
                  "ml-1 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                  deepSearch
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Globe2 className="h-3.5 w-3.5" />
                Búsqueda profunda
              </button>
              <button
                type="button"
                aria-label="Enviar mensaje"
                onClick={send}
                disabled={!draft.trim() && !attachments.length}
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between px-1 pt-2 text-[11px] text-muted-foreground">
            <span>Enter para enviar · Shift + Enter para nueva línea</span>
            <span>Hasta 5 imágenes · 10 MB c/u</span>
          </div>
        </div>
      </div>
    </div>
  );
}
