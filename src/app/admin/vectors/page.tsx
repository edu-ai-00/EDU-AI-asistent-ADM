"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Layers,
  Trash2,
  Globe,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { useVectors, useCreateVector, useDeleteVector } from "@/hooks/useSkills";
import { Button } from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Dialog } from "@/components/ui/Dialog";
import type { CreateVectorInput } from "@/types/skills";

export default function VectorsPage() {
  const { data: vectors, isLoading } = useVectors();
  const createVector = useCreateVector();
  const deleteVector = useDeleteVector();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newVector, setNewVector] = useState<CreateVectorInput>({
    name: "",
    description: "",
    dimension_count: 35,
    is_public: false,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = vectors?.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newVector.name.trim()) return;
    await createVector.mutateAsync(newVector);
    setShowCreate(false);
    setNewVector({ name: "", description: "", dimension_count: 35, is_public: false });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteVector.mutateAsync(deleteId);
    setDeleteId(null);
  };

  if (isLoading) return <LoadingPage message="Načítám vektory..." />;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Vektory dovedností
            </h1>
            <p className="text-gray-600 mt-1">
              Správa vektorů a jejich dimenzí pro kurzy
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Nový vektor
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Hledat vektory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Vectors grid */}
      {!filtered?.length ? (
        <div className="text-center py-12 text-gray-500">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Žádné vektory</p>
          <p className="text-sm mt-1">
            Vytvořte první vektor dovedností pro kurzy
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((vector) => (
            <Link
              key={vector.id}
              href={`/admin/vectors/${vector.id}`}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600 shrink-0" />
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {vector.name}
                    </h3>
                  </div>
                  {vector.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {vector.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteId(vector.id);
                  }}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Smazat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                  {vector.dimension_count} dimenzí
                </span>
                <span className="text-xs text-gray-400">v{vector.version}</span>
                {vector.is_public ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Globe className="w-3 h-3" />
                    Veřejný
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Lock className="w-3 h-3" />
                    Soukromý
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nový vektor dovedností"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Název *
            </label>
            <input
              type="text"
              value={newVector.name}
              onChange={(e) =>
                setNewVector((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="např. GPF Matematika – ZŠ"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Počet dimenzí *
            </label>
            <input
              type="number"
              min={1}
              value={newVector.dimension_count}
              onChange={(e) =>
                setNewVector((p) => ({
                  ...p,
                  dimension_count: parseInt(e.target.value) || 1,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-0.5">
              Výchozí 35 pro GPF Matematika
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Popis
            </label>
            <textarea
              value={newVector.description || ""}
              onChange={(e) =>
                setNewVector((p) => ({ ...p, description: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={newVector.is_public}
              onChange={(e) =>
                setNewVector((p) => ({ ...p, is_public: e.target.checked }))
              }
              className="rounded border-gray-300"
            />
            Veřejný vektor (viditelný pro všechny kurzy)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Zrušit
            </Button>
            <Button
              onClick={handleCreate}
              isLoading={createVector.isPending}
              disabled={!newVector.name.trim()}
            >
              Vytvořit
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Smazat vektor"
      >
        <p className="text-sm text-gray-600 mb-4">
          Opravdu chcete smazat tento vektor? Tato akce je nevratná a odstraní
          všechny přiřazené dimenze.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            Zrušit
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteVector.isPending}
          >
            Smazat
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
