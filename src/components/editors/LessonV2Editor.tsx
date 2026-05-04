"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Image, FileDown, Upload, FileText, Boxes } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LessonV2, CourseV2, LessonBlockBinding, BlockV2, HeaderImage } from "@/types/block-v2";
import { cn } from "@/lib/utils";
import { STATUS_COLORS, createBlockV2, normalizeImportedBlock } from "@/lib/defaults";

interface LessonV2EditorProps {
  lesson: LessonV2;
  course: CourseV2;
  onChange: (lesson: LessonV2) => void;
  onCourseChange?: (course: CourseV2) => void;
}

export function LessonV2Editor({
  lesson,
  course,
  onChange,
  onCourseChange,
}: LessonV2EditorProps) {
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        setImportJson(text);
        setImportError("");
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleFieldChange = (
    field: keyof LessonV2,
    value: string | number
  ) => {
    onChange({ ...lesson, [field]: value });
  };

  const handleHeaderImageChange = (updates: Partial<HeaderImage> | undefined) => {
    if (!updates || !updates.url) {
      onChange({ ...lesson, header_image: undefined });
    } else {
      onChange({ ...lesson, header_image: { ...lesson.header_image, ...updates } as HeaderImage });
    }
  };

  // Get available blocks (those in course.blocks)
  const availableBlocks = course.blocks || [];
  const assignedBlockIds = new Set(lesson.blocks.map((b) => b.block_id));
  const unassignedBlocks = availableBlocks.filter(
    (b) => !assignedBlockIds.has(b.block_id)
  );

  const addBlockBinding = (blockId: string) => {
    const newBinding: LessonBlockBinding = {
      block_id: blockId,
      order: lesson.blocks.length + 1,
    };
    onChange({
      ...lesson,
      blocks: [...lesson.blocks, newBinding],
    });
  };

  const removeBlockBinding = (blockId: string) => {
    onChange({
      ...lesson,
      blocks: lesson.blocks.filter((b) => b.block_id !== blockId),
    });
  };

  const updateBlockBinding = (
    blockId: string,
    updates: Partial<LessonBlockBinding>
  ) => {
    onChange({
      ...lesson,
      blocks: lesson.blocks.map((b) =>
        b.block_id === blockId ? { ...b, ...updates } : b
      ),
    });
  };

  const moveBlock = (blockId: string, direction: "up" | "down") => {
    const currentIndex = lesson.blocks.findIndex((b) => b.block_id === blockId);
    if (currentIndex === -1) return;

    const newIndex =
      direction === "up"
        ? Math.max(0, currentIndex - 1)
        : Math.min(lesson.blocks.length - 1, currentIndex + 1);

    if (currentIndex === newIndex) return;

    const newBlocks = [...lesson.blocks];
    const [removed] = newBlocks.splice(currentIndex, 1);
    newBlocks.splice(newIndex, 0, removed);

    // Update order values
    const reorderedBlocks = newBlocks.map((b, i) => ({ ...b, order: i + 1 }));

    onChange({ ...lesson, blocks: reorderedBlocks });
  };

  const addNewBlock = () => {
    if (!onCourseChange) return;
    const newBlock = createBlockV2();
    // Add block to course and assign to this lesson
    const newBinding: LessonBlockBinding = {
      block_id: newBlock.block_id,
      order: lesson.blocks.length + 1,
    };
    const updatedLesson = { ...lesson, blocks: [...lesson.blocks, newBinding] };
    const updatedCourse = {
      ...course,
      blocks: [...(course.blocks || []), newBlock],
      lessons: course.lessons.map((l) =>
        l.lesson_id === lesson.lesson_id ? updatedLesson : l
      ),
    };
    onCourseChange(updatedCourse);
  };

  const handleImportBlock = () => {
    setImportError("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(importJson);
    } catch {
      setImportError("Invalid JSON — check syntax and try again.");
      return;
    }

    const block = normalizeImportedBlock(parsed);

    // Check for duplicate block_id
    if ((course.blocks || []).some((b) => b.block_id === block.block_id)) {
      setImportError(`Duplicate block_id "${block.block_id}" — this block already exists in the course.`);
      return;
    }

    const newBinding: LessonBlockBinding = {
      block_id: block.block_id,
      order: lesson.blocks.length + 1,
    };
    const updatedLesson = { ...lesson, blocks: [...lesson.blocks, newBinding] };
    const updatedCourse = {
      ...course,
      blocks: [...(course.blocks || []), block],
      lessons: course.lessons.map((l) =>
        l.lesson_id === lesson.lesson_id ? updatedLesson : l
      ),
    };
    onCourseChange!(updatedCourse);
    setImportJson("");
    setShowImport(false);
  };

  // Helper to get block details
  const getBlockDetails = (blockId: string): BlockV2 | undefined => {
    return availableBlocks.find((b) => b.block_id === blockId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Lesson V2</h2>
        <p className="text-sm text-gray-500">
          Configure lesson and assign blocks
        </p>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex-1 justify-start">
          <TabsTrigger value="info" className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Info
          </TabsTrigger>
          <TabsTrigger value="blocks" className="flex items-center gap-1.5">
            <Boxes className="w-4 h-4" /> Blocks ({lesson.blocks.length})
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lesson Name
              </label>
              <input
                type="text"
                value={lesson.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={lesson.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Header Image */}
            <div className="col-span-2">
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Image className="w-4 h-4 text-purple-500" />
                Header Image (Lesson Cover)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lesson.header_image?.url || ""}
                  onChange={(e) => handleHeaderImageChange({ url: e.target.value })}
                  placeholder="https://example.com/lesson-cover.png"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  value={lesson.header_image?.alt || ""}
                  onChange={(e) => handleHeaderImageChange({ url: lesson.header_image?.url || "", alt: e.target.value })}
                  placeholder="Alt text"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                />
                {lesson.header_image?.url && (
                  <button
                    onClick={() => handleHeaderImageChange(undefined)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Image Preview */}
              {lesson.header_image?.url && (
                <div className="mt-2">
                  <img
                    src={lesson.header_image.url}
                    alt={lesson.header_image.alt || "Lesson cover preview"}
                    className="max-h-20 rounded border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lesson ID
              </label>
              <input
                type="text"
                value={lesson.lesson_id}
                onChange={(e) => handleFieldChange("lesson_id", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <input
                type="number"
                value={lesson.order}
                onChange={(e) =>
                  handleFieldChange("order", parseInt(e.target.value) || 1)
                }
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <input
                type="number"
                value={lesson.version}
                onChange={(e) =>
                  handleFieldChange("version", parseInt(e.target.value) || 1)
                }
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </TabsContent>

        {/* Blocks Tab */}
        <TabsContent value="blocks">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Assigned Blocks ({lesson.blocks.length})
              </h3>
              {onCourseChange && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={addNewBlock}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Block
                  </button>
                  <button
                    onClick={() => { setShowImport(!showImport); setImportError(""); }}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Import Block
                  </button>
                </div>
              )}
            </div>

            {/* Import Block Inline Form */}
            {showImport && onCourseChange && (
              <div className="mb-4 p-3 border border-blue-200 bg-blue-50 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Paste Block JSON or upload file
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs px-2 py-1 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload .json
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  rows={8}
                  placeholder='{"block_id": "ABC123", "type": "display", "steps": [...], "gpf": {...}}'
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {importError && (
                  <p className="text-sm text-red-600">{importError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleImportBlock}
                    disabled={!importJson.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Import
                  </button>
                  <button
                    onClick={() => { setShowImport(false); setImportJson(""); setImportError(""); }}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Assigned Blocks List */}
            <div className="space-y-2 mb-4">
              {lesson.blocks.map((binding, index) => {
                const block = getBlockDetails(binding.block_id);
                return (
                  <div
                    key={binding.block_id}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-200"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveBlock(binding.block_id, "up")}
                        disabled={index === 0}
                        className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveBlock(binding.block_id, "down")}
                        disabled={index === lesson.blocks.length - 1}
                        className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                          {binding.order}
                        </span>
                        <span className="font-medium text-sm truncate">
                          {binding.block_id}
                        </span>
                        {block && (
                          <>
                            <span
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded",
                                block.type === "display" && "bg-cyan-100 text-cyan-700",
                                block.type === "question" && "bg-orange-100 text-orange-700",
                                block.type === "exercise" && "bg-amber-100 text-amber-700"
                              )}
                            >
                              {block.type}
                            </span>
                            <span
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded",
                                STATUS_COLORS[block.status]
                              )}
                            >
                              {block.status}
                            </span>
                            {block.default_practice && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                Practice
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={binding.bg_color || ""}
                        onChange={(e) =>
                          updateBlockBinding(binding.block_id, {
                            bg_color: e.target.value || undefined,
                          })
                        }
                        placeholder="#color"
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                      />

                      <button
                        onClick={() => removeBlockBinding(binding.block_id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {lesson.blocks.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 mb-3">
                    No blocks assigned to this lesson yet.
                  </p>
                  {onCourseChange && (
                    <button
                      onClick={addNewBlock}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Block
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Add Block Dropdown */}
            {unassignedBlocks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add Block to Lesson
                </label>
                <div className="flex gap-2">
                  <select
                    id="add-block-select"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a block to add...
                    </option>
                    {unassignedBlocks.map((block) => (
                      <option key={block.block_id} value={block.block_id}>
                        {block.block_id} ({block.type}, {block.status})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const select = document.getElementById(
                        "add-block-select"
                      ) as HTMLSelectElement;
                      if (select.value) {
                        addBlockBinding(select.value);
                        select.value = "";
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            )}

            {unassignedBlocks.length === 0 && availableBlocks.length > 0 && (
              <p className="text-sm text-gray-500 text-center">
                All blocks are already assigned to this lesson.
              </p>
            )}

            {availableBlocks.length === 0 && !onCourseChange && (
              <p className="text-sm text-orange-500 text-center">
                No blocks in course. Add blocks at the course level first.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
