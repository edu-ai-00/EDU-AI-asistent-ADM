"use client";

import { useState } from "react";
import { Plus, Trash2, Image, GripVertical, Lock, FileText, BookOpen, Boxes, ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CourseV2, LessonV2, BlockV2, HeaderImage } from "@/types/block-v2";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  createLessonV2,
  createBlockV2,
} from "@/lib/defaults";
import { cn } from "@/lib/utils";

interface CourseV2EditorProps {
  course: CourseV2;
  onChange: (course: CourseV2) => void;
}

export function CourseV2Editor({ course, onChange }: CourseV2EditorProps) {
  const [draggedLessonIndex, setDraggedLessonIndex] = useState<number | null>(null);

  const handleFieldChange = (
    field: keyof CourseV2,
    value: string | number | boolean
  ) => {
    onChange({ ...course, [field]: value });
  };

  // Drag & Drop handlers for lessons
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedLessonIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedLessonIndex === null || draggedLessonIndex === dropIndex) {
      setDraggedLessonIndex(null);
      return;
    }

    const newLessons = [...course.lessons];
    const [draggedLesson] = newLessons.splice(draggedLessonIndex, 1);
    newLessons.splice(dropIndex, 0, draggedLesson);

    // Update order property for each lesson
    const reorderedLessons = newLessons.map((lesson, idx) => ({
      ...lesson,
      order: idx + 1,
    }));

    onChange({ ...course, lessons: reorderedLessons });
    setDraggedLessonIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedLessonIndex(null);
  };

  const handleHeaderImageChange = (updates: Partial<HeaderImage> | undefined) => {
    if (!updates || !updates.url) {
      onChange({ ...course, header_image: undefined });
    } else {
      onChange({ ...course, header_image: { ...course.header_image, ...updates } as HeaderImage });
    }
  };

  const addLesson = () => {
    const newLesson = createLessonV2(course.lessons.length + 1);
    onChange({
      ...course,
      lessons: [...course.lessons, newLesson],
    });
  };

  const removeLesson = (lessonId: string) => {
    if (!confirm("Remove this lesson?")) return;
    onChange({
      ...course,
      lessons: course.lessons.filter((l) => l.lesson_id !== lessonId),
    });
  };

  const addBlock = () => {
    const newBlock = createBlockV2();
    onChange({
      ...course,
      blocks: [...(course.blocks || []), newBlock],
    });
  };

  const removeBlock = (blockId: string) => {
    if (!confirm("Remove this block? It will be removed from all lessons."))
      return;
    // Remove from blocks array
    const newBlocks = (course.blocks || []).filter(
      (b) => b.block_id !== blockId
    );
    // Remove references from lessons
    const newLessons = course.lessons.map((lesson) => ({
      ...lesson,
      blocks: lesson.blocks.filter((b) => b.block_id !== blockId),
    }));
    onChange({
      ...course,
      blocks: newBlocks,
      lessons: newLessons,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Course V2</h2>
        <p className="text-sm text-gray-500">GPF-aligned course with FSRS support</p>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex-1 justify-start">
          <TabsTrigger value="info" className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Info
          </TabsTrigger>
          <TabsTrigger value="lessons" className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> Lessons ({course.lessons.length})
          </TabsTrigger>
          <TabsTrigger value="blocks" className="flex items-center gap-1.5">
            <Boxes className="w-4 h-4" /> Blocks ({(course.blocks || []).length})
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Name
              </label>
              <input
                type="text"
                value={course.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={course.description}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Header Image */}
            <div className="col-span-2">
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Image className="w-4 h-4 text-purple-500" />
                Header Image (Course Cover)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={course.header_image?.url || ""}
                  onChange={(e) => handleHeaderImageChange({ url: e.target.value })}
                  placeholder="https://example.com/course-cover.png"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  value={course.header_image?.alt || ""}
                  onChange={(e) => handleHeaderImageChange({ url: course.header_image?.url || "", alt: e.target.value })}
                  placeholder="Alt text"
                  className="w-40 px-3 py-2 border border-gray-300 rounded-md"
                />
                {course.header_image?.url && (
                  <button
                    onClick={() => handleHeaderImageChange(undefined)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Image Preview */}
              {course.header_image?.url && (
                <div className="mt-2">
                  <img
                    src={course.header_image.url}
                    alt={course.header_image.alt || "Course cover preview"}
                    className="max-h-24 rounded border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* AI Context */}
            <div className="col-span-2">
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 text-blue-500" />
                AI context
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Didaktická doporučení a řešení obvyklých chyb — kontext pro AI tutora.
              </p>
              <textarea
                value={course.ai_context || ""}
                onChange={(e) => handleFieldChange("ai_context", e.target.value)}
                rows={6}
                placeholder="Didaktická doporučení, časté chyby studentů a jak je řešit…"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course ID
              </label>
              <input
                type="text"
                value={course.course_id}
                onChange={(e) => handleFieldChange("course_id", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <input
                type="number"
                value={course.version}
                onChange={(e) =>
                  handleFieldChange("version", parseInt(e.target.value) || 1)
                }
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <input
                type="text"
                value={course.language}
                onChange={(e) => handleFieldChange("language", e.target.value)}
                placeholder="cs, en, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author
              </label>
              <input
                type="text"
                value={course.author}
                onChange={(e) => handleFieldChange("author", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={course.status}
                onChange={(e) =>
                  handleFieldChange("status", e.target.value as CourseV2["status"])
                }
                className={cn(
                  "w-full px-3 py-2 border border-gray-300 rounded-md",
                  STATUS_COLORS[course.status]
                )}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                <Lock className="w-4 h-4 text-amber-500" />
                Access PIN (6 alphanumeric chars)
              </label>
              <input
                type="text"
                value={course.pin || ""}
                onChange={(e) => {
                  const value = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6);
                  onChange({ ...course, pin: value || undefined });
                }}
                placeholder="A1B2C3"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-lg tracking-widest uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">
                Students enter this PIN to access the course (6 letters/digits)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Updated
              </label>
              <input
                type="text"
                value={course.updated}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm"
              />
            </div>

            {/* Starts with Quiz toggle */}
            <div className="col-span-2 flex items-center gap-3 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={course.starts_with_quiz || false}
                  onChange={(e) => handleFieldChange("starts_with_quiz", e.target.checked)}
                  disabled={course.only_quiz || false}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
              </label>
              <div>
                <span className="text-sm font-medium text-gray-700">Starts with Quiz</span>
                <p className="text-xs text-gray-500">Course begins with a diagnostic quiz before content</p>
              </div>
            </div>

            {/* Only Once toggle */}
            <div className="col-span-2 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={course.only_once || false}
                  onChange={(e) => handleFieldChange("only_once", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
              </label>
              <div>
                <span className="text-sm font-medium text-gray-700">Only Once</span>
                <p className="text-xs text-gray-500">Student cannot return to the course after completion</p>
              </div>
            </div>

            {/* Logged Only toggle */}
            <div className="col-span-2 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={course.logged_only || false}
                  onChange={(e) => handleFieldChange("logged_only", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
              </label>
              <div>
                <span className="text-sm font-medium text-gray-700">Only for Logged Users</span>
                <p className="text-xs text-gray-500">Only authenticated users can access this course</p>
              </div>
            </div>

            {/* Quiz Evaluate toggle */}
            <div className="col-span-2 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={course.quiz_evaluate || false}
                  onChange={(e) => handleFieldChange("quiz_evaluate", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
              </label>
              <div>
                <span className="text-sm font-medium text-gray-700">Quiz Evaluate</span>
                <p className="text-xs text-gray-500">Show correct/incorrect feedback and score in quiz mode</p>
              </div>
            </div>

            {/* Only Quiz Toggle */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={course.only_quiz || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onChange({
                      ...course,
                      only_quiz: checked,
                      ...(checked ? { starts_with_quiz: true } : {}),
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
              </label>
              <div>
                <span className="text-sm font-medium text-gray-700">Only Quiz</span>
                <p className="text-xs text-gray-500">Course runs only as a quiz — no lessons</p>
              </div>
            </div>

            {/* XP Cap */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                XP Cap (strop)
              </label>
              <input
                type="number"
                value={course.max_xp ?? ""}
                onChange={(e) =>
                  onChange({ ...course, max_xp: e.target.value ? parseInt(e.target.value) : undefined })
                }
                min={0}
                placeholder="No limit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum XP earnable from this course. Leave empty for no limit.</p>
            </div>

            {/* Stop Gambling toggle */}
            <div className="col-span-2 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={course.stop_gambling || false}
                  onChange={(e) => handleFieldChange("stop_gambling", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
              </label>
              <div>
                <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  Stop Gambling
                </span>
                <p className="text-xs text-gray-500">Zastavit rychlé, náhodné proklikávání odpovědí</p>
              </div>
            </div>

            {/* Stop Notice — shown only when Stop Gambling is enabled */}
            {course.stop_gambling && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stop Notice
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  Vzkaz zobrazený studentům při identifikaci gamblingu. Ponecháte-li prázdné, použije se systémový.
                </p>
                <textarea
                  value={course.stop_notice || ""}
                  onChange={(e) => handleFieldChange("stop_notice", e.target.value)}
                  rows={3}
                  placeholder="Zpomal a odpovídej s rozmyslem…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-6">
          {/* Statistics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Statistics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {course.lessons.length}
                </div>
                <div className="text-xs text-gray-500">Lessons</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {(course.blocks || []).length}
                </div>
                <div className="text-xs text-gray-500">Blocks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {course.lessons.reduce((acc, l) => acc + l.blocks.length, 0)}
                </div>
                <div className="text-xs text-gray-500">Block References</div>
              </div>
            </div>
          </div>

          {/* Lessons Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Lessons</h3>
              <button
                onClick={addLesson}
                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
              >
                <Plus className="w-4 h-4" />
                Add Lesson
              </button>
            </div>
            <div className="space-y-2">
              {course.lessons.map((lesson, index) => (
                <div
                  key={lesson.lesson_id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center justify-between p-3 bg-gray-50 rounded-md cursor-grab active:cursor-grabbing transition-all",
                    draggedLessonIndex === index && "opacity-50 bg-green-100",
                    draggedLessonIndex !== null && draggedLessonIndex !== index && "border-2 border-dashed border-green-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="font-medium">
                        {index + 1}. {lesson.name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({lesson.blocks.length} blocks)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeLesson(lesson.lesson_id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {course.lessons.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">
                  No lessons yet. Click &quot;Add Lesson&quot; to create one.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Blocks Tab */}
        <TabsContent value="blocks">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Blocks</h3>
              <button
                onClick={addBlock}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Block
              </button>
            </div>
            <div className="space-y-2">
              {(course.blocks || []).map((block, index) => (
                <div
                  key={block.block_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div>
                    <span className="font-medium">
                      {block.block_id}
                    </span>
                    <span
                      className={cn(
                        "text-xs ml-2 px-1.5 py-0.5 rounded",
                        STATUS_COLORS[block.status]
                      )}
                    >
                      {block.status}
                    </span>
                    <span className={cn(
                      "text-xs ml-2 px-1.5 py-0.5 rounded",
                      block.type === "display" && "bg-cyan-100 text-cyan-700",
                      block.type === "question" && "bg-orange-100 text-orange-700",
                      block.type === "exercise" && "bg-amber-100 text-amber-700"
                    )}>
                      {block.type}
                    </span>
                  </div>
                  <button
                    onClick={() => removeBlock(block.block_id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(course.blocks || []).length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">
                  No blocks yet. Click &quot;Add Block&quot; to create one.
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
