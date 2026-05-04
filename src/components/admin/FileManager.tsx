"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Trash2,
  Copy,
  Check,
  Search,
  Music,
  Video,
  FileIcon,
  AlertCircle,
  ScanSearch,
  Image as ImageIcon,
  CheckSquare,
  Square,
  RefreshCw,
} from "lucide-react";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useCourses, useUploadCourse } from "@/hooks/useCourses";
import { useAssets, useUploadAsset, useDeleteAsset } from "@/hooks/useAssets";
import type { Asset, DownloadResponse } from "@/types/api";
import type { CourseV2, BlockV2, BlockStep } from "@/types/block-v2";
import { api } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACCEPT =
  "image/png,image/jpeg,image/webp,image/svg+xml,audio/mpeg,audio/wav,video/mp4,video/quicktime";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isImage(mime: string) {
  return mime.startsWith("image/");
}
function isAudio(mime: string) {
  return mime.startsWith("audio/");
}
function isVideo(mime: string) {
  return mime.startsWith("video/");
}

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").pop() || "file";
  } catch {
    return "file";
  }
}

// ---------------------------------------------------------------------------
// Course JSON URL Scanner
// ---------------------------------------------------------------------------

interface FoundUrl {
  url: string;
  type: "image" | "audio" | "video" | "file";
  location: string; // human-readable location
  /** Setter to replace this URL in the original CourseV2 object */
  setUrl: (newUrl: string) => void;
}

function scanCourseUrls(course: CourseV2): FoundUrl[] {
  const found: FoundUrl[] = [];

  const add = (
    url: string | undefined,
    type: FoundUrl["type"],
    location: string,
    setter: (newUrl: string) => void,
  ) => {
    if (url && url.startsWith("http")) {
      found.push({ url, type, location, setUrl: setter });
    }
  };

  // Course header image
  if (course.header_image) {
    add(course.header_image.url, "image", "Hlavička kurzu", (u) => {
      course.header_image!.url = u;
    });
  }

  // Walk lessons
  course.lessons.forEach((lesson, li) => {
    const lLabel = `Lekce ${li + 1}: ${lesson.name}`;

    // Lesson header image
    if (lesson.header_image) {
      add(lesson.header_image.url, "image", `${lLabel} — hlavička`, (u) => {
        lesson.header_image!.url = u;
      });
    }

    // Lesson block bindings bg_image
    lesson.blocks.forEach((binding) => {
      if (binding.bg_image) {
        add(binding.bg_image, "image", `${lLabel} — blok ${binding.block_id} pozadí`, (u) => {
          binding.bg_image = u;
        });
      }
    });
  });

  // Walk blocks (embedded blocks array)
  const scanBlock = (block: BlockV2, bLabel: string) => {
    // Legacy flat fields
    if (block.image) {
      add(block.image.url, "image", `${bLabel} — obrázek`, (u) => {
        block.image!.url = u;
      });
    }
    if (block.video) {
      add(block.video.url, "video", `${bLabel} — video`, (u) => {
        block.video!.url = u;
      });
    }

    // Legacy question
    if (block.question) {
      if (block.question.solution_image) {
        add(block.question.solution_image.url, "image", `${bLabel} — řešení obrázek`, (u) => {
          block.question!.solution_image!.url = u;
        });
      }
      block.question.options?.forEach((opt, oi) => {
        if (opt.feedback_image) {
          add(opt.feedback_image.url, "image", `${bLabel} — odpověď ${oi + 1} obrázek`, (u) => {
            opt.feedback_image!.url = u;
          });
        }
      });
    }

    // Steps
    block.steps?.forEach((step, si) => {
      const sLabel = `${bLabel} — krok ${si + 1}`;
      scanStep(step, sLabel);
    });
  };

  const scanStep = (step: BlockStep, sLabel: string) => {
    if (step.image) {
      add(step.image.url, "image", `${sLabel} obrázek`, (u) => {
        step.image!.url = u;
      });
    }
    if (step.video) {
      add(step.video.url, "video", `${sLabel} video`, (u) => {
        step.video!.url = u;
      });
    }
    if (step.audio) {
      add(step.audio.url, "audio", `${sLabel} audio`, (u) => {
        step.audio!.url = u;
      });
    }
    if (step.question) {
      if (step.question.solution_image) {
        add(step.question.solution_image.url, "image", `${sLabel} řešení obrázek`, (u) => {
          step.question!.solution_image!.url = u;
        });
      }
      step.question.options?.forEach((opt, oi) => {
        if (opt.feedback_image) {
          add(opt.feedback_image.url, "image", `${sLabel} odpověď ${oi + 1} obrázek`, (u) => {
            opt.feedback_image!.url = u;
          });
        }
      });
    }
  };

  course.blocks?.forEach((block) => {
    scanBlock(block, `Blok ${block.block_id}`);
  });

  return found;
}

