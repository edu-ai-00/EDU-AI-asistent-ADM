"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, X, Eye, EyeOff, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  useAvatarItems,
  useCreateAvatarItem,
  useUpdateAvatarItem,
  useDeleteAvatarItem,
} from "@/hooks/useAvatarItems";
import {
  AVATAR_RARITIES,
  AVATAR_RARITY_LABELS,
  AVATAR_SLOTS,
  AVATAR_SLOT_LABELS,
  type AvatarItem,
  type AvatarRarity,
  type AvatarSlot,
} from "@/types/avatar";
import { cn } from "@/lib/utils";

/** Suggested paint order per slot — matches the numbering in the artwork. */
const DEFAULT_LAYER: Record<AvatarSlot, number> = {
  torso: 20,
  legs: 21,
  eyes: 30,
  mouth: 31,
  face: 32,
  head: 40,
  neck: 50,
  hands: 51,
  held: 52,
};

const RARITY_CLASSES: Record<AvatarRarity, string> = {
  common: "bg-gray-100 text-gray-700",
  rare: "bg-blue-100 text-blue-700",
  epic: "bg-purple-100 text-purple-700",
};

export function AvatarItemManager() {
  const { data, isLoading, error } = useAvatarItems();
  const createMutation = useCreateAvatarItem();
  const updateMutation = useUpdateAvatarItem();
  const deleteMutation = useDeleteAvatarItem();

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [slot, setSlot] = useState<AvatarSlot>("head");
  const [rarity, setRarity] = useState<AvatarRarity>("common");
  const [isDefault, setIsDefault] = useState(false);

  const [editItem, setEditItem] = useState<AvatarItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editRarity, setEditRarity] = useState<AvatarRarity>("common");
  const [editLayer, setEditLayer] = useState(0);
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editError, setEditError] = useState("");

  const items = data?.data ?? [];

  const bySlot = useMemo(() => {
    const grouped = new Map<AvatarSlot, AvatarItem[]>();
    for (const s of AVATAR_SLOTS) grouped.set(s, []);
    for (const item of items) grouped.get(item.slot)?.push(item);
    return grouped;
  }, [items]);

  // What a brand-new account sees: the default item of each slot, stacked in
  // paint order. Renders here exactly as the app composes it, so a wrong
  // `layer` is visible before it ships.
  const defaultOutfit = useMemo(
    () =>
      items
        .filter((i) => i.is_default && i.is_active)
        .sort((a, b) => a.layer - b.layer),
    [items]
  );

  const resetForm = () => {
    setFile(null);
    setCode("");
    setName("");
    setSlot("head");
    setRarity("common");
    setIsDefault(false);
    setFormError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!file) {
      setFormError("Vyberte SVG soubor");
      return;
    }

    try {
      await createMutation.mutateAsync({
        file,
        code,
        name,
        slot,
        layer: DEFAULT_LAYER[slot],
        rarity,
        price: 0,
        is_default: isDefault,
        is_active: true,
        sort_order: (bySlot.get(slot)?.length ?? 0) * 10 + 10,
      });
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Chyba při nahrávání");
    }
  };

  const openEdit = (item: AvatarItem) => {
    setEditItem(item);
    setEditName(item.name);
    setEditRarity(item.rarity);
    setEditLayer(item.layer);
    setEditSortOrder(item.sort_order);
    setEditFile(null);
    setEditError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setEditError("");

    try {
      await updateMutation.mutateAsync({
        id: editItem.id,
        name: editName,
        rarity: editRarity,
        layer: editLayer,
        sort_order: editSortOrder,
        file: editFile,
      });
      setEditItem(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Chyba při ukládání");
    }
  };

  const handleToggleActive = async (item: AvatarItem) => {
    try {
      await updateMutation.mutateAsync({ id: item.id, is_active: !item.is_active });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (item: AvatarItem) => {
    if (
      !confirm(
        `Opravdu smazat „${item.name}“? Smaže se i soubor v R2 a všichni, kdo ho vlastní, o něj přijdou.`
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(item.id);
    } catch (err) {
      console.error(err);
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error instanceof Error ? error.message : "Nepodařilo se načíst katalog"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AvatarPreview items={defaultOutfit} />

        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? "Zrušit" : "Nový předmět"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">SVG soubor</span>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:text-blue-700"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Slot</span>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as AvatarSlot)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {AVATAR_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {AVATAR_SLOT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">
                Kód (unikátní, bez diakritiky)
              </span>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="head_zlata_korunka"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Název</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Zlatá korunka"
                required
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-gray-700">Vzácnost</span>
              <select
                value={rarity}
                onChange={(e) => setRarity(e.target.value as AvatarRarity)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {AVATAR_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {AVATAR_RARITY_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-700">
                Součást základního avatara (zdarma pro všechny)
              </span>
            </label>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <Button type="submit" isLoading={createMutation.isPending}>
            Nahrát
          </Button>
        </form>
      )}

      {AVATAR_SLOTS.map((s) => {
        const slotItems = bySlot.get(s) ?? [];
        if (slotItems.length === 0) return null;

        return (
          <section key={s}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              {AVATAR_SLOT_LABELS[s]} ({slotItems.length})
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {slotItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-lg border bg-white p-3",
                    item.is_active ? "border-gray-200" : "border-dashed border-gray-300 opacity-60"
                  )}
                >
                  <div className="relative mb-2 aspect-square overflow-hidden rounded bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element -- R2 host is not in next.config images */}
                    <img
                      src={item.url}
                      alt={item.name}
                      className="h-full w-full object-contain"
                    />
                    {item.is_default && (
                      <span
                        title="Základní avatar"
                        className="absolute right-1 top-1 rounded-full bg-amber-100 p-1"
                      >
                        <Star className="h-3 w-3 text-amber-600" />
                      </span>
                    )}
                  </div>

                  <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="truncate font-mono text-xs text-gray-400">{item.code}</p>

                  <div className="mt-2 flex items-center gap-1">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs",
                        RARITY_CLASSES[item.rarity]
                      )}
                    >
                      {AVATAR_RARITY_LABELS[item.rarity]}
                    </span>
                    <span className="text-xs text-gray-400">L{item.layer}</span>
                  </div>

                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(item)}>
                      {item.is_active ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleEdit}
            className="w-full max-w-md space-y-4 rounded-lg bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editItem.code}</h3>
              <button type="button" onClick={() => setEditItem(null)}>
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <label className="space-y-1 block">
              <span className="text-sm font-medium text-gray-700">Název</span>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-gray-700">Vrstva</span>
                <Input
                  type="number"
                  value={editLayer}
                  onChange={(e) => setEditLayer(Number(e.target.value))}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-gray-700">Pořadí</span>
                <Input
                  type="number"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(Number(e.target.value))}
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-sm font-medium text-gray-700">Vzácnost</span>
              <select
                value={editRarity}
                onChange={(e) => setEditRarity(e.target.value as AvatarRarity)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {AVATAR_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {AVATAR_RARITY_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 block">
              <span className="text-sm font-medium text-gray-700">
                Nahradit SVG (volitelné)
              </span>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:text-blue-700"
              />
              <span className="block text-xs text-gray-400">
                Soubor si nechá stejnou adresu — aplikace si ho stáhne znovu podle
                data změny.
              </span>
            </label>

            {editError && <p className="text-sm text-red-600">{editError}</p>}

            <div className="flex gap-2">
              <Button type="submit" isLoading={updateMutation.isPending}>
                Uložit
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditItem(null)}>
                Zrušit
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/** The composed default avatar — every layer stacked at full size. */
function AvatarPreview({ items }: { items: AvatarItem[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">Základní avatar</p>
      <div className="relative h-40 w-40 rounded-lg border border-gray-200 bg-gray-50">
        {items.map((item) => (
          // Every asset shares one 1024×1024 canvas, so layers just overlap at
          // full size — no per-item positioning.
          // eslint-disable-next-line @next/next/no-img-element -- R2 host is not in next.config images
          <img
            key={item.id}
            src={item.url}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ))}
        {items.length === 0 && (
          <p className="flex h-full items-center justify-center px-2 text-center text-xs text-gray-400">
            Žádný předmět není označen jako základní
          </p>
        )}
      </div>
    </div>
  );
}
