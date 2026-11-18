"use client";

import { useState } from "react";
import { Image as ImageIcon, Lock, Plus, Trash2 } from "lucide-react";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  useCreateDashboardBanner,
  useDashboardBanners,
  useDeleteDashboardBanner,
  useUpdateDashboardBanner,
} from "@/hooks/useDashboardBanners";
import {
  ACCENT_LABELS,
  ILLUSTRATION_LABELS,
  ROLE_LABELS,
  xpBandLabel,
} from "@/types/dashboard-banners";
import type {
  DashboardBanner,
  DashboardBannerAccent,
  DashboardBannerInput,
  DashboardBannerRole,
} from "@/types/dashboard-banners";
import { ActivePill, Banner, Field, Pill, SectionCard, errorMessage, inputClass } from "./shared";

/** The editor's working copy: everything a string, so inputs stay controlled. */
interface Draft {
  name: string;
  title: string;
  body: string;
  badge: string;
  link: string;
  accent: DashboardBannerAccent;
  illustration: string;
  target_role: DashboardBannerRole;
  position: string;
  min_xp: string;
  max_xp: string;
  is_active: boolean;
}

const EMPTY_DRAFT: Draft = {
  name: "",
  title: "",
  body: "",
  badge: "",
  link: "",
  accent: "primary",
  illustration: "news",
  target_role: "all",
  position: "0",
  min_xp: "",
  max_xp: "",
  is_active: false,
};

function toDraft(banner: DashboardBanner): Draft {
  return {
    name: banner.name,
    title: banner.title,
    body: banner.body,
    badge: banner.badge ?? "",
    link: banner.link ?? "",
    accent: banner.accent,
    illustration: banner.illustration ?? "",
    target_role: banner.target_role,
    position: String(banner.position),
    min_xp: banner.min_xp === null ? "" : String(banner.min_xp),
    max_xp: banner.max_xp === null ? "" : String(banner.max_xp),
    is_active: banner.is_active,
  };
}

/** An empty number field means "no bound", not zero. */
function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPayload(draft: Draft): DashboardBannerInput {
  return {
    name: draft.name.trim(),
    title: draft.title.trim(),
    body: draft.body,
    badge: draft.badge.trim() === "" ? null : draft.badge.trim(),
    link: draft.link.trim() === "" ? null : draft.link.trim(),
    accent: draft.accent,
    illustration: draft.illustration === "" ? null : draft.illustration,
    target_role: draft.target_role,
    position: optionalNumber(draft.position) ?? 0,
    min_xp: optionalNumber(draft.min_xp),
    max_xp: optionalNumber(draft.max_xp),
    is_active: draft.is_active,
  };
}

/**
 * Dashboard tab (BR-SAWX2U): the banners the app's dashboard shows, with
 * their XP bands and targeting.
 *
 * The XP band is evaluated on the device, not here — the app's own XP is the
 * current one between syncs, so a banner follows the number the moment it
 * moves. Several matching banners all show, in the order given by "Pořadí".
 */
