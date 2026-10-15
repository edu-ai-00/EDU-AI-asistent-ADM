"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Bot, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  useMentors,
  useCreateMentor,
  useUpdateMentor,
  useDeleteMentor,
  useRagEntities,
} from "@/hooks/useMentors";
import { useCourses } from "@/hooks/useCourses";
import {
  ENGINE_LABELS,
  VISIBILITY_LABELS,
  type Mentor,
  type MentorEngine,
  type MentorInput,
  type MentorVisibility,
} from "@/types/mentor";
import { cn } from "@/lib/utils";

interface FormState {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  emoji: string;
  avatarUrl: string;
  engine: MentorEngine;
  ai_context: string;
  rag_legal_entity: string;
  /** Comma-separated in the form; split into a list for the API. */
  rag_domains: string;
  visibility: MentorVisibility;
  course_id: string;
  is_active: boolean;
  sort_order: string;
}

/** "SECONDARY_ADMISSIONS, SCHOOL_EVENTS" → ["SECONDARY_ADMISSIONS", "SCHOOL_EVENTS"] */
function parseDomains(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((d) => d.trim())
    .filter((d) => d !== "");
}

const EMPTY_FORM: FormState = {
  slug: "",
  name: "",
  subtitle: "",
  description: "",
  emoji: "",
  avatarUrl: "",
  engine: "llm",
  ai_context: "",
  rag_legal_entity: "",
  rag_domains: "",
  visibility: "public",
  course_id: "",
  is_active: true,
  sort_order: "0",
};

function formFromMentor(mentor: Mentor): FormState {
  return {
    slug: mentor.slug,
    name: mentor.name,
    subtitle: mentor.subtitle ?? "",
    description: mentor.description ?? "",
    emoji: mentor.emoji ?? "",
    avatarUrl: mentor.avatar_url ?? "",
    engine: mentor.engine,
    ai_context: mentor.ai_context ?? "",
    rag_legal_entity: mentor.rag_legal_entity ?? "",
    rag_domains: (mentor.rag_domains ?? []).join(", "),
    visibility: mentor.visibility,
    course_id: mentor.course_id ? String(mentor.course_id) : "",
    is_active: mentor.is_active,
    sort_order: String(mentor.sort_order),
  };
}

