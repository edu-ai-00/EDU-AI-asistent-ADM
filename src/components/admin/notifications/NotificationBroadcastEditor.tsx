"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "use-debounce";
import {
  AlertCircle,
  Archive,
  Bell,
  CalendarClock,
  CheckCircle2,
  History,
  Newspaper,
  Save,
  Send,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useClassrooms } from "@/hooks/useClassrooms";
import {
  useArchiveNotificationBroadcast,
  useBroadcastEstimate,
  useBroadcastPreview,
  useCreateNotificationBroadcast,
  useDeleteNotificationBroadcast,
  useNotificationBroadcast,
  useNotificationMeta,
  useNotificationTypes,
  useSendNotificationBroadcast,
  useUpdateNotificationBroadcast,
} from "@/hooks/useNotifications";
import { useSchools } from "@/hooks/useSchools";
import {
  DEFAULT_TEMPLATE_LIMITS,
  DEFAULT_WIDE_THRESHOLD,
  EMPTY_TARGETING,
  broadcastProgress,
  channelsLabel,
  formatDeadline,
  fromDateTimeLocalValue,
  isWideTargeting,
  pluralCs,
  renderTemplatePreview,
  roleLabel,
  schoolsWithoutSelectedClasses,
  targetingProblems,
  toDateTimeLocalValue,
  toggleTargetClassroom,
  toggleTargetRole,
  toggleTargetSchool,
  warningText,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type {
  BroadcastPreview,
  BroadcastRole,
  BroadcastTargeting,
  NotificationBroadcast,
  NotificationBroadcastInput,
  NotificationChannel,
  NotificationType,
} from "@/types/notifications";
import {
  AdminOnlyNotice,
  BackLink,
  Banner,
  BroadcastStatusPill,
  CheckboxRow,
  Field,
  ProgressBar,
  SectionCard,
  errorLines,
  errorMessage,
  formatDateTime,
  inputClass,
} from "./shared";

const BROADCASTS_HREF = "/admin/notifications?tab=broadcasts";
const CONFIRM_PHRASE = "ODESLAT";
const TITLE_MAX = 120;
const ROLES: BroadcastRole[] = ["student", "teacher"];
/** The type whose wording the deadline reminder uses (§3.4 #2). */
const DEADLINE_TYPE_KEY = "org_deadline_reminder";

type ChannelChoice = "both" | "feed" | "push";

const CHANNEL_CHOICES: { value: ChannelChoice; label: string; channels: NotificationChannel[] }[] = [
  { value: "both", label: "Push + Novinky", channels: ["push", "feed"] },
  { value: "feed", label: "Jen Novinky", channels: ["feed"] },
  { value: "push", label: "Jen push", channels: ["push"] },
];

function channelChoice(channels: NotificationChannel[]): ChannelChoice {
  const push = channels.includes("push");
  const feed = channels.includes("feed");
  if (push && feed) return "both";
  return push ? "push" : "feed";
}

interface BroadcastForm {
  title: string;
  body: string;
  type_key: string;
  channels: NotificationChannel[];
  /** `<input type="datetime-local">` value. */
  deadline: string;
  targeting: BroadcastTargeting;
}

const NEW_FORM: BroadcastForm = {
  title: "",
  body: "",
  type_key: "",
  channels: [],
  deadline: "",
  targeting: EMPTY_TARGETING,
};

function toForm(b: NotificationBroadcast): BroadcastForm {
  return {
    title: b.title ?? "",
    body: b.body ?? "",
    type_key: b.type_key ?? "",
    channels: (["push", "feed"] as NotificationChannel[]).filter((c) => (b.channels ?? []).includes(c)),
    deadline: toDateTimeLocalValue(b.deadline_at),
    targeting: {
      school_ids: b.targeting?.school_ids ?? [],
      classroom_ids: b.targeting?.classroom_ids ?? [],
      roles: (b.targeting?.roles ?? []) as BroadcastRole[],
    },
  };
}

function toPayload(f: BroadcastForm): NotificationBroadcastInput {
  return {
    title: f.title.trim(),
    body: f.body.trim(),
    type_key: f.type_key,
    channels: f.channels,
    targeting: f.targeting,
    deadline_at: fromDateTimeLocalValue(f.deadline),
  };
}

// ── Targeting ────────────────────────────────────────────────────────────────

interface NamedId {
  id: number;
  name: string;
}

function TargetingEditor({
  value,
  onChange,
  schools,
  classroomsBySchool,
  loading,
}: {
  value: BroadcastTargeting;
  onChange: (next: BroadcastTargeting) => void;
  schools: NamedId[];
  classroomsBySchool: Map<number, NamedId[]>;
  loading: boolean;
}) {
  const classIdsBySchool = useMemo(
    () => new Map(Array.from(classroomsBySchool.entries()).map(([id, list]) => [id, list.map((c) => c.id)])),
    [classroomsBySchool]
  );
  const emptySchools = schoolsWithoutSelectedClasses(value, classIdsBySchool);
  const schoolName = (id: number) => schools.find((s) => s.id === id)?.name ?? `#${id}`;
  const wholeSchools = value.classroom_ids.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1.5">Školy a třídy</p>
        {loading ? (
          <p className="text-sm text-gray-400">Načítám školy…</p>
        ) : schools.length === 0 ? (
          <p className="text-sm text-gray-400">Zatím žádné školy — založte je na záložce Školy.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
            {schools.map((school) => {
              const selected = value.school_ids.includes(school.id);
              const classes = classroomsBySchool.get(school.id) ?? [];
              return (
                <div key={school.id} className={cn(selected && "bg-blue-50/30")}>
                  <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selected}
                      onChange={() =>
                        onChange(toggleTargetSchool(value, school.id, classes.map((c) => c.id)))
                      }
                    />
                    <span className="text-sm text-gray-900">{school.name}</span>
                    <span className="text-xs text-gray-400">
                      {classes.length} {pluralCs(classes.length, "třída", "třídy", "tříd")}
                    </span>
                  </label>
                  {selected && classes.length > 0 && (
                    <div className="pl-9 pr-3 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      {classes.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={value.classroom_ids.includes(c.id)}
                            onChange={() => onChange(toggleTargetClassroom(value, c.id))}
                          />
                          <span className="text-gray-700 truncate">{c.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selected && classes.length === 0 && (
                    <p className="pl-9 pr-3 pb-2 text-xs text-gray-400">Škola nemá žádné třídy.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {value.school_ids.length > 0 && (
          <p className="mt-1.5 text-xs text-gray-500">
            {wholeSchools
              ? "Bez vybrané třídy jde rozesílka do všech tříd vybraných škol (učitelům i těm, kdo jsou přiřazení jen ke škole)."
              : `Jen vybrané třídy (${value.classroom_ids.length}) — ostatní třídy vybraných škol rozesílku nedostanou.`}
          </p>
        )}
        {emptySchools.length > 0 && (
          <Banner tone="warning" className="mt-2">
            {emptySchools.length === 1 ? "Škola" : "Školy"} {emptySchools.map(schoolName).join(", ")}{" "}
            {emptySchools.length === 1 ? "nemá" : "nemají"} vybranou žádnou třídu, takže z{" "}
            {emptySchools.length === 1 ? "ní" : "nich"} rozesílku nedostane nikdo.
          </Banner>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-600 mb-1.5">Komu</p>
        <div className="flex flex-wrap gap-4">
          {ROLES.map((role) => (
            <CheckboxRow
              key={role}
              checked={value.roles.includes(role)}
              onChange={() => onChange(toggleTargetRole(value, role))}
              label={roleLabel(role)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Preview cards ────────────────────────────────────────────────────────────

function MessageCard({
  icon: Icon,
  label,
  title,
  body,
  note,
}: {
  icon: typeof Bell;
  label: string;
  title: string | null | undefined;
  body: string | null | undefined;
  note?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="rounded-md bg-white border border-gray-100 px-3 py-2">
        <div className="text-sm font-semibold text-gray-900 break-words">{title || <span className="text-gray-300">—</span>}</div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words mt-0.5">
          {body || <span className="text-gray-300">—</span>}
        </div>
      </div>
      {note && <p className="mt-1 text-[11px] text-gray-500">{note}</p>}
    </div>
  );
}

function LengthHint({ length, limits }: { length: number; limits: { label: string; max: number; hard?: boolean }[] }) {
  const over = limits.filter((l) => length > l.max);
  return (
    <span className="tabular-nums">
      {length} znaků
      {limits.map((l) => (
        <span key={l.label} className={cn(length > l.max && (l.hard ? "text-red-600" : "text-amber-700"))}>
          {" "}
          · {l.label} {l.max}
        </span>
      ))}
      {over.some((l) => !l.hard) && <span className="text-amber-700"> — push se zkrátí se „…“</span>}
    </span>
  );
}

// ── Read-only summary ────────────────────────────────────────────────────────

function namesFromSnapshot(snapshot: Record<string, unknown> | null, keys: string[]): string[] | null {
  if (!snapshot) return null;
  for (const key of keys) {
    const list = snapshot[key];
    if (!Array.isArray(list)) continue;
    const names = list
      .map((item) =>
        typeof item === "string"
          ? item
          : item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string"
            ? (item as { name: string }).name
            : null
      )
      .filter((n): n is string => Boolean(n));
    if (names.length > 0) return names;
  }
  return null;
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-1.5">
      <span className="text-xs font-medium text-gray-500 sm:w-32 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 min-w-0 break-words">{children}</span>
    </div>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone?: "green" | "red" | "gray" }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "green" ? "text-green-700" : tone === "red" ? "text-red-700" : tone === "gray" ? "text-gray-500" : "text-gray-900"
        )}
      >
        {value}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Broadcast detail / new broadcast (NOTIF-10). A draft is edited freely, with
 * a live recipient estimate and a preview; „Odeslat“ saves, asks the server
 * for the final recipient count and text, and a wide send needs the phrase
 * ODESLAT typed out. Once sent it is read-only, with progress polled every 3 s
 * while it is still sending.
 */
export function NotificationBroadcastEditor({ broadcastId }: { broadcastId: number | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();
  const isNew = broadcastId === null;

  const { data: broadcast, isLoading, error: loadError } = useNotificationBroadcast(broadcastId);
  const { data: types } = useNotificationTypes();
  const { data: meta } = useNotificationMeta();
  const { data: schoolsData, isLoading: schoolsLoading } = useSchools();
  const { data: classroomsData, isLoading: classroomsLoading } = useClassrooms();

  const createMutation = useCreateNotificationBroadcast();
  const updateMutation = useUpdateNotificationBroadcast();
  const deleteMutation = useDeleteNotificationBroadcast();
  const previewMutation = useBroadcastPreview();
  const sendMutation = useSendNotificationBroadcast();
  const archiveMutation = useArchiveNotificationBroadcast();

  const [base, setBase] = useState<NotificationBroadcast | null>(null);
  const [form, setForm] = useState<BroadcastForm>(NEW_FORM);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [sendError, setSendError] = useState<unknown>(null);
  const confirmRef = useRef<HTMLElement>(null);
  const autoConfirmDone = useRef(false);

  const baseForm = useMemo(() => (base ? toForm(base) : NEW_FORM), [base]);
  const dirty = isNew || JSON.stringify(form) !== JSON.stringify(baseForm);

  useEffect(() => {
    if (!broadcast) return;
    if (!base || !dirty || broadcast.status !== "draft") {
      setBase(broadcast);
      setForm(toForm(broadcast));
    } else {
      // Keep the draft being edited, but follow status/counters.
      setBase((prev) => (prev ? { ...broadcast, ...pickEditable(prev) } : broadcast));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcast]);

  const manualTypes = useMemo(
    () => (types ?? []).filter((t) => t.manual_allowed || t.key === form.type_key),
    [types, form.type_key]
  );
  const selectedType: NotificationType | undefined = (types ?? []).find((t) => t.key === form.type_key);
  const deadlineType = (types ?? []).find((t) => t.key === DEADLINE_TYPE_KEY);

  // A new broadcast starts on the first usable type.
  useEffect(() => {
    if (!isNew || form.type_key || !types) return;
    const first = types.find((t) => t.manual_allowed && t.is_active) ?? types.find((t) => t.manual_allowed);
    if (first) setForm((prev) => ({ ...prev, type_key: first.key, channels: [...first.channels] }));
  }, [isNew, types, form.type_key]);

  const schools = useMemo(
    () =>
      [...(schoolsData ?? [])]
        .map((s) => ({ id: s.id, name: s.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "cs")),
    [schoolsData]
  );
  const classroomsBySchool = useMemo(() => {
    const map = new Map<number, NamedId[]>();
    for (const c of classroomsData ?? []) {
      const schoolId = c.school?.id;
      if (!schoolId) continue;
      map.set(schoolId, [...(map.get(schoolId) ?? []), { id: c.id, name: c.name }]);
    }
    for (const list of Array.from(map.values())) list.sort((a, b) => a.name.localeCompare(b.name, "cs"));
    return map;
  }, [classroomsData]);

  const readOnly = !isNew && !!base && base.status !== "draft";

  // ── Live estimate (unsaved targeting) ──
  const targetingKey = JSON.stringify(form.targeting);
  const [debouncedTargetingKey] = useDebounce(targetingKey, 500);
  const debouncedTargeting = useMemo(() => JSON.parse(debouncedTargetingKey) as BroadcastTargeting, [debouncedTargetingKey]);
  const estimate = useBroadcastEstimate(
    !readOnly && targetingProblems(debouncedTargeting).length === 0 ? debouncedTargeting : null
  );
  const estimatePending = targetingKey !== debouncedTargetingKey || estimate.isFetching;

  // Open the confirm panel right after „Uložit a odeslat“ created the draft.
  useEffect(() => {
    if (autoConfirmDone.current || searchParams.get("confirm") !== "1" || !base || base.status !== "draft") return;
    autoConfirmDone.current = true;
    openConfirm(base.id);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("confirm");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, searchParams]);

  useEffect(() => {
    if (confirmOpen) confirmRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [confirmOpen]);

  if (!isAdmin) return <AdminOnlyNotice />;
  if (!isNew && isLoading) return <LoadingPage message="Načítám rozesílku…" />;
  if (!isNew && (loadError || !broadcast || !base)) {
    if (!loadError && broadcast && !base) return <LoadingPage message="Načítám rozesílku…" />;
    return (
      <div>
        <BackLink href={BROADCASTS_HREF}>Rozesílky</BackLink>
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-gray-600">Rozesílku se nepodařilo načíst</p>
          <p className="text-sm text-gray-400">{errorMessage(loadError, "Rozesílka nenalezena")}</p>
        </div>
      </div>
    );
  }

  function openConfirm(id: number) {
    setConfirmOpen(true);
    setPhrase("");
    setSendError(null);
    previewMutation.reset();
    previewMutation.mutate(id);
  }

  const update = (patch: Partial<BroadcastForm>) => {
    setNotice(null);
    setConfirmOpen(false);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const changeType = (key: string) => {
    const type = (types ?? []).find((t) => t.key === key);
    update({ type_key: key, channels: type ? [...type.channels] : form.channels });
  };

  const limits = meta?.limits ?? DEFAULT_TEMPLATE_LIMITS;
  const wideThreshold = meta?.wideThreshold ?? DEFAULT_WIDE_THRESHOLD;
  const typeChannels = selectedType?.channels ?? ["push", "feed"];

  const formProblems: string[] = [];
  if (!form.title.trim()) formProblems.push("Vyplňte titulek.");
  if (!form.body.trim()) formProblems.push("Vyplňte text zprávy.");
  if (!form.type_key) formProblems.push("Vyberte typ notifikace.");
  if (form.channels.length === 0) formProblems.push("Vyberte kanál.");
  if (form.title.length > TITLE_MAX) formProblems.push(`Titulek může mít nejvýše ${TITLE_MAX} znaků.`);
  if (form.body.trim().length > limits.feed_body) {
    formProblems.push(`Text může mít nejvýše ${limits.feed_body} znaků.`);
  }
  if (form.deadline && !fromDateTimeLocalValue(form.deadline)) formProblems.push("Termín není platné datum.");
  const sendProblems = [...formProblems, ...targetingProblems(form.targeting)];
  if (selectedType && !selectedType.is_active) sendProblems.push("Vybraný typ je vypnutý — zapněte ho na záložce Typy.");

  const roleMismatch =
    selectedType && selectedType.target_role !== "all"
      ? form.targeting.roles.filter((r) => r !== selectedType.target_role)
      : [];

  /** Saves the draft; returns it, or null after showing the error. */
  const save = async (): Promise<NotificationBroadcast | null> => {
    setSaveError(null);
    setNotice(null);
    try {
      const payload = toPayload(form);
      const savedBroadcast = isNew
        ? await createMutation.mutateAsync(payload)
        : await updateMutation.mutateAsync({ id: base!.id, ...payload });
      if (!isNew) {
        setBase(savedBroadcast);
        setForm(toForm(savedBroadcast));
      }
      return savedBroadcast;
    } catch (err) {
      setSaveError(err);
      return null;
    }
  };

  const handleSaveDraft = async () => {
    const savedBroadcast = await save();
    if (!savedBroadcast) return;
    if (isNew) router.replace(`/admin/notifications/broadcasts/${savedBroadcast.id}`);
    else setNotice("Koncept je uložený.");
  };

  const handleSend = async () => {
    if (sendProblems.length > 0) return;
    if (isNew) {
      const created = await save();
      if (created) router.replace(`/admin/notifications/broadcasts/${created.id}?confirm=1`);
      return;
    }
    if (dirty && !(await save())) return;
    openConfirm(base!.id);
  };

  const preview: BroadcastPreview | undefined = previewMutation.data;
  const wide = preview
    ? Boolean(preview.wide) || isWideTargeting(form.targeting, preview.recipient_count, wideThreshold)
    : true;
  const canConfirm =
    !!preview && preview.recipient_count > 0 && (!wide || phrase === CONFIRM_PHRASE) && !sendMutation.isPending;

  const handleConfirmSend = async () => {
    if (!base || !canConfirm) return;
    setSendError(null);
    try {
      await sendMutation.mutateAsync({ id: base.id, confirmWide: wide });
      setConfirmOpen(false);
      setNotice("Rozesílka se odesílá. Průběh se tu průběžně aktualizuje.");
    } catch (err) {
      setSendError(err);
    }
  };

  const handleArchive = async () => {
    if (!base) return;
    if (!confirm(`Archivovat rozesílku „${base.title}“? Zmizí ze seznamu odeslaných.`)) return;
    setActionError(null);
    try {
      await archiveMutation.mutateAsync(base.id);
      setNotice("Rozesílka je archivovaná.");
    } catch (err) {
      setActionError(err);
    }
  };

  const handleDelete = async () => {
    if (!base) return;
    if (!confirm(`Opravdu smazat koncept „${base.title || "bez titulku"}“?`)) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(base.id);
      router.push(BROADCASTS_HREF);
    } catch (err) {
      setActionError(err);
    }
  };

  const schoolName = (id: number) => schools.find((s) => s.id === id)?.name ?? `#${id}`;
  const classroomName = (id: number) =>
    (classroomsData ?? []).find((c) => c.id === id)?.name ?? `#${id}`;

  // ── Local preview (type templates + the form's texts) ──
  const values = { title: form.title.trim(), body: form.body.trim(), deadline: formatDeadline(fromDateTimeLocalValue(form.deadline)) };
  const variables = selectedType?.variables ?? [];
  const localPush = {
    title: renderTemplatePreview(selectedType?.push_title ?? "{{title}}", values, variables),
    body: renderTemplatePreview(selectedType?.push_body ?? "{{body}}", values, variables),
  };
  const localFeed = {
    title: renderTemplatePreview(selectedType?.feed_title ?? "{{title}}", values, variables),
    body: renderTemplatePreview(selectedType?.feed_body ?? "{{body}}", values, variables),
  };
  const reminder =
    form.deadline && deadlineType
      ? {
          title: renderTemplatePreview(deadlineType.feed_title, values, deadlineType.variables ?? []),
          body: renderTemplatePreview(deadlineType.feed_body, values, deadlineType.variables ?? []),
        }
      : null;

  const title = isNew ? "Nová rozesílka" : base?.title || "Rozesílka";

  // ── Read-only (sending / sent / failed / archived) ──
  if (readOnly && base) {
    const progress = broadcastProgress(base);
    const snapshot = base.targeting_snapshot;
    const schoolNames =
      namesFromSnapshot(snapshot, ["schools", "school_names"]) ?? (base.targeting?.school_ids ?? []).map(schoolName);
    const classNames =
      namesFromSnapshot(snapshot, ["classrooms", "classroom_names", "classes"]) ??
      (base.targeting?.classroom_ids ?? []).map(classroomName);
    const canArchive = base.status === "sent" || base.status === "failed";
    const sending = base.status === "sending";

    return (
      <div className="space-y-6">
        <div>
          <BackLink href={BROADCASTS_HREF}>Rozesílky</BackLink>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 break-words">{title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <BroadcastStatusPill status={base.status} />
                {base.sent_at && <span className="text-sm text-gray-500">odesláno {formatDateTime(base.sent_at)}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/notifications?tab=history&broadcast_id=${base.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <History className="w-4 h-4" />
                Historie doručení
              </Link>
              {canArchive && (
                <Button variant="secondary" size="sm" onClick={handleArchive} isLoading={archiveMutation.isPending}>
                  {!archiveMutation.isPending && <Archive className="w-4 h-4" />}
                  Archivovat
                </Button>
              )}
            </div>
          </div>
        </div>

        {notice && <Banner tone="success" onClose={() => setNotice(null)}>{notice}</Banner>}
        {actionError !== null && (
          <Banner tone="error" lines={errorLines(actionError, "Akce se nepovedla")} onClose={() => setActionError(null)} />
        )}

        <SectionCard
          title="Průběh"
          actions={sending ? <span className="inline-flex items-center gap-1.5 text-xs text-blue-700"><LoadingSpinner size="sm" />aktualizuje se každé 3 s</span> : undefined}
        >
          <div className="space-y-1">
            <ProgressBar
              value={progress.percent}
              tone={base.status === "failed" ? "red" : progress.percent === 100 ? "green" : "blue"}
            />
            <p className="text-xs text-gray-500 tabular-nums">
              Zpracováno {progress.processed} z {progress.total} ({progress.percent} %)
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <Counter label="Příjemci" value={base.recipient_count} />
            <Counter label="Zpracováno" value={base.processed_count} />
            <Counter label="Doručeno" value={base.delivered_count} tone="green" />
            <Counter label="Přečteno" value={base.read_count ?? 0} tone="green" />
            <Counter label="Potlačeno" value={base.suppressed_count} tone="gray" />
            <Counter label="Selhalo" value={base.failed_count} tone={base.failed_count > 0 ? "red" : undefined} />
          </div>
          <div className="text-xs text-gray-500 space-y-0.5">
            <div>Doručeno = zpráva se načetla v zařízení příjemce (po přihlášení a synchronizaci aplikace).</div>
            <div>Přečteno = příjemci, kterým se zpráva zobrazila v Novinkách nebo ji otevřeli z push notifikace.</div>
            {base.completed_at && <div>Dokončeno {formatDateTime(base.completed_at)}</div>}
            {base.archived_at && <div>Archivováno {formatDateTime(base.archived_at)}</div>}
          </div>
        </SectionCard>

        <SectionCard title="Zpráva">
          <div className="divide-y divide-gray-100">
            <SummaryRow label="Titulek">{base.title}</SummaryRow>
            <SummaryRow label="Text">
              <span className="whitespace-pre-wrap">{base.body}</span>
            </SummaryRow>
            <SummaryRow label="Typ">{(types ?? []).find((t) => t.key === base.type_key)?.name ?? base.type_key}</SummaryRow>
            <SummaryRow label="Kanály">{channelsLabel(base.channels)}</SummaryRow>
            <SummaryRow label="Termín">
              {base.deadline_at ? formatDeadline(base.deadline_at) : <span className="text-gray-400">—</span>}
            </SummaryRow>
            <SummaryRow label="Školy">{schoolNames.length ? schoolNames.join(", ") : "—"}</SummaryRow>
            <SummaryRow label="Třídy">{classNames.length ? classNames.join(", ") : "všechny třídy vybraných škol"}</SummaryRow>
            <SummaryRow label="Komu">
              {(base.targeting?.roles ?? []).map((r) => roleLabel(r)).join(", ") || "—"}
            </SummaryRow>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ── Draft / new ──
  const saving = createMutation.isPending || updateMutation.isPending;
  const est = estimate.data;
  const estimateWide = est ? est.wide || isWideTargeting(form.targeting, est.recipient_count, wideThreshold) : false;

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={BROADCASTS_HREF}>Rozesílky</BackLink>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 break-words">{title}</h1>
            {!isNew && base && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <BroadcastStatusPill status={base.status} />
                {dirty ? (
                  <span className="text-xs text-amber-700">Neuložené změny</span>
                ) : (
                  <span className="text-xs text-gray-400">Uloženo</span>
                )}
              </div>
            )}
          </div>
          {!isNew && base && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleArchive} isLoading={archiveMutation.isPending}>
                {!archiveMutation.isPending && <Archive className="w-4 h-4" />}
                Archivovat
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} isLoading={deleteMutation.isPending}>
                {!deleteMutation.isPending && <Trash2 className="w-4 h-4" />}
                Smazat
              </Button>
            </div>
          )}
        </div>
      </div>

      {notice && <Banner tone="success" onClose={() => setNotice(null)}>{notice}</Banner>}
      {actionError !== null && (
        <Banner tone="error" lines={errorLines(actionError, "Akce se nepovedla")} onClose={() => setActionError(null)} />
      )}
      {saveError !== null && (
        <Banner tone="error" title="Uložení se nepovedlo" lines={errorLines(saveError, "Uložení selhalo")} onClose={() => setSaveError(null)} />
      )}

      <SectionCard title="Zpráva">
        <Field label="Typ notifikace" hint="Jen typy povolené pro ruční rozesílky.">
          <select className={inputClass} value={form.type_key} onChange={(e) => changeType(e.target.value)}>
            {!form.type_key && <option value="">Vyberte typ…</option>}
            {manualTypes.map((t) => (
              <option key={t.key} value={t.key} disabled={!t.manual_allowed}>
                {t.name}
                {!t.is_active ? " (vypnutý)" : ""}
                {!t.manual_allowed ? " (nepovolen pro rozesílky)" : ""}
              </option>
            ))}
          </select>
        </Field>
        {selectedType?.is_mandatory && (
          <Banner tone="info">
            <span className="inline-flex items-center gap-1 font-medium">
              <ShieldAlert className="w-3.5 h-3.5" /> Povinný typ
            </span>{" "}
            — dorazí i v tichých hodinách a lidem, kteří mají push vypnutý.
          </Banner>
        )}
        {types && manualTypes.length === 0 && (
          <Banner tone="warning">Žádný typ není povolený pro ruční rozesílky — povolte ho na záložce Typy.</Banner>
        )}

        <Field
          label="Titulek"
          hint={
            <LengthHint
              length={form.title.trim().length}
              limits={[
                { label: "push", max: limits.push_title },
                { label: "Novinky", max: Math.min(limits.feed_title, TITLE_MAX), hard: true },
              ]}
            />
          }
        >
          <input
            className={inputClass}
            value={form.title}
            maxLength={TITLE_MAX}
            onChange={(e) => update({ title: e.target.value })}
          />
        </Field>
        <Field
          label="Text"
          hint={
            <LengthHint
              length={form.body.trim().length}
              limits={[
                { label: "push", max: limits.push_body },
                { label: "Novinky", max: limits.feed_body, hard: true },
              ]}
            />
          }
        >
          <textarea rows={5} className={inputClass} value={form.body} onChange={(e) => update({ body: e.target.value })} />
        </Field>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1.5">Kanály</p>
          <div className="flex flex-wrap gap-4">
            {CHANNEL_CHOICES.map((choice) => {
              const allowed = choice.channels.every((c) => typeChannels.includes(c));
              return (
                <label
                  key={choice.value}
                  className={cn("flex items-center gap-2 text-sm", allowed ? "cursor-pointer" : "cursor-not-allowed opacity-50")}
                >
                  <input
                    type="radio"
                    name="broadcast-channels"
                    checked={form.channels.length > 0 && channelChoice(form.channels) === choice.value}
                    disabled={!allowed}
                    onChange={() => update({ channels: choice.channels })}
                  />
                  {choice.label}
                </label>
              );
            })}
          </div>
        </div>

        <Field
          label="Termín (nepovinné)"
          hint={
            <>
              Den před termínem (24 h) dostanou příjemci připomínku „Blíží se termín“
              {deadlineType && !deadlineType.is_active ? " — typ připomínky je ale vypnutý" : ""}.
            </>
          }
        >
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              className={cn(inputClass, "max-w-xs")}
              value={form.deadline}
              onChange={(e) => update({ deadline: e.target.value })}
            />
            {form.deadline && (
              <button type="button" onClick={() => update({ deadline: "" })} className="text-xs text-gray-500 hover:text-gray-800">
                Zrušit termín
              </button>
            )}
          </div>
        </Field>
      </SectionCard>

      <SectionCard title="Příjemci">
        <TargetingEditor
          value={form.targeting}
          onChange={(targeting) => update({ targeting })}
          schools={schools}
          classroomsBySchool={classroomsBySchool}
          loading={schoolsLoading || classroomsLoading}
        />
        {roleMismatch.length > 0 && selectedType && (
          <Banner tone="warning">
            Typ „{selectedType.name}“ je jen pro {roleLabel(selectedType.target_role).toLowerCase()} —{" "}
            {roleMismatch.map((r) => roleLabel(r).toLowerCase()).join(", ")} ho nedostanou.
          </Banner>
        )}

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-700">Odhad příjemců</span>
            {estimatePending && <LoadingSpinner size="sm" />}
          </div>
          {targetingProblems(form.targeting).length > 0 ? (
            <p className="mt-1 text-sm text-gray-500">{targetingProblems(form.targeting).join(" ")}</p>
          ) : estimate.error ? (
            <p className="mt-1 text-sm text-red-600">{errorMessage(estimate.error, "Odhad se nepodařilo spočítat.")}</p>
          ) : est ? (
            <div className={cn("mt-1 space-y-1", estimatePending && "opacity-60")}>
              <p className="text-sm text-gray-900">
                <span className="text-lg font-semibold tabular-nums">{est.recipient_count}</span>{" "}
                {pluralCs(est.recipient_count, "příjemce", "příjemci", "příjemců")}
                {Object.keys(est.by_role ?? {}).length > 0 && (
                  <span className="text-gray-500">
                    {" "}
                    ({ROLES.filter((r) => est.by_role?.[r] !== undefined)
                      .map((r) => `${roleLabel(r).toLowerCase()} ${est.by_role[r]}`)
                      .join(", ")})
                  </span>
                )}
              </p>
              {estimateWide && (
                <p className="text-xs text-amber-800">
                  Široká rozesílka — odeslání bude potřeba potvrdit napsáním {CONFIRM_PHRASE}.
                </p>
              )}
              {(est.warnings ?? []).map((w, i) => (
                <p key={i} className="text-xs text-amber-800">
                  {warningText(w)}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-400">Počítám…</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Náhled"
        description="Orientační náhled podle šablon vybraného typu. Přesný text vytvoří server — ukáže ho potvrzení před odesláním."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {form.channels.includes("push") && (
            <MessageCard icon={Bell} label="Push" title={localPush.title} body={localPush.body} />
          )}
          {form.channels.includes("feed") && (
            <MessageCard icon={Newspaper} label="Novinky" title={localFeed.title} body={localFeed.body} />
          )}
          {reminder && (
            <MessageCard
              icon={CalendarClock}
              label="Připomínka termínu"
              title={reminder.title}
              body={reminder.body}
              note={`Přijde 24 h před termínem ${formatDeadline(fromDateTimeLocalValue(form.deadline))}.`}
            />
          )}
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {sendProblems.length > 0 && (
          <p className="mr-auto text-xs text-gray-500">Před odesláním: {sendProblems.join(" ")}</p>
        )}
        <Button
          variant="secondary"
          onClick={handleSaveDraft}
          isLoading={saving && !confirmOpen}
          disabled={saving || (!isNew && !dirty) || !form.type_key || form.channels.length === 0}
        >
          {!saving && <Save className="w-4 h-4" />}
          Uložit koncept
        </Button>
        <Button onClick={handleSend} disabled={saving || sendProblems.length > 0 || confirmOpen}>
          <Send className="w-4 h-4" />
          {isNew || dirty ? "Uložit a odeslat…" : "Odeslat…"}
        </Button>
      </div>

      {confirmOpen && base && (
        <section
          ref={confirmRef}
          aria-label="Potvrzení odeslání"
          className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-3"
        >
          <h2 className="text-base font-semibold text-gray-900">Potvrzení odeslání</h2>
          {previewMutation.isPending ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <LoadingSpinner size="sm" />
              Počítám příjemce a připravuji text…
            </div>
          ) : previewMutation.error ? (
            <Banner tone="error" lines={errorLines(previewMutation.error, "Náhled se nepodařilo připravit")} />
          ) : preview ? (
            <>
              <p className="text-sm text-gray-900">
                Rozesílka odejde{" "}
                <span className="font-semibold tabular-nums">{preview.recipient_count}</span>{" "}
                {pluralCs(preview.recipient_count, "příjemci", "příjemcům", "příjemcům")} kanálem{" "}
                {channelsLabel(base.channels)}. Odeslání nejde vrátit.
              </p>
              {preview.recipient_count === 0 && (
                <Banner tone="error">Výběr nemá žádné příjemce — upravte školy, třídy nebo role.</Banner>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {base.channels.includes("push") && (
                  <MessageCard icon={Bell} label="Push" title={preview.rendered?.push_title} body={preview.rendered?.push_body} />
                )}
                {base.channels.includes("feed") && (
                  <MessageCard
                    icon={Newspaper}
                    label="Novinky"
                    title={preview.rendered?.feed_title}
                    body={preview.rendered?.feed_body}
                  />
                )}
              </div>
              {(preview.warnings ?? []).length > 0 && (
                <Banner tone="warning" lines={(preview.warnings ?? []).map(warningText)} />
              )}
              {wide && preview.recipient_count > 0 && (
                <div className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm">
                  <p className="text-red-900">
                    Široká rozesílka
                    {form.targeting.classroom_ids.length === 0 ? " (celé školy)" : ""}. Pro potvrzení napište přesně{" "}
                    <span className="font-mono font-semibold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-300">
                      {CONFIRM_PHRASE}
                    </span>
                    :
                  </p>
                  <input
                    type="text"
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    autoFocus
                    placeholder={CONFIRM_PHRASE}
                    className="mt-2 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  {phrase && phrase !== CONFIRM_PHRASE && (
                    <p className="mt-1 text-xs text-red-600">
                      Text se neshoduje – musí být přesně {CONFIRM_PHRASE} (rozlišuje velikost písmen).
                    </p>
                  )}
                  {phrase === CONFIRM_PHRASE && (
                    <p className="mt-1 text-xs text-green-700 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Potvrzení v pořádku
                    </p>
                  )}
                </div>
              )}
            </>
          ) : null}

          {sendError !== null && (
            <Banner tone="error" lines={errorLines(sendError, "Rozesílku se nepodařilo odeslat")} onClose={() => setSendError(null)} />
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={sendMutation.isPending}>
              Zrušit
            </Button>
            <Button variant="danger" onClick={handleConfirmSend} disabled={!canConfirm} isLoading={sendMutation.isPending}>
              {!sendMutation.isPending && <Send className="w-4 h-4" />}
              Potvrdit odeslání
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

/** The fields a draft's form owns — kept when only status/counters move under it. */
function pickEditable(b: NotificationBroadcast) {
  return {
    title: b.title,
    body: b.body,
    type_key: b.type_key,
    channels: b.channels,
    targeting: b.targeting,
    deadline_at: b.deadline_at,
  };
}
