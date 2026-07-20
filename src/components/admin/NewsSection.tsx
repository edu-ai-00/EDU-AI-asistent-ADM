"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Search, Pencil, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { MarkdownTextarea } from "@/components/MarkdownTextarea";
import {
  useNews,
  useCreateNews,
  useUpdateNews,
  useDeleteNews,
} from "@/hooks/useNews";
import type { NewsItem } from "@/types/news";
import { cn } from "@/lib/utils";

export function NewsSection() {
  const { data: news, isLoading, error } = useNews();
  const createMutation = useCreateNews();
  const updateMutation = useUpdateNews();
  const deleteMutation = useDeleteNews();

  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [perex, setPerex] = useState("");
  const [body, setBody] = useState("");
  const [publish, setPublish] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit dialog state
  const [editItem, setEditItem] = useState<NewsItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPerex, setEditPerex] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editPublish, setEditPublish] = useState(false);
  const [editError, setEditError] = useState("");

  const filteredNews = useMemo(() => {
    if (!news) return [];
    if (!searchQuery.trim()) return news;
    const q = searchQuery.toLowerCase();
    return news.filter(
      (n) => n.title.toLowerCase().includes(q) || n.perex.toLowerCase().includes(q)
    );
  }, [news, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      await createMutation.mutateAsync({ title, perex, body, publish });
      setTitle("");
      setPerex("");
      setBody("");
      setPublish(false);
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Chyba při vytváření novinky");
    }
  };

  const openEdit = (item: NewsItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditPerex(item.perex);
    setEditBody(item.body);
    setEditPublish(item.is_published);
    setEditError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setEditError("");

    try {
      await updateMutation.mutateAsync({
        id: editItem.id,
        title: editTitle,
        perex: editPerex,
        body: editBody,
        publish: editPublish,
      });
      setEditItem(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Chyba při ukládání");
    }
  };

  const handleTogglePublish = async (item: NewsItem) => {
    try {
      await updateMutation.mutateAsync({ id: item.id, publish: !item.is_published });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number, itemTitle: string) => {
    if (!confirm(`Opravdu chcete smazat novinku „${itemTitle}“?`)) return;

    try {
      await deleteMutation.mutateAsync(id);
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
      <div className="text-center py-12 text-red-500">
        Chyba při načítání novinek: {error instanceof Error ? error.message : "Neznámá chyba"}
      </div>
    );
  }

  return (
    <div>
      {/* Search + Create */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Hledat novinku podle názvu nebo perexu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Přidat novinku
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Nová novinka</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              placeholder="Název"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              placeholder="Perex"
              value={perex}
              onChange={(e) => setPerex(e.target.value)}
              required
            />
            <MarkdownTextarea
              label="Obsah"
              value={body}
              onChange={setBody}
              rows={8}
              placeholder="Obsah novinky (Markdown)"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Publikovat ihned
            </label>
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" isLoading={createMutation.isPending}>
                Vytvořit
              </Button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(""); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Zrušit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit dialog */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Upravit novinku</h3>
              <button
                onClick={() => setEditItem(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Název</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Perex</label>
                <Input
                  value={editPerex}
                  onChange={(e) => setEditPerex(e.target.value)}
                  required
                />
              </div>
              <MarkdownTextarea
                label="Obsah"
                value={editBody}
                onChange={setEditBody}
                rows={8}
                placeholder="Obsah novinky (Markdown)"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editPublish}
                  onChange={(e) => setEditPublish(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Publikováno
              </label>
              {editError && (
                <p className="text-sm text-red-600">{editError}</p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Zrušit
                </button>
                <Button type="submit" isLoading={updateMutation.isPending}>
                  Uložit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* News list */}
      {filteredNews.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-600">
            {searchQuery ? "Žádné novinky neodpovídají hledání" : "Zatím žádné novinky."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNews.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                  <span
                    className={cn(
                      "inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium",
                      item.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {item.is_published ? "Publikováno" : "Koncept"}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.perex}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Vytvořeno {new Date(item.created_at).toLocaleDateString("cs-CZ")}
                </p>
              </div>
              <div className="inline-flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleTogglePublish(item)}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 h-8 w-8 transition-colors"
                  title={item.is_published ? "Skrýt (převést na koncept)" : "Publikovat"}
                >
                  {item.is_published ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(item)}
                  className="inline-flex items-center justify-center rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 h-8 w-8 transition-colors"
                  title="Upravit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 h-8 w-8 transition-colors"
                  title="Smazat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
