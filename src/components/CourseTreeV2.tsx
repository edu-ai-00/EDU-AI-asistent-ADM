"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  Layers,
  Box,
  Brain,
  MessageSquare,
  Dumbbell,
  GripVertical,
  Plus,
  MoreVertical,
  Copy,
  Trash2,
  Download,
  Check,
  X,
} from "lucide-react";
import { cn, truncateText, stripHtml } from "@/lib/utils";
import type { CourseV2, LessonV2, BlockV2, LessonBlockBinding } from "@/types/block-v2";
import { STATUS_COLORS, STATUS_LABELS, createBlockV2, createLessonV2, duplicateBlockV2 } from "@/lib/defaults";
import type { BlockStatus } from "@/types/block-v2";

type SelectionTypeV2 = "course_v2" | "lesson_v2" | "block_v2";

interface DragState {
  blockId: string;
  fromLessonId: string | null; // null if from orphan blocks
  fromIndex: number;
}

interface CourseTreeV2Props {
  course: CourseV2;
  selectedId: string | null;
  onSelect: (
    type: SelectionTypeV2,
    id: string,
    data: unknown,
    lessonId?: string
  ) => void;
  onCourseChange?: (course: CourseV2) => void;
}

export function CourseTreeV2({
  course,
  selectedId,
  onSelect,
  onCourseChange,
}: CourseTreeV2Props) {
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(
    new Set(course.lessons.map((l) => l.lesson_id))
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ lessonId: string | null; index: number } | null>(null);
  const [openMenuBlockId, setOpenMenuBlockId] = useState<string | null>(null);
  const [exportBlock, setExportBlock] = useState<BlockV2 | null>(null);

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  // Create a map of block_id to BlockV2 for quick lookup
  const blocksMap = new Map<string, BlockV2>();
  (course.blocks || []).forEach((block) => {
    blocksMap.set(block.block_id, block);
  });

  // Handle block drag & drop
  const handleBlockDragStart = (
    e: React.DragEvent,
    blockId: string,
    fromLessonId: string | null,
    fromIndex: number
  ) => {
    setDragState({ blockId, fromLessonId, fromIndex });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", blockId);
  };

  const handleBlockDragOver = (e: React.DragEvent, lessonId: string | null, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ lessonId, index });
  };

  const handleBlockDragLeave = () => {
    setDropTarget(null);
  };

  const handleBlockDrop = (e: React.DragEvent, toLessonId: string, toIndex: number) => {
    e.preventDefault();
    if (!dragState || !onCourseChange) {
      setDragState(null);
      setDropTarget(null);
      return;
    }

    const { blockId, fromLessonId, fromIndex } = dragState;

    // Same lesson, same position - no change
    if (fromLessonId === toLessonId && fromIndex === toIndex) {
      setDragState(null);
      setDropTarget(null);
      return;
    }

    let newLessons = [...course.lessons];

    // Remove from source lesson
    if (fromLessonId) {
      newLessons = newLessons.map((lesson) => {
        if (lesson.lesson_id === fromLessonId) {
          return {
            ...lesson,
            blocks: lesson.blocks.filter((b) => b.block_id !== blockId),
          };
        }
        return lesson;
      });
    }

    // Add to target lesson
    newLessons = newLessons.map((lesson) => {
      if (lesson.lesson_id === toLessonId) {
        const newBlocks = [...lesson.blocks];
        const binding: LessonBlockBinding = {
          block_id: blockId,
          order: toIndex + 1,
        };

        // Adjust index if moving within same lesson and removing from earlier position
        const adjustedIndex = fromLessonId === toLessonId && fromIndex < toIndex
          ? toIndex
          : toIndex;

        newBlocks.splice(adjustedIndex, 0, binding);

        // Reorder all blocks
        const reorderedBlocks = newBlocks.map((b, idx) => ({ ...b, order: idx + 1 }));

        return { ...lesson, blocks: reorderedBlocks };
      }
      return lesson;
    });

    onCourseChange({ ...course, lessons: newLessons });
    setDragState(null);
    setDropTarget(null);
  };

  const handleDropToOrphan = (e: React.DragEvent, toOrphanIndex?: number) => {
    e.preventDefault();
    if (!dragState || !onCourseChange) {
      setDragState(null);
      setDropTarget(null);
      return;
    }

    const { blockId, fromLessonId } = dragState;

    let newLessons = [...course.lessons];

    // Remove binding from source lesson (if coming from a lesson)
    if (fromLessonId) {
      newLessons = newLessons.map((lesson) => {
        if (lesson.lesson_id === fromLessonId) {
          return {
            ...lesson,
            blocks: lesson.blocks
              .filter((b) => b.block_id !== blockId)
              .map((b, idx) => ({ ...b, order: idx + 1 })),
          };
        }
        return lesson;
      });
    }

    // Reorder within course.blocks if a target index was specified
    let newBlocks = [...(course.blocks || [])];
    if (toOrphanIndex !== undefined) {
      // Compute which blocks are orphans (not referenced in any lesson after removal)
      const referencedIds = new Set<string>();
      newLessons.forEach((l) => l.blocks.forEach((b) => referencedIds.add(b.block_id)));
      const orphanIds = newBlocks.filter((b) => !referencedIds.has(b.block_id)).map((b) => b.block_id);

      // Remove dragged block from orphan order
      const filteredOrphans = orphanIds.filter((id) => id !== blockId);

      // Insert at target position
      filteredOrphans.splice(toOrphanIndex, 0, blockId);

      // Rebuild course.blocks: non-orphans keep their positions, orphans follow new order
      const nonOrphanBlocks = newBlocks.filter((b) => referencedIds.has(b.block_id));
      const orphanBlockMap = new Map(newBlocks.map((b) => [b.block_id, b]));
      const reorderedOrphans = filteredOrphans.map((id) => orphanBlockMap.get(id)!).filter(Boolean);
      newBlocks = [...nonOrphanBlocks, ...reorderedOrphans];
    }

    onCourseChange({ ...course, blocks: newBlocks, lessons: newLessons });
    setDragState(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDropTarget(null);
  };

  return (
    <>
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Course Header */}
      <div
        className={cn(
          "px-3 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-50",
          selectedId === "course_v2" && "bg-green-50"
        )}
        onClick={() => onSelect("course_v2", "course_v2", course)}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-semibold text-sm truncate">{course.name}</span>
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded ml-auto flex-shrink-0",
              STATUS_COLORS[course.status]
            )}
          >
            {course.status}
          </span>
        </div>
      </div>

      {/* Lessons */}
      <div className="divide-y divide-gray-100">
        {course.lessons.map((lesson, lessonIndex) => (
          <LessonV2Item
            key={lesson.lesson_id}
            lesson={lesson}
            index={lessonIndex}
            isExpanded={expandedLessons.has(lesson.lesson_id)}
            onToggle={() => toggleLesson(lesson.lesson_id)}
            selectedId={selectedId}
            onSelect={onSelect}
            blocksMap={blocksMap}
            course={course}
            onCourseChange={onCourseChange}
            onExportBlock={setExportBlock}
            openMenuBlockId={openMenuBlockId}
            onMenuToggle={setOpenMenuBlockId}
            dragState={dragState}
            dropTarget={dropTarget}
            onBlockDragStart={handleBlockDragStart}
            onBlockDragOver={handleBlockDragOver}
            onBlockDragLeave={handleBlockDragLeave}
            onBlockDrop={handleBlockDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* Orphan Blocks (blocks not in any lesson) */}
      <OrphanBlocksSection
        course={course}
        blocks={course.blocks || []}
        lessons={course.lessons}
        selectedId={selectedId}
        onSelect={onSelect}
        onCourseChange={onCourseChange}
        onExportBlock={setExportBlock}
        openMenuBlockId={openMenuBlockId}
        onMenuToggle={setOpenMenuBlockId}
        dragState={dragState}
        dropTarget={dropTarget}
        onBlockDragStart={handleBlockDragStart}
        onBlockDragOver={handleBlockDragOver}
        onBlockDragLeave={handleBlockDragLeave}
        onDropToOrphan={handleDropToOrphan}
        onDragEnd={handleDragEnd}
      />

      {/* Add Lesson Button */}
      {onCourseChange && (
        <button
          onClick={() => {
            const newLesson = createLessonV2(course.lessons.length + 1);
            onCourseChange({
              ...course,
              lessons: [...course.lessons, newLesson],
            });
            setExpandedLessons((prev) => { const next = new Set(prev); next.add(newLesson.lesson_id); return next; });
          }}
          className="w-full py-1.5 text-xs font-medium text-gray-400 hover:text-green-700 hover:bg-green-50 flex items-center justify-center gap-1.5 border-t border-dashed border-gray-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Přidat lekci
        </button>
      )}
    </div>

    {exportBlock && (
      <ExportBlockModal
        block={exportBlock}
        onClose={() => setExportBlock(null)}
      />
    )}
    </>
  );
}

// ============================================================================
// Lesson Item
// ============================================================================

interface LessonV2ItemProps {
  lesson: LessonV2;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  selectedId: string | null;
  onSelect: (
    type: SelectionTypeV2,
    id: string,
    data: unknown,
    lessonId?: string
  ) => void;
  blocksMap: Map<string, BlockV2>;
  course: CourseV2;
  onCourseChange?: (course: CourseV2) => void;
  onExportBlock: (block: BlockV2) => void;
  openMenuBlockId: string | null;
  onMenuToggle: (blockId: string | null) => void;
  dragState: DragState | null;
  dropTarget: { lessonId: string | null; index: number } | null;
  onBlockDragStart: (e: React.DragEvent, blockId: string, fromLessonId: string | null, fromIndex: number) => void;
  onBlockDragOver: (e: React.DragEvent, lessonId: string | null, index: number) => void;
  onBlockDragLeave: () => void;
  onBlockDrop: (e: React.DragEvent, toLessonId: string, toIndex: number) => void;
  onDragEnd: () => void;
}

function LessonV2Item({
  lesson,
  index,
  isExpanded,
  onToggle,
  selectedId,
  onSelect,
  blocksMap,
  course,
  onCourseChange,
  onExportBlock,
  openMenuBlockId,
  onMenuToggle,
  dragState,
  dropTarget,
  onBlockDragStart,
  onBlockDragOver,
  onBlockDragLeave,
  onBlockDrop,
  onDragEnd,
}: LessonV2ItemProps) {
  const isDropTarget = dragState && dropTarget?.lessonId === lesson.lesson_id;

  const handleAddBlockToLesson = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCourseChange) return;
    const newBlock = createBlockV2();
    const newBinding = { block_id: newBlock.block_id, order: lesson.blocks.length + 1 };
    const updatedLesson = { ...lesson, blocks: [...lesson.blocks, newBinding] };
    onCourseChange({
      ...course,
      blocks: [...(course.blocks || []), newBlock],
      lessons: course.lessons.map((l) =>
        l.lesson_id === lesson.lesson_id ? updatedLesson : l
      ),
    });
  };

  return (
    <div>
      <div
        className={cn(
          "px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center gap-2 group",
          selectedId === lesson.lesson_id && "bg-green-50"
        )}
        onClick={() => onSelect("lesson_v2", lesson.lesson_id, lesson)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <Layers className="w-4 h-4 text-green-600 flex-shrink-0" />
        <span className="font-medium text-sm truncate">
          {index + 1}. {lesson.name}
        </span>
        {onCourseChange && (
          <button
            onClick={handleAddBlockToLesson}
            className="p-0.5 hover:bg-green-100 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-auto"
            title="Přidat blok do lekce"
          >
            <Plus className="w-3.5 h-3.5 text-green-600" />
          </button>
        )}
        <span className="text-xs text-gray-400 flex-shrink-0">
          {lesson.blocks.length}
        </span>
      </div>

      {isExpanded && (
        <div
          className={cn(
            "bg-gray-50/50",
            isDropTarget && "bg-green-50"
          )}
          onDragOver={(e) => {
            if (dragState && lesson.blocks.length === 0) {
              onBlockDragOver(e, lesson.lesson_id, 0);
            }
          }}
          onDragLeave={onBlockDragLeave}
          onDrop={(e) => {
            if (dragState && lesson.blocks.length === 0) {
              onBlockDrop(e, lesson.lesson_id, 0);
            }
          }}
        >
          {lesson.blocks.map((binding, blockIndex) => {
            const block = blocksMap.get(binding.block_id);
            if (!block) {
              return (
                <div
                  key={binding.block_id}
                  className="py-2 px-3 pl-10 text-sm text-red-500"
                >
                  Missing block: {binding.block_id}
                </div>
              );
            }
            return (
              <BlockV2Item
                key={binding.block_id}
                block={block}
                binding={binding}
                index={blockIndex}
                selectedId={selectedId}
                onSelect={onSelect}
                lessonId={lesson.lesson_id}
                course={course}
                onCourseChange={onCourseChange}
                onExportBlock={onExportBlock}
                openMenuBlockId={openMenuBlockId}
                onMenuToggle={onMenuToggle}
                dragState={dragState}
                dropTarget={dropTarget}
                onBlockDragStart={onBlockDragStart}
                onBlockDragOver={onBlockDragOver}
                onBlockDragLeave={onBlockDragLeave}
                onBlockDrop={onBlockDrop}
                onDragEnd={onDragEnd}
              />
            );
          })}
          {lesson.blocks.length === 0 && (
            <div className={cn(
              "py-3 px-3 pl-10 text-sm text-gray-400 italic",
              isDropTarget && "border-2 border-dashed border-green-400 rounded m-1"
            )}>
              {dragState ? "Drop block here" : "No blocks"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Block Item
// ============================================================================

interface BlockV2ItemProps {
  block: BlockV2;
  binding?: LessonBlockBinding;
  index: number;
  selectedId: string | null;
  onSelect: (
    type: SelectionTypeV2,
    id: string,
    data: unknown,
    lessonId?: string
  ) => void;
  lessonId?: string;
  course?: CourseV2;
  onCourseChange?: (course: CourseV2) => void;
  onExportBlock?: (block: BlockV2) => void;
  openMenuBlockId?: string | null;
  onMenuToggle?: (blockId: string | null) => void;
  dragState?: DragState | null;
  dropTarget?: { lessonId: string | null; index: number } | null;
  onBlockDragStart?: (e: React.DragEvent, blockId: string, fromLessonId: string | null, fromIndex: number) => void;
  onBlockDragOver?: (e: React.DragEvent, lessonId: string | null, index: number) => void;
  onBlockDragLeave?: () => void;
  onBlockDrop?: (e: React.DragEvent, toLessonId: string, toIndex: number) => void;
  onDragEnd?: () => void;
}

function BlockV2Item({
  block,
  index,
  selectedId,
  onSelect,
  lessonId,
  course,
  onCourseChange,
  onExportBlock,
  openMenuBlockId,
  onMenuToggle,
  dragState,
  dropTarget,
  onBlockDragStart,
  onBlockDragOver,
  onBlockDragLeave,
  onBlockDrop,
  onDragEnd,
}: BlockV2ItemProps) {
  const getBlockIcon = () => {
    const iconClass = "w-4 h-4 flex-shrink-0";
    switch (block.type) {
      case "display":
        return <Brain className={cn(iconClass, "text-blue-500")} />;
      case "question":
        return <MessageSquare className={cn(iconClass, "text-purple-500")} />;
      case "exercise":
        return <Dumbbell className={cn(iconClass, "text-amber-500")} />;
      default:
        return <Box className={cn(iconClass, "text-gray-500")} />;
    }
  };

  const getBlockLabel = () => {
    // Try steps-based label first
    if (block.steps && block.steps.length > 0) {
      const textStep = block.steps.find(s => s.type === "text" && s.content && s.content.trim() !== "");
      if (textStep?.content) {
        return truncateText(stripHtml(textStep.content), 40);
      }
      const questionStep = block.steps.find(s => s.type === "question" && s.question);
      if (questionStep?.question) {
        const typeLabel = questionStep.question.type === "multiple_choice" ? "MCQ" :
                          questionStep.question.type === "true_false" ? "T/F" : "Open";
        return `${typeLabel} Question`;
      }
    }

    // Fall back to flat fields
    if (block.content) {
      const cleanText = stripHtml(block.content);
      return truncateText(cleanText, 40);
    }
    if (block.question) {
      const typeLabel = block.question.type === "multiple_choice" ? "MCQ" :
                        block.question.type === "true_false" ? "T/F" : "Open";
      return `${typeLabel} Question`;
    }

    return block.block_id || `Block ${index + 1}`;
  };

  const isMenuOpen = openMenuBlockId === block.block_id;

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!course || !onCourseChange) return;
    const dup = duplicateBlockV2(block);
    const newBlocks = [...(course.blocks || []), dup];

    let newLessons = course.lessons;
    if (lessonId) {
      newLessons = course.lessons.map((l) => {
        if (l.lesson_id !== lessonId) return l;
        const idx = l.blocks.findIndex((b) => b.block_id === block.block_id);
        const newBindings = [...l.blocks];
        newBindings.splice(idx + 1, 0, { block_id: dup.block_id, order: idx + 2 });
        return { ...l, blocks: newBindings.map((b, i) => ({ ...b, order: i + 1 })) };
      });
    }

    onCourseChange({ ...course, blocks: newBlocks, lessons: newLessons });
    onMenuToggle?.(null);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!course || !onCourseChange) return;
    if (!window.confirm("Odstranit blok?")) return;
    const newBlocks = (course.blocks || []).filter((b) => b.block_id !== block.block_id);
    const newLessons = course.lessons.map((l) => ({
      ...l,
      blocks: l.blocks.filter((b) => b.block_id !== block.block_id).map((b, i) => ({ ...b, order: i + 1 })),
    }));
    onCourseChange({ ...course, blocks: newBlocks, lessons: newLessons });
    onMenuToggle?.(null);
  };

  const handleStatusChange = (e: React.MouseEvent, newStatus: BlockStatus) => {
    e.stopPropagation();
    if (!course || !onCourseChange) return;
    const newBlocks = (course.blocks || []).map((b) =>
      b.block_id === block.block_id ? { ...b, status: newStatus } : b
    );
    onCourseChange({ ...course, blocks: newBlocks });
    onMenuToggle?.(null);
  };

  const isDragging = dragState?.blockId === block.block_id;
  const isDropTargetHere = lessonId && dropTarget?.lessonId === lessonId && dropTarget?.index === index;
  const canDrag = !!onBlockDragStart && !!lessonId;

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => onBlockDragStart?.(e, block.block_id, lessonId || null, index)}
      onDragOver={(e) => lessonId && onBlockDragOver?.(e, lessonId, index)}
      onDragLeave={onBlockDragLeave}
      onDrop={(e) => lessonId && onBlockDrop?.(e, lessonId, index)}
      onDragEnd={onDragEnd}
      className={cn(
        "py-2 px-3 pl-8 cursor-pointer hover:bg-gray-100 group",
        selectedId === block.block_id && "bg-green-100",
        isDragging && "opacity-50 bg-blue-50",
        isDropTargetHere && "border-t-2 border-green-500"
      )}
      onClick={() => onSelect("block_v2", block.block_id, block, lessonId)}
    >
      {/* First line: drag handle, icon, title, menu */}
      <div className="flex items-center gap-2">
        {canDrag && (
          <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0" />
        )}
        {getBlockIcon()}
        <span className="text-gray-700 truncate text-sm flex-1">{getBlockLabel()}</span>
        {onCourseChange && (
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle?.(isMenuOpen ? null : block.block_id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Akce"
            >
              <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {isMenuOpen && (
              <BlockContextMenu
                block={block}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onExport={(e) => {
                  e.stopPropagation();
                  onExportBlock?.(block);
                  onMenuToggle?.(null);
                }}
                onStatusChange={handleStatusChange}
                onClose={() => onMenuToggle?.(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Second line: badges */}
      <div className="flex items-center gap-1.5 mt-1 ml-6">
        {block.default_practice && (
          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
            Practice
          </span>
        )}
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded",
          block.type === "display" && "bg-cyan-100 text-cyan-700",
          block.type === "question" && "bg-orange-100 text-orange-700",
          block.type === "exercise" && "bg-amber-100 text-amber-700"
        )}>
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
      </div>
    </div>
  );
}

// ============================================================================
// Export Block Modal
// ============================================================================

function ExportBlockModal({
  block,
  onClose,
}: {
  block: BlockV2;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(block, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Exportovat blok
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {block.block_id} &middot; {block.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col gap-3">
          <textarea
            readOnly
            value={json}
            className="w-full flex-1 min-h-[300px] p-3 font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            onFocus={(e) => e.target.select()}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Zavřít
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Zkopírováno!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Kopírovat JSON
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Block Context Menu
// ============================================================================

function BlockContextMenu({
  block,
  onDuplicate,
  onDelete,
  onExport,
  onStatusChange,
  onClose,
}: {
  block: BlockV2;
  onDuplicate: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onExport: (e: React.MouseEvent) => void;
  onStatusChange: (e: React.MouseEvent, status: BlockStatus) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const statuses: BlockStatus[] = ["draft", "published", "locked", "approved", "private"];

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-30 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
    >
      <button
        onClick={onDuplicate}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <Copy className="w-3.5 h-3.5" />
        Duplikovat
      </button>
      <button
        onClick={onExport}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 text-left"
      >
        <Download className="w-3.5 h-3.5" />
        Exportovat
      </button>
      <button
        onClick={onDelete}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 text-left"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Odstranit
      </button>
      <div className="border-t border-gray-100 my-1" />
      <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase">Status</div>
      {statuses.map((s) => (
        <button
          key={s}
          onClick={(e) => onStatusChange(e, s)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1 text-xs hover:bg-gray-100 text-left",
            block.status === s ? "font-bold" : "text-gray-600"
          )}
        >
          <span className={cn("w-2 h-2 rounded-full", STATUS_COLORS[s].split(" ")[0])} />
          {STATUS_LABELS[s]}
          {block.status === s && <span className="ml-auto text-green-600">✓</span>}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Orphan Blocks Section
// ============================================================================

interface OrphanBlocksSectionProps {
  course: CourseV2;
  blocks: BlockV2[];
  lessons: LessonV2[];
  selectedId: string | null;
  onSelect: (
    type: SelectionTypeV2,
    id: string,
    data: unknown,
    lessonId?: string
  ) => void;
  onCourseChange?: (course: CourseV2) => void;
  onExportBlock: (block: BlockV2) => void;
  openMenuBlockId: string | null;
  onMenuToggle: (blockId: string | null) => void;
  dragState: DragState | null;
  dropTarget: { lessonId: string | null; index: number } | null;
  onBlockDragStart: (e: React.DragEvent, blockId: string, fromLessonId: string | null, fromIndex: number) => void;
  onBlockDragOver: (e: React.DragEvent, lessonId: string | null, index: number) => void;
  onBlockDragLeave: () => void;
  onDropToOrphan: (e: React.DragEvent, toOrphanIndex?: number) => void;
  onDragEnd: () => void;
}

function OrphanBlocksSection({
  course,
  blocks,
  lessons,
  selectedId,
  onSelect,
  onCourseChange,
  onExportBlock,
  openMenuBlockId,
  onMenuToggle,
  dragState,
  dropTarget,
  onBlockDragStart,
  onBlockDragOver,
  onBlockDragLeave,
  onDropToOrphan,
  onDragEnd,
}: OrphanBlocksSectionProps) {
  // Find blocks not referenced in any lesson
  const referencedBlockIds = new Set<string>();
  lessons.forEach((lesson) => {
    lesson.blocks.forEach((binding) => {
      referencedBlockIds.add(binding.block_id);
    });
  });

  const orphanBlocks = blocks.filter(
    (block) => !referencedBlockIds.has(block.block_id)
  );

  const handleAddBlock = () => {
    if (!onCourseChange) return;
    const newBlock = createBlockV2();
    onCourseChange({
      ...course,
      blocks: [...(course.blocks || []), newBlock],
    });
  };

  const isDropTargetSection = dragState && dropTarget?.lessonId === null;

  return (
    <div
      className={cn(
        "border-t border-gray-200",
        isDropTargetSection && !orphanBlocks.length && "bg-green-50"
      )}
      onDragOver={(e) => {
        if (dragState) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          // Only set section-level drop target when there are no orphan blocks
          if (orphanBlocks.length === 0) {
            onBlockDragOver(e, null, 0);
          }
        }
      }}
      onDragLeave={onBlockDragLeave}
      onDrop={(e) => {
        if (dragState && orphanBlocks.length === 0) {
          onDropToOrphan(e, 0);
        }
      }}
    >
      <div className="px-3 py-1.5 bg-gray-100 text-xs font-medium text-gray-500 uppercase">
        Unassigned ({orphanBlocks.length})
      </div>
      <div>
        {orphanBlocks.map((block, index) => {
          // Get label based on block type — prefer steps, fall back to flat fields
          let label = block.block_id;
          if (block.steps && block.steps.length > 0) {
            const textStep = block.steps.find(s => s.type === "text" && s.content && s.content.trim() !== "");
            if (textStep?.content) {
              label = truncateText(stripHtml(textStep.content), 35);
            } else {
              const qStep = block.steps.find(s => s.type === "question" && s.question);
              if (qStep?.question) {
                const tl = qStep.question.type === "multiple_choice" ? "MCQ" : qStep.question.type === "true_false" ? "T/F" : "Open";
                label = `${tl} Question`;
              }
            }
          } else if (block.type === "display" && block.content) {
            label = truncateText(stripHtml(block.content), 35);
          } else if ((block.type === "question" || block.type === "exercise") && block.question) {
            const typeLabel = block.question.type === "multiple_choice" ? "MCQ" :
                              block.question.type === "true_false" ? "T/F" : "Open";
            const firstOption = block.question.options?.[0]?.text;
            label = firstOption ? `${typeLabel}: ${truncateText(stripHtml(firstOption), 25)}` : `${typeLabel} Question`;
          }

          const isDropTargetHere = dropTarget?.lessonId === null && dropTarget?.index === index;

          return (
            <div
              key={block.block_id}
              draggable
              onDragStart={(e) => onBlockDragStart(e, block.block_id, null, index)}
              onDragOver={(e) => {
                if (dragState && dragState.blockId !== block.block_id) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "move";
                  onBlockDragOver(e, null, index);
                }
              }}
              onDragLeave={onBlockDragLeave}
              onDrop={(e) => {
                if (dragState) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDropToOrphan(e, index);
                }
              }}
              onDragEnd={onDragEnd}
              className={cn(
                "py-2 px-3 cursor-pointer hover:bg-gray-100 group",
                selectedId === block.block_id && "bg-green-100",
                dragState?.blockId === block.block_id && "opacity-50 bg-blue-50",
                isDropTargetHere && "border-t-2 border-green-500"
              )}
              onClick={() => onSelect("block_v2", block.block_id, block)}
            >
              {/* First line: drag handle, icon, title, menu */}
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0" />
                <BlockIcon type={block.type} />
                <span className="text-gray-700 truncate text-sm flex-1">{label}</span>
                {onCourseChange && (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMenuToggle(openMenuBlockId === block.block_id ? null : block.block_id);
                      }}
                      className="p-0.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Akce"
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    {openMenuBlockId === block.block_id && (
                      <BlockContextMenu
                        block={block}
                        onDuplicate={(e) => {
                          e.stopPropagation();
                          const dup = duplicateBlockV2(block);
                          onCourseChange({ ...course, blocks: [...(course.blocks || []), dup] });
                          onMenuToggle(null);
                        }}
                        onDelete={(e) => {
                          e.stopPropagation();
                          if (!window.confirm("Odstranit blok?")) return;
                          const newBlocks = (course.blocks || []).filter((b) => b.block_id !== block.block_id);
                          const newLessons = course.lessons.map((l) => ({
                            ...l,
                            blocks: l.blocks.filter((b) => b.block_id !== block.block_id).map((b, i) => ({ ...b, order: i + 1 })),
                          }));
                          onCourseChange({ ...course, blocks: newBlocks, lessons: newLessons });
                          onMenuToggle(null);
                        }}
                        onExport={(e) => {
                          e.stopPropagation();
                          onExportBlock(block);
                          onMenuToggle(null);
                        }}
                        onStatusChange={(e, newStatus) => {
                          e.stopPropagation();
                          const newBlocks = (course.blocks || []).map((b) =>
                            b.block_id === block.block_id ? { ...b, status: newStatus } : b
                          );
                          onCourseChange({ ...course, blocks: newBlocks });
                          onMenuToggle(null);
                        }}
                        onClose={() => onMenuToggle(null)}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Second line: badges */}
              <div className="flex items-center gap-1.5 mt-1 ml-6">
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  block.type === "display" && "bg-cyan-100 text-cyan-700",
                  block.type === "question" && "bg-orange-100 text-orange-700",
                  block.type === "exercise" && "bg-amber-100 text-amber-700"
                )}>
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
              </div>
            </div>
          );
        })}
        {orphanBlocks.length === 0 && (
          <div className={cn(
            "py-3 px-3 text-sm italic",
            isDropTargetSection ? "text-green-600 border-2 border-dashed border-green-400 rounded m-1" : "text-gray-400"
          )}>
            {dragState ? "Přetáhněte sem" : "Standalone blocks for go_to actions"}
          </div>
        )}
        {onCourseChange && (
          <button
            onClick={handleAddBlock}
            className="w-full py-1.5 text-xs font-medium text-gray-400 hover:text-green-700 hover:bg-green-50 flex items-center justify-center gap-1.5 border-t border-dashed border-gray-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Přidat blok
          </button>
        )}
      </div>
    </div>
  );
}

// Helper component for block icon
function BlockIcon({ type }: { type: BlockV2["type"] }) {
  const iconClass = "w-4 h-4 flex-shrink-0";
  switch (type) {
    case "display":
      return <Brain className={cn(iconClass, "text-blue-500")} />;
    case "question":
      return <MessageSquare className={cn(iconClass, "text-purple-500")} />;
    case "exercise":
      return <Dumbbell className={cn(iconClass, "text-amber-500")} />;
    default:
      return <Box className={cn(iconClass, "text-gray-500")} />;
  }
}
