"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Download,
  Edit,
  Check,
  X,
  Layers,
  Globe,
  Lock,
  Save,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  useVector,
  useUpdateVector,
  useVectorDimensions,
  useCreateDimension,
  useUpdateDimension,
  useDeleteDimension,
  useBulkImportDimensions,
} from "@/hooks/useSkills";
import { Button } from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Dialog } from "@/components/ui/Dialog";
import type {
  CreateDimensionInput,
  GpfJsonImportFlat,
  GpfJsonDimensionFlat,
  GpfDomain,
  GpfConstruct,
  GpfSubconstruct,
} from "@/types/skills";

export default function VectorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const vectorId = params.id;
  const { data: vector, isLoading: vectorLoading } = useVector(vectorId);
  const { data: dimensions, isLoading: dimsLoading } =
    useVectorDimensions(vectorId);
  const updateVector = useUpdateVector(vectorId);
  const createDimension = useCreateDimension(vectorId);
  const deleteDimension = useDeleteDimension(vectorId);
  const bulkImport = useBulkImportDimensions(vectorId);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [showAddDim, setShowAddDim] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [editingDimId, setEditingDimId] = useState<string | null>(null);
  const [editDim, setEditDim] = useState({
    code: "",
    name: "",
    domain_code: "",
    domain_name: "",
    construct_name: "",
  });
  const [newDim, setNewDim] = useState<CreateDimensionInput>({
    dimension_index: 0,
    code: "",
    name: "",
    domain_code: "",
    domain_name: "",
    construct_name: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateDim = useUpdateDimension(vectorId, editingDimId || "");

  const isLoading = vectorLoading || dimsLoading;

  if (isLoading) return <LoadingPage message="Načítám vektor..." />;
  if (!vector)
    return (
      <div className="text-center py-12 text-gray-500">Vektor nenalezen</div>
    );

  const sortedDimensions = [...(dimensions || [])].sort(
    (a, b) => a.dimension_index - b.dimension_index
  );

  const nextIndex = sortedDimensions.length
    ? sortedDimensions[sortedDimensions.length - 1].dimension_index + 1
    : 0;

  const startEditName = () => {
    setEditingName(true);
    setNameValue(vector.name);
    setDescValue(vector.description || "");
  };

  const saveVectorMeta = async () => {
    await updateVector.mutateAsync({
      name: nameValue,
      description: descValue || null,
    });
    setEditingName(false);
  };

  const handleAddDimension = async () => {
    if (!newDim.name.trim()) return;
    await createDimension.mutateAsync({
      ...newDim,
      dimension_index: nextIndex,
    });
    setShowAddDim(false);
    setNewDim({
      dimension_index: 0,
      code: "",
      name: "",
      domain_code: "",
      domain_name: "",
      construct_name: "",
    });
  };

  const handleDeleteDimension = async (dimId: string) => {
    await deleteDimension.mutateAsync(dimId);
  };

  const startEditDimension = (dim: typeof sortedDimensions[0]) => {
    setEditingDimId(dim.id);
    setEditDim({
      code: dim.code || "",
      name: dim.name,
      domain_code: dim.domain_code || "",
      domain_name: dim.domain_name || "",
      construct_name: dim.construct_name || "",
    });
  };

  const saveEditDimension = async () => {
    if (!editingDimId || !editDim.name.trim()) return;
    await updateDim.mutateAsync({
      code: editDim.code || null,
      name: editDim.name,
      domain_code: editDim.domain_code || null,
      domain_name: editDim.domain_name || null,
      construct_name: editDim.construct_name || null,
    });
    setEditingDimId(null);
  };

  const handleExportJson = () => {
    if (!dimensions || !vector) return;
    const sorted = [...dimensions].sort(
      (a, b) => a.dimension_index - b.dimension_index
    );

    // Build native GPF format grouped by domain
    const domainMap: Record<string, { id: string; domain: string; constructs: Record<string, { id: string; construct: string; subconstructs: { id: string; subconstruct: string }[] }> }> = {};
    for (const dim of sorted) {
      const dc = dim.domain_code || "X";
      const dn = dim.domain_name || dc;
      if (!domainMap[dc]) domainMap[dc] = { id: dc, domain: dn, constructs: {} };
      const cc = dim.construct_name || "General";
      // Use domain+construct as key to group
      const cKey = `${dc}_${cc}`;
      if (!domainMap[dc].constructs[cKey]) {
        domainMap[dc].constructs[cKey] = {
          id: dim.code?.split(".").slice(0, 1).join(".") || dc,
          construct: cc,
          subconstructs: [],
        };
      }
      domainMap[dc].constructs[cKey].subconstructs.push({
        id: dim.code || `${dc}.${dim.dimension_index}`,
        subconstruct: dim.name,
      });
    }

    const gpf = Object.values(domainMap).map((d) => ({
      id: d.id,
      domain: d.domain,
      constructs: Object.values(d.constructs),
    }));

    const blob = new Blob([JSON.stringify(gpf, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${vector.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      let dims: CreateDimensionInput[];

      // Detect format: native GPF (array of domains) vs flat ({ dimensions: [...] })
      if (Array.isArray(json) && json.length > 0 && json[0].domain && json[0].constructs) {
        // Native GPF format: [{ id, domain, constructs: [{ id, construct, subconstructs: [...] }] }]
        const gpfDomains = json as GpfDomain[];
        dims = [];
        let index = 0;
        for (const domain of gpfDomains) {
          for (const construct of domain.constructs) {
            for (const sub of construct.subconstructs) {
              dims.push({
                dimension_index: index++,
                code: sub.id || null,
                name: sub.subconstruct,
                domain_code: domain.id || null,
                domain_name: domain.domain || null,
                construct_name: construct.construct || null,
              });
            }
          }
        }
      } else if (json.dimensions && Array.isArray(json.dimensions)) {
        // Flat format: { dimensions: [{ code, name, domain_code, ... }] }
        const flat = json as GpfJsonImportFlat;
        dims = flat.dimensions.map(
          (d: GpfJsonDimensionFlat, i: number) => ({
            dimension_index: i,
            code: d.code || null,
            name: d.name,
            domain_code: d.domain_code || null,
            domain_name: d.domain_name || null,
            construct_name: d.construct_name || null,
          })
        );

        if (flat.name && flat.name !== vector.name) {
          await updateVector.mutateAsync({ name: flat.name });
        }
      } else {
        setImportError(
          'Neplatný formát. Očekávaný GPF JSON (pole domén) nebo objekt s polem "dimensions".'
        );
        return;
      }

      if (dims.length === 0) {
        setImportError("Soubor neobsahuje žádné dimenze.");
        return;
      }

      await bulkImport.mutateAsync(dims);
      setShowImport(false);
    } catch {
      setImportError("Chyba při čtení souboru. Zkontrolujte formát JSON.");
    }

    // reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const togglePublic = () => {
    updateVector.mutate({ is_public: !vector.is_public });
  };

  // Group dimensions by domain for visual grouping
  const domainGroups = sortedDimensions.reduce(
    (acc, dim) => {
      const key = dim.domain_code || "other";
      if (!acc[key]) acc[key] = { name: dim.domain_name || "Ostatní", dims: [] };
      acc[key].dims.push(dim);
      return acc;
    },
    {} as Record<string, { name: string; dims: typeof sortedDimensions }>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/vectors"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Vektory
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editingName ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 outline-none w-full"
                  autoFocus
                />
                <textarea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  placeholder="Popis vektoru..."
                  rows={2}
                  className="w-full text-sm text-gray-600 bg-transparent border border-gray-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveVectorMeta}
                    className="p-1 rounded hover:bg-green-50 text-green-600"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-6 h-6 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    {vector.name}
                  </h1>
                  <button
                    onClick={startEditName}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                {vector.description && (
                  <p className="text-gray-600 mt-1">{vector.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                    {vector.dimension_count} dimenzí
                  </span>
                  <span className="text-xs text-gray-400">
                    v{vector.version}
                  </span>
                  <button
                    onClick={togglePublic}
                    className="flex items-center gap-1 text-xs hover:underline"
                  >
                    {vector.is_public ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <Globe className="w-3 h-3" />
                        Veřejný
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400">
                        <Lock className="w-3 h-3" />
                        Soukromý
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 shrink-0 ml-4">
            {sortedDimensions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportJson}
              >
                <Download className="w-4 h-4" />
                Export JSON
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowImport(true)}
            >
              <Upload className="w-4 h-4" />
              Import JSON
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setNewDim((p) => ({ ...p, dimension_index: nextIndex }));
                setShowAddDim(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Přidat dimenzi
            </Button>
          </div>
        </div>
      </div>

      {/* Dimensions table */}
      {!sortedDimensions.length ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Žádné dimenze</p>
          <p className="text-sm mt-1">
            Přidejte dimenze ručně nebo importujte z JSON souboru
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(domainGroups).map(([domainCode, group]) => (
            <div
              key={domainCode}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">
                  {domainCode !== "other" && (
                    <span className="text-blue-600 mr-1.5">{domainCode}</span>
                  )}
                  {group.name}
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  ({group.dims.length} dimenzí)
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {group.dims.map((dim) => {
                  const isEditing = editingDimId === dim.id;
                  return (
                    <div key={dim.id}>
                      <div
                        className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 group cursor-pointer"
                        onClick={() =>
                          isEditing
                            ? setEditingDimId(null)
                            : startEditDimension(dim)
                        }
                      >
                        <span className="w-4 text-gray-400 shrink-0">
                          {isEditing ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="w-8 text-xs text-gray-400 font-mono text-right shrink-0">
                          {dim.dimension_index}
                        </span>
                        <span className="w-16 text-xs font-mono text-blue-600 shrink-0">
                          {dim.code || "—"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-900">
                            {dim.name}
                          </span>
                          {dim.construct_name && (
                            <span className="text-xs text-gray-400 ml-2">
                              ({dim.construct_name})
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDimension(dim.id);
                          }}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Smazat dimenzi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Inline edit form */}
                      {isEditing && (
                        <div className="px-4 pb-3 pt-1 bg-blue-50/50 border-t border-blue-100">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                                Kód
                              </label>
                              <input
                                type="text"
                                value={editDim.code}
                                onChange={(e) =>
                                  setEditDim((p) => ({
                                    ...p,
                                    code: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                                Konstrukt
                              </label>
                              <input
                                type="text"
                                value={editDim.construct_name}
                                onChange={(e) =>
                                  setEditDim((p) => ({
                                    ...p,
                                    construct_name: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="mb-2">
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                              Název
                            </label>
                            <input
                              type="text"
                              value={editDim.name}
                              onChange={(e) =>
                                setEditDim((p) => ({
                                  ...p,
                                  name: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                                Doména (kód)
                              </label>
                              <input
                                type="text"
                                value={editDim.domain_code}
                                onChange={(e) =>
                                  setEditDim((p) => ({
                                    ...p,
                                    domain_code: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                                Doména (název)
                              </label>
                              <input
                                type="text"
                                value={editDim.domain_name}
                                onChange={(e) =>
                                  setEditDim((p) => ({
                                    ...p,
                                    domain_name: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingDimId(null)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              Zrušit
                            </button>
                            <button
                              onClick={saveEditDimension}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              <Check className="w-3 h-3 inline mr-1" />
                              Uložit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add dimension dialog */}
      <Dialog
        open={showAddDim}
        onClose={() => setShowAddDim(false)}
        title="Přidat dimenzi"
        className="max-w-lg"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Kód
              </label>
              <input
                type="text"
                value={newDim.code || ""}
                onChange={(e) =>
                  setNewDim((p) => ({ ...p, code: e.target.value }))
                }
                placeholder="N1.1"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Index
              </label>
              <input
                type="number"
                value={newDim.dimension_index}
                onChange={(e) =>
                  setNewDim((p) => ({
                    ...p,
                    dimension_index: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Název *
            </label>
            <input
              type="text"
              value={newDim.name}
              onChange={(e) =>
                setNewDim((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Přirozená čísla – určí a počítá"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Doména (kód)
              </label>
              <input
                type="text"
                value={newDim.domain_code || ""}
                onChange={(e) =>
                  setNewDim((p) => ({ ...p, domain_code: e.target.value }))
                }
                placeholder="N"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Doména (název)
              </label>
              <input
                type="text"
                value={newDim.domain_name || ""}
                onChange={(e) =>
                  setNewDim((p) => ({ ...p, domain_name: e.target.value }))
                }
                placeholder="Číslo a operace"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Konstrukt
            </label>
            <input
              type="text"
              value={newDim.construct_name || ""}
              onChange={(e) =>
                setNewDim((p) => ({ ...p, construct_name: e.target.value }))
              }
              placeholder="Přirozená čísla"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddDim(false)}>
              Zrušit
            </Button>
            <Button
              onClick={handleAddDimension}
              isLoading={createDimension.isPending}
              disabled={!newDim.name.trim()}
            >
              Přidat
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Import JSON dialog */}
      <Dialog
        open={showImport}
        onClose={() => {
          setShowImport(false);
          setImportError(null);
        }}
        title="Import dimenzí z JSON"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Nahrajte JSON soubor ve formátu GPF. Existující dimenze budou
            nahrazeny.
          </p>
          <div className="text-xs text-gray-400 bg-gray-50 rounded p-3 space-y-2">
            <p className="font-medium text-gray-500">Podporované formáty:</p>
            <p className="font-mono">
              1. GPF: {`[{ "id": "N", "domain": "...", "constructs": [{ "id": "N1", "construct": "...", "subconstructs": [...] }] }]`}
            </p>
            <p className="font-mono">
              2. Plochý: {`{ "dimensions": [{ "code": "N1.1", "name": "...", ... }] }`}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJson}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {importError && (
            <p className="text-sm text-red-600">{importError}</p>
          )}
          {bulkImport.isPending && (
            <p className="text-sm text-blue-600">Importuji dimenze...</p>
          )}
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowImport(false);
                setImportError(null);
              }}
            >
              Zavřít
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