/** Check if URL already points to R2 by comparing with known asset URLs */
function isR2Url(url: string, r2Assets: Asset[]): boolean {
  if (r2Assets.length === 0) return false;
  try {
    // Extract the R2 domain from any existing asset
    const r2Host = new URL(r2Assets[0].url).host;
    return new URL(url).host === r2Host;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Copy button with feedback
// ---------------------------------------------------------------------------

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      title="Kopírovat URL"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-600" />
          <span className="text-green-600">Zkopírováno</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>URL</span>
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Single file card
// ---------------------------------------------------------------------------

function FileCard({
  asset,
  onDelete,
  isDeleting,
}: {
  asset: Asset;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden group">
      {/* Preview area */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {isImage(asset.mime_type) ? (
          <img
            src={asset.url}
            alt={asset.filename}
            className="w-full h-full object-cover"
          />
        ) : isAudio(asset.mime_type) ? (
          <Music className="w-10 h-10 text-purple-400" />
        ) : isVideo(asset.mime_type) ? (
          <Video className="w-10 h-10 text-blue-400" />
        ) : (
          <FileIcon className="w-10 h-10 text-gray-400" />
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium text-gray-900 truncate" title={asset.filename}>
          {asset.filename}
        </p>
        <p className="text-xs text-gray-500">{formatBytes(asset.size)}</p>

        <div className="flex items-center justify-between">
          <CopyButton url={asset.url} />
          <button
            onClick={() => onDelete(asset.id)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? (
              <LoadingSpinner className="w-3.5 h-3.5" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Smazat
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset Scanner Panel
// ---------------------------------------------------------------------------

type MigrationStatus = "idle" | "scanning" | "ready" | "migrating" | "saving" | "done";

interface MigrationResult {
  url: string;
  filename: string;
  status: "pending" | "uploading" | "done" | "error";
  newUrl?: string;
  error?: string;
}

function AssetScanner({
  courseId,
  courseNumericId,
  existingAssets,
}: {
  courseId: string;
  courseNumericId: number;
  existingAssets: Asset[];
}) {
  const [status, setStatus] = useState<MigrationStatus>("idle");
  const [foundUrls, setFoundUrls] = useState<FoundUrl[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<MigrationResult[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [courseData, setCourseData] = useState<CourseV2 | null>(null);

  const uploadMutation = useUploadAsset();
  const saveMutation = useUploadCourse();

  const handleScan = async () => {
    setStatus("scanning");
    setScanError(null);
    setFoundUrls([]);
    setSelected(new Set());
    setResults([]);
    setCourseData(null);

    try {
      // Download the course JSON
      const downloadInfo = await api.get<DownloadResponse>(
        `/admin/courses/${courseNumericId}/download`,
      );
      const response = await fetch(downloadInfo.download_url);
      if (!response.ok) throw new Error("Nepodařilo se stáhnout JSON kurzu");
      const data = (await response.json()) as CourseV2;
      setCourseData(data);

      // Scan for URLs
      const urls = scanCourseUrls(data);

      // Filter out URLs already on R2
      const external = urls.filter((u) => !isR2Url(u.url, existingAssets));

      setFoundUrls(external);
      setSelected(new Set(external.map((_, i) => i)));
      setStatus(external.length > 0 ? "ready" : "done");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Chyba při skenování");
      setStatus("idle");
    }
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === foundUrls.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(foundUrls.map((_, i) => i)));
    }
  };

  const handleMigrate = async () => {
    if (!courseData || selected.size === 0) return;

    setStatus("migrating");

    // Initialize results
    const initialResults: MigrationResult[] = foundUrls.map((u, i) => ({
      url: u.url,
      filename: filenameFromUrl(u.url),
      status: selected.has(i) ? "pending" : "done",
    }));
    setResults([...initialResults]);

    // Process selected URLs sequentially
    for (const index of Array.from(selected).sort((a, b) => a - b)) {
      const found = foundUrls[index];

      // Mark as uploading
      initialResults[index].status = "uploading";
      setResults([...initialResults]);

      try {
        // Fetch via proxy to avoid CORS issues with external origins
        const proxyUrl = `/api/proxy-fetch?url=${encodeURIComponent(found.url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();

        // Create a File from the blob
        const filename = filenameFromUrl(found.url);
        const file = new File([blob], filename, { type: blob.type });

        // Upload to R2
        const asset = await uploadMutation.mutateAsync({
          courseId,
          file,
        });

        // Update the URL in the course JSON object
        found.setUrl(asset.url);

        initialResults[index].status = "done";
        initialResults[index].newUrl = asset.url;
      } catch (err) {
        initialResults[index].status = "error";
        initialResults[index].error =
          err instanceof Error ? err.message : "Chyba";
      }
      setResults([...initialResults]);
    }

    // Check if any succeeded — if so, save the course
    const anySuccess = initialResults.some(
      (r) => r.status === "done" && r.newUrl,
    );
    if (anySuccess) {
      setStatus("saving");
      try {
        await saveMutation.mutateAsync(courseData);
        setStatus("done");
      } catch {
        setScanError("Soubory nahrány, ale uložení kurzu selhalo. Zkuste uložit znovu.");
        setStatus("ready");
      }
    } else {
      setStatus("done");
    }
  };

  const doneCount = results.filter(
    (r) => r.status === "done" && r.newUrl,
  ).length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanSearch className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Skenovat externí soubory v JSON
          </h3>
        </div>

        {status === "idle" && (
          <button
            onClick={handleScan}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ScanSearch className="w-3.5 h-3.5" />
            Skenovat
          </button>
        )}

        {status === "scanning" && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <LoadingSpinner className="w-4 h-4" />
            Skenování…
          </div>
        )}
      </div>

      {scanError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {scanError}
        </div>
      )}

      {/* No external URLs found */}
      {status === "done" && foundUrls.length === 0 && results.length === 0 && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Všechny soubory v kurzu už jsou na R2.
        </div>
      )}

      {/* Found URLs list */}
      {foundUrls.length > 0 && status !== "done" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Nalezeno <strong>{foundUrls.length}</strong> externích souborů
            </p>
            {status === "ready" && (
              <button
                onClick={toggleAll}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {selected.size === foundUrls.length
                  ? "Odznačit vše"
                  : "Vybrat vše"}
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {foundUrls.map((found, i) => {
              const result = results[i];
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-3 py-2"
                >
                  {/* Checkbox */}
                  {status === "ready" && (
                    <button
                      onClick={() => toggleSelect(i)}
                      className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                    >
                      {selected.has(i) ? (
                        <CheckSquare className="w-4 h-4 text-gray-900" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  {/* Status indicator during migration */}
                  {result && (
                    <div className="flex-shrink-0">
                      {result.status === "uploading" && (
                        <LoadingSpinner className="w-4 h-4" />
                      )}
                      {result.status === "done" && result.newUrl && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                      {result.status === "done" && !result.newUrl && (
                        <span className="w-4 h-4 block" />
                      )}
                      {result.status === "error" && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      {result.status === "pending" && (
                        <span className="w-4 h-4 block rounded-full border-2 border-gray-200" />
                      )}
                    </div>
                  )}

                  {/* Type icon */}
                  <div className="flex-shrink-0">
                    {found.type === "image" && (
                      <ImageIcon className="w-4 h-4 text-emerald-500" />
                    )}
                    {found.type === "audio" && (
                      <Music className="w-4 h-4 text-purple-500" />
                    )}
                    {found.type === "video" && (
                      <Video className="w-4 h-4 text-blue-500" />
                    )}
                    {found.type === "file" && (
                      <FileIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm text-gray-900 truncate"
                      title={found.url}
                    >
                      {filenameFromUrl(found.url)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {found.location}
                    </p>
                  </div>

                  {/* Error message */}
                  {result?.status === "error" && (
                    <span className="text-xs text-red-500 flex-shrink-0">
                      {result.error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          {status === "ready" && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleMigrate}
                disabled={selected.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Přenahrát vybrané ({selected.size})
              </button>
              <button
                onClick={() => {
                  setStatus("idle");
                  setFoundUrls([]);
                  setSelected(new Set());
                }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Zrušit
              </button>
            </div>
          )}

          {/* Saving indicator */}
          {status === "saving" && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <LoadingSpinner className="w-4 h-4" />
              Ukládání kurzu…
            </div>
          )}

          {/* Migrating indicator */}
          {status === "migrating" && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <LoadingSpinner className="w-4 h-4" />
              Přenahrávání souborů…
            </div>
          )}
        </>
      )}

      {/* Done summary */}
      {status === "done" && results.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Hotovo — {doneCount}/{results.filter((r) => r.newUrl || r.error).length} souborů
            migrováno
            {errorCount > 0 && (
              <span className="text-red-600">
                {" "}({errorCount} chyb)
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setStatus("idle");
              setFoundUrls([]);
              setSelected(new Set());
              setResults([]);
              setCourseData(null);
            }}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skenovat znovu
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FileManager component
// ---------------------------------------------------------------------------

export function FileManager() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: courses, isLoading: coursesLoading } = useCourses();
  const {
    data: assetsResponse,
    isLoading: assetsLoading,
  } = useAssets(selectedCourseId || undefined);
  const uploadMutation = useUploadAsset();
  const deleteMutation = useDeleteAsset();

  const assets = assetsResponse?.data ?? [];
  const meta = assetsResponse?.meta;

  const filtered = search
    ? assets.filter((a) =>
        a.filename.toLowerCase().includes(search.toLowerCase())
      )
    : assets;

  // Find the numeric id for the selected course
  const selectedCourse = courses?.find((c) => c.course_id === selectedCourseId);

  // Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCourseId) return;
    await uploadMutation.mutateAsync({ courseId: selectedCourseId, file });
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Opravdu smazat tento soubor?")) return;
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  // Loading courses
  if (coursesLoading) return <LoadingPage />;

  return (
    <div className="space-y-6">
      {/* Course selector + upload */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={selectedCourseId}
          onChange={(e) => {
            setSelectedCourseId(e.target.value);
            setSearch("");
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="">Vyberte kurz…</option>
          {courses?.map((c) => (
            <option key={c.course_id} value={c.course_id}>
              {c.emoji ? `${c.emoji} ` : ""}
              {c.name} ({c.course_id})
            </option>
          ))}
        </select>

        {selectedCourseId && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              onChange={handleFileChange}
              className="hidden"
              id="asset-upload"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {uploadMutation.isPending ? (
                <LoadingSpinner className="w-4 h-4" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Nahrát soubor
            </button>
          </div>
        )}
      </div>

      {/* Upload error */}
      {uploadMutation.isError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {uploadMutation.error?.message || "Nahrání se nezdařilo"}
        </div>
      )}

      {/* Nothing selected */}
      {!selectedCourseId && (
        <div className="text-center py-16 text-gray-500">
          Vyberte kurz pro zobrazení souborů
        </div>
      )}

      {/* Course selected */}
      {selectedCourseId && (
        <>
          {assetsLoading ? (
            <LoadingPage />
          ) : (
            <>
              {/* Asset Scanner */}
              {selectedCourse && (
                <AssetScanner
                  key={selectedCourseId}
                  courseId={selectedCourseId}
                  courseNumericId={selectedCourse.id}
                  existingAssets={assets}
                />
              )}

              {/* Stats bar */}
              {meta && (
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <span>
                    Celkem souborů: <strong>{meta.total}</strong>
                  </span>
                  <span>
                    Celková velikost:{" "}
                    <strong>{formatBytes(meta.total_size)}</strong>
                  </span>
                </div>
              )}

              {/* Search */}
              {assets.length > 0 && (
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Hledat podle názvu…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              )}

              {/* File grid */}
              {filtered.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map((asset) => (
                    <FileCard
                      key={asset.id}
                      asset={asset}
                      onDelete={handleDelete}
                      isDeleting={deletingId === asset.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  {search
                    ? "Žádné soubory neodpovídají hledání"
                    : "Zatím žádné soubory — nahrajte první"}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
