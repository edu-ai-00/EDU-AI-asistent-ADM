"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileText,
  HelpCircle,
  Info,
  Image,
} from "lucide-react";
import { cn, truncateText } from "@/lib/utils";
import type { Course, Lecture, Step } from "@/types/course";

interface CourseTreeProps {
  course: Course;
  selectedId: string | null;
  onSelect: (type: "course" | "lecture" | "step", id: string, data: unknown) => void;
}

export function CourseTree({ course, selectedId, onSelect }: CourseTreeProps) {
  const [expandedLectures, setExpandedLectures] = useState<Set<string>>(
    new Set()
  );

  const toggleLecture = (uuid: string) => {
    setExpandedLectures((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Course Header */}
      <div
        className={cn(
          "p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50",
          selectedId === "course" && "bg-blue-50"
        )}
        onClick={() => onSelect("course", "course", course)}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">{course.name}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1 ml-7">
          {course.lectures.length} lectures
        </p>
      </div>

      {/* Lectures */}
      <div className="divide-y divide-gray-100">
        {course.lectures.map((lecture, lectureIndex) => (
          <LectureItem
            key={lecture.uuid4}
            lecture={lecture}
            index={lectureIndex}
            isExpanded={expandedLectures.has(lecture.uuid4)}
            onToggle={() => toggleLecture(lecture.uuid4)}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface LectureItemProps {
  lecture: Lecture;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  selectedId: string | null;
  onSelect: (type: "course" | "lecture" | "step", id: string, data: unknown) => void;
}

function LectureItem({
  lecture,
  index,
  isExpanded,
  onToggle,
  selectedId,
  onSelect,
}: LectureItemProps) {
  return (
    <div>
      <div
        className={cn(
          "p-3 pl-4 cursor-pointer hover:bg-gray-50 flex items-center gap-2",
          selectedId === lecture.uuid4 && "bg-blue-50"
        )}
        onClick={() => onSelect("lecture", lecture.uuid4, lecture)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-0.5 hover:bg-gray-200 rounded"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <FileText className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium">
          {index + 1}. {lecture.name}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {lecture.steps.length} steps
        </span>
      </div>

      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-100">
          {lecture.steps.map((step, stepIndex) => (
            <StepItem
              key={step.uuid4}
              step={step}
              index={stepIndex}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface StepItemProps {
  step: Step;
  index: number;
  selectedId: string | null;
  onSelect: (type: "course" | "lecture" | "step", id: string, data: unknown) => void;
}

function StepItem({ step, index, selectedId, onSelect }: StepItemProps) {
  const getStepIcon = () => {
    if (step.response_type === "question") {
      return <HelpCircle className="w-3.5 h-3.5 text-orange-500" />;
    }
    if (step.step_type === "image") {
      return <Image className="w-3.5 h-3.5 text-purple-500" />;
    }
    return <Info className="w-3.5 h-3.5 text-blue-500" />;
  };

  const getStepLabel = () => {
    if (step.description) return step.description;
    if (step.text) return truncateText(step.text, 40);
    return `Step ${index + 1}`;
  };

  return (
    <div
      className={cn(
        "py-2 px-3 pl-12 cursor-pointer hover:bg-gray-100 flex items-center gap-2 text-sm",
        selectedId === step.uuid4 && "bg-blue-100"
      )}
      onClick={() => onSelect("step", step.uuid4, step)}
    >
      {getStepIcon()}
      <span className="text-gray-700">{getStepLabel()}</span>
      {step.answers.length > 0 && (
        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded ml-auto">
          {step.answers.length} answers
        </span>
      )}
    </div>
  );
}