export function DashboardBannersSection() {
  const { data: banners, isLoading, isFetching, error } = useDashboardBanners();
  const createBanner = useCreateDashboardBanner();
  const updateBanner = useUpdateDashboardBanner();
  const deleteBanner = useDeleteDashboardBanner();

  // null = closed, 0 = the "new banner" form, otherwise the banner's id.
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saveError, setSaveError] = useState<string | null>(null);

  const open = (banner: DashboardBanner | null) => {
    setSaveError(null);
    setEditing(banner?.id ?? 0);
    setDraft(banner ? toDraft(banner) : EMPTY_DRAFT);
  };

  const close = () => {
    setEditing(null);
    setSaveError(null);
  };

  const save = async () => {
    setSaveError(null);
    // An invalid (non-empty, non-numeric) XP bound must not slip through as
    // `null` — that would drop the band and widen who an active banner reaches.
    const badXp = ([["Od XP", draft.min_xp], ["Do XP", draft.max_xp]] as const).find(
      ([, value]) => value.trim() !== "" && !Number.isFinite(Number(value.trim())),
    );
    if (badXp) {
      setSaveError(`Zadejte do pole „${badXp[0]}“ platné číslo, nebo pole nechte prázdné.`);
      return;
    }
    const payload = toPayload(draft);
    try {
      if (editing === 0) await createBanner.mutateAsync(payload);
      else if (editing !== null) await updateBanner.mutateAsync({ id: editing, payload });
      close();
    } catch (err) {
      setSaveError(errorMessage(err, "Banner se nepodařilo uložit."));
    }
  };

  const remove = async (banner: DashboardBanner) => {
    setSaveError(null);
    try {
      await deleteBanner.mutateAsync(banner.id);
    } catch (err) {
      setSaveError(errorMessage(err, "Banner se nepodařilo smazat."));
    }
  };

  if (isLoading) return <LoadingPage />;
  if (error) return <Banner tone="error" lines={[errorMessage(error, "Bannery se nepodařilo načíst.")]} />;

  const rows = banners ?? [];
  const saving = createBanner.isPending || updateBanner.isPending;

  return (
    <div className="space-y-4">
      {saveError && <Banner tone="error" lines={[saveError]} onClose={() => setSaveError(null)} />}

      <SectionCard
        title="Bannery na dashboardu"
        description="Pásy nad obsahem přehledu. Zobrazují se opakovaně při každém otevření dashboardu, dokud uživatel spadá do nastaveného rozsahu XP."
        actions={
          <div className="flex items-center gap-2">
            {isFetching && <LoadingSpinner />}
            <button
              type="button"
              onClick={() => open(null)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Nový banner
            </button>
          </div>
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Žádné bannery. Dashboard zobrazí jen svůj pevný obsah.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((banner) => (
              <li key={banner.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{banner.name}</span>
                      <ActivePill active={banner.is_active} />
                      <Pill>{xpBandLabel(banner.min_xp, banner.max_xp)}</Pill>
                      <Pill>{ROLE_LABELS[banner.target_role] ?? banner.target_role}</Pill>
                      {banner.is_system && (
                        <Pill className="bg-amber-50 text-amber-700" title="Systémový banner – lze vypnout, ne smazat">
                          <Lock className="w-3 h-3" />
                          Systémový
                        </Pill>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {banner.title}
                      {banner.link && <span className="text-gray-400"> → {banner.link}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">#{banner.position}</span>
                    <button
                      type="button"
                      onClick={() => open(banner)}
                      className="px-2 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Upravit
                    </button>
                    {!banner.is_system && (
                      <button
                        type="button"
                        onClick={() => remove(banner)}
                        disabled={deleteBanner.isPending}
                        aria-label={`Smazat ${banner.name}`}
                        className="p-1 rounded-md border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {editing !== null && (
        <SectionCard
          title={editing === 0 ? "Nový banner" : "Úprava banneru"}
          description="Rozsah XP vyhodnocuje aplikace z lokálního počtu XP. Prázdná hranice znamená „bez omezení“."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Název (jen pro administraci)">
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="Pořadí" hint="Nižší číslo je výš; rozhoduje i při více shodách.">
              <input
                className={inputClass}
                inputMode="numeric"
                value={draft.position}
                onChange={(e) => setDraft({ ...draft, position: e.target.value })}
              />
            </Field>
            <Field label="Štítek" hint="Např. PŘIJÍMAČKY. Prázdné = bez štítku.">
              <input
                className={inputClass}
                value={draft.badge}
                onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
              />
            </Field>
            <Field label="Nadpis">
              <input
                className={inputClass}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <Field label="Text" className="sm:col-span-2" hint="Nový řádek v textu banner zachová.">
              <textarea
                className={inputClass}
                rows={3}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </Field>
            <Field
              label="Odkaz po kliknutí"
              hint="Např. /library, /practice, /quiz, /course/123456, /field-course/EDU_JPZ_INTRO, /chat/cermatik. Prázdné = banner nereaguje."
              className="sm:col-span-2"
            >
              <input
                className={inputClass}
                value={draft.link}
                onChange={(e) => setDraft({ ...draft, link: e.target.value })}
              />
            </Field>
            <Field label="Od XP" hint="Prázdné = od začátku.">
              <input
                className={inputClass}
                inputMode="numeric"
                value={draft.min_xp}
                onChange={(e) => setDraft({ ...draft, min_xp: e.target.value })}
              />
            </Field>
            <Field label="Do XP" hint="Prázdné = bez horní hranice.">
              <input
                className={inputClass}
                inputMode="numeric"
                value={draft.max_xp}
                onChange={(e) => setDraft({ ...draft, max_xp: e.target.value })}
              />
            </Field>
            <Field label="Komu">
              <select
                className={inputClass}
                value={draft.target_role}
                onChange={(e) => setDraft({ ...draft, target_role: e.target.value as DashboardBannerRole })}
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Barva">
              <select
                className={inputClass}
                value={draft.accent}
                onChange={(e) => setDraft({ ...draft, accent: e.target.value as DashboardBannerAccent })}
              >
                {Object.entries(ACCENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Obrázek" hint="Obrázky jsou součástí buildu aplikace.">
              <select
                className={inputClass}
                value={draft.illustration}
                onChange={(e) => setDraft({ ...draft, illustration: e.target.value })}
              >
                <option value="">Bez obrázku</option>
                {Object.entries(ILLUSTRATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-900 sm:col-span-2">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />
              Zapnuto
            </label>
          </div>

          <p className="flex items-start gap-1.5 text-xs text-gray-500">
            <ImageIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Cílení na kurz, třídu nebo školu zatím nastavuje API (pole course_id, classroom_id, school_id); v rozhraní přibude až se potvrdí, jak se má kombinovat.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Ukládám…" : "Uložit"}
            </button>
            <button
              type="button"
              onClick={close}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Zrušit
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