export function MentorsSection() {
  const { data: mentors, isLoading, error } = useMentors();
  const { data: courses } = useCourses();
  const createMutation = useCreateMentor();
  const updateMutation = useUpdateMentor();
  const deleteMutation = useDeleteMentor();

  const [editing, setEditing] = useState<Mentor | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const dialogOpen = creating || editing !== null;
  // Only fetch the entity list once a RAG mentor is actually being edited.
  const { data: ragEntities } = useRagEntities(dialogOpen && form.engine === "rag");

  useEffect(() => {
    if (creating) {
      setForm(EMPTY_FORM);
      setFormError("");
    } else if (editing) {
      setForm(formFromMentor(editing));
      setFormError("");
    }
  }, [creating, editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const closeDialog = () => {
    setCreating(false);
    setEditing(null);
  };

  const buildPayload = (): MentorInput => ({
    name: form.name,
    subtitle: form.subtitle || null,
    description: form.description || null,
    emoji: form.emoji || null,
    avatar_url: form.avatarUrl.trim() || null,
    engine: form.engine,
    ai_context: form.engine === "llm" ? form.ai_context || null : null,
    rag_legal_entity: form.engine === "rag" ? form.rag_legal_entity || null : null,
    rag_domains: form.engine === "rag" ? parseDomains(form.rag_domains) : null,
    visibility: form.visibility,
    course_id: form.course_id ? Number(form.course_id) : null,
    is_active: form.is_active,
    sort_order: Number(form.sort_order) || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...buildPayload() });
      } else {
        await createMutation.mutateAsync({ slug: form.slug, ...buildPayload() });
      }
      closeDialog();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Chyba při ukládání mentora");
    }
  };

  const handleToggleActive = async (mentor: Mentor) => {
    try {
      await updateMutation.mutateAsync({ id: mentor.id, is_active: !mentor.is_active });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (mentor: Mentor) => {
    if (!confirm(`Opravdu smazat mentora „${mentor.name}“?`)) return;

    try {
      await deleteMutation.mutateAsync(mentor.id);
    } catch (err) {
      // The API refuses to delete a mentor that already has conversations.
      alert(err instanceof Error ? err.message : "Mentora se nepodařilo smazat");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Mentory se nepodařilo načíst: {error instanceof Error ? error.message : "neznámá chyba"}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nový mentor
        </Button>
      </div>

      <div className="space-y-2">
        {(mentors ?? []).map((mentor) => (
          <div
            key={mentor.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4",
              !mentor.is_active && "opacity-60"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-xl">
              {mentor.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mentor.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                mentor.emoji || "💬"
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-gray-900">{mentor.name}</span>
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {mentor.slug}
                </code>
                <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                  {mentor.engine === "rag" ? (
                    <FileSearch className="h-3 w-3" />
                  ) : (
                    <Bot className="h-3 w-3" />
                  )}
                  {ENGINE_LABELS[mentor.engine]}
                </span>
                {mentor.visibility === "hidden" && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                    Skrytý — kurz {mentor.course_name ?? mentor.course_id}
                  </span>
                )}
                {!mentor.is_active && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                    Neaktivní
                  </span>
                )}
              </div>

              {mentor.subtitle && (
                <p className="mt-0.5 text-sm text-gray-600">{mentor.subtitle}</p>
              )}

              <p className="mt-1 text-xs text-gray-500">
                {mentor.engine === "rag"
                  ? `Dokumenty: ${mentor.rag_legal_entity_effective ?? "—"}` +
                    (mentor.rag_domains?.length ? ` · Domény: ${mentor.rag_domains.join(", ")}` : "")
                  : `Kontext pro AI: ${mentor.ai_context ? `${mentor.ai_context.length} znaků` : "nenastaven"}`}
                {mentor.session_count !== null && ` · ${mentor.session_count} konverzací`}
              </p>
            </div>

            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleActive(mentor)}
                title={mentor.is_active ? "Deaktivovat" : "Aktivovat"}
              >
                {mentor.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(mentor)} title="Upravit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(mentor)}
                title="Smazat"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editing ? `Mentor: ${editing.name}` : "Nový mentor"}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {!editing && (
            <Input
              label="Slug (identifikátor, nelze později změnit)"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="napr_mentor_fyziky"
              required
            />
          )}

          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <Input
              label="Emoji"
              value={form.emoji}
              onChange={(e) => set("emoji", e.target.value)}
              placeholder="🤖"
            />
            <Input
              label="Název"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          <Input
            label="Avatar (URL obrázku)"
            type="url"
            value={form.avatarUrl}
            onChange={(e) => set("avatarUrl", e.target.value)}
            placeholder="https://… — prázdné = použije se emoji"
          />

          <Input
            label="Podtitulek"
            value={form.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            placeholder="Specialista na matematiku"
          />

          <Input
            label="Popis"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Řeší příklady krok za krokem"
          />

          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Zdroj odpovědí</span>
            <div className="flex gap-3">
              {(Object.keys(ENGINE_LABELS) as MentorEngine[]).map((engine) => (
                <label key={engine} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="engine"
                    checked={form.engine === engine}
                    onChange={() => set("engine", engine)}
                  />
                  {ENGINE_LABELS[engine]}
                </label>
              ))}
            </div>
          </div>

          {form.engine === "llm" ? (
            <div>
              <label
                htmlFor="ai_context"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Kontext pro AI
              </label>
              <textarea
                id="ai_context"
                value={form.ai_context}
                onChange={(e) => set("ai_context", e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Zaměřuj se na matematické koncepty…"
              />
              <p className="mt-1 text-xs text-gray-500">
                Připojí se k systémovému promptu. Bezpečnostní pravidla, styl odpovědí a
                dnešní datum přidává API samo — sem patří jen to, čím se tenhle mentor liší.
              </p>
            </div>
          ) : (
            <div>
              <label
                htmlFor="rag_legal_entity"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Dokumenty (legal entity v RAG)
              </label>
              <input
                id="rag_legal_entity"
                list="rag-entities"
                value={form.rag_legal_entity}
                onChange={(e) => set("rag_legal_entity", e.target.value)}
                placeholder="Prázdné = výchozí z konfigurace API"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="rag-entities">
                {(ragEntities ?? []).map((entity) => (
                  <option key={entity.code} value={entity.code}>
                    {entity.name}
                  </option>
                ))}
              </datalist>
              <p className="mt-1 text-xs text-gray-500">
                {ragEntities && ragEntities.length > 0
                  ? `Načteno ${ragEntities.length} entit z RAG služby.`
                  : "Seznam entit se nepodařilo načíst — kód lze zadat ručně."}
              </p>

              <label
                htmlFor="rag_domains"
                className="mb-1 mt-3 block text-sm font-medium text-gray-700"
              >
                Domény dokumentů (domains v RAG)
              </label>
              <input
                id="rag_domains"
                value={form.rag_domains}
                onChange={(e) => set("rag_domains", e.target.value)}
                placeholder="SECONDARY_ADMISSIONS"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Zúží hledání na část dokumentů entity (Cermatík: SECONDARY_ADMISSIONS). Více
                kódů oddělte čárkou. Prázdné = hledá ve všech dokumentech entity.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="visibility" className="mb-1 block text-sm font-medium text-gray-700">
              Viditelnost
            </label>
            <select
              id="visibility"
              value={form.visibility}
              onChange={(e) => set("visibility", e.target.value as MentorVisibility)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(VISIBILITY_LABELS) as MentorVisibility[]).map((visibility) => (
                <option key={visibility} value={visibility}>
                  {VISIBILITY_LABELS[visibility]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="course_id" className="mb-1 block text-sm font-medium text-gray-700">
              Kurz {form.visibility === "hidden" && <span className="text-red-600">*</span>}
            </label>
            <select
              id="course_id"
              value={form.course_id}
              onChange={(e) => set("course_id", e.target.value)}
              required={form.visibility === "hidden"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Bez vazby na kurz</option>
              {(courses ?? []).map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            {form.visibility === "hidden" && (
              <p className="mt-1 text-xs text-gray-500">
                Skrytý mentor se nenabízí ve výpisu nového chatu — otevřít ho můžou jen
                studenti tohoto kurzu.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pořadí"
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => set("sort_order", e.target.value)}
            />
            <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
              />
              Aktivní
            </label>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
            <Button type="button" variant="secondary" onClick={closeDialog}>
              Zrušit
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              Uložit
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
