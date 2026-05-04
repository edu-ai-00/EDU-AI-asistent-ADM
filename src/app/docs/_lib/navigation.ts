// ============================================================================
// Navigation Types
// ============================================================================
export type SectionId =
  | "overview"
  | "changelog"
  | "v1-format"
  | "v1-course"
  | "v1-lecture"
  | "v1-step"
  | "v1-answer"
  | "v1-example"
  | "v2-format"
  | "v2-course"
  | "v2-lesson"
  | "v2-block"
  | "v2-steps"
  | "v2-gpf"
  | "v2-learning"
  | "v2-fsrs"
  | "v2-adaptation"
  | "v2-ai-mode"
  | "v2-evaluation"
  | "v2-analytics"
  | "v2-guards"
  | "v2-question"
  | "v2-example"
  | "comparison"
  | "import-export";

export interface NavItem {
  id: SectionId;
  label: string;
  children?: NavItem[];
}

// ============================================================================
// Navigation Structure
// ============================================================================
export const navigation: NavItem[] = [
  { id: "overview", label: "Prehled" },
  { id: "changelog", label: "Changelog" },
  {
    id: "v1-format",
    label: "V1 Format (Legacy)",
    children: [
      { id: "v1-course", label: "Course" },
      { id: "v1-lecture", label: "Lecture" },
      { id: "v1-step", label: "Step" },
      { id: "v1-answer", label: "Answer" },
      { id: "v1-example", label: "Priklad JSON" },
    ],
  },
  {
    id: "v2-format",
    label: "V2 Format (GPF + FSRS)",
    children: [
      { id: "v2-course", label: "CourseV2" },
      { id: "v2-lesson", label: "LessonV2" },
      { id: "v2-block", label: "BlockV2" },
      { id: "v2-steps", label: "BlockStep (Kroky)" },
      { id: "v2-gpf", label: "GPF Data" },
      { id: "v2-learning", label: "Learning Metadata" },
      { id: "v2-fsrs", label: "FSRS Parametry" },
      { id: "v2-adaptation", label: "Adaptation Rules" },
      { id: "v2-ai-mode", label: "AI Mode" },
      { id: "v2-evaluation", label: "Evaluation Rules" },
      { id: "v2-analytics", label: "Analytics Event" },
      { id: "v2-guards", label: "Type Guards" },
      { id: "v2-question", label: "Question Config" },
      { id: "v2-example", label: "Priklad JSON" },
    ],
  },
  { id: "comparison", label: "Srovnani V1 vs V2" },
  { id: "import-export", label: "Import a Export" },
];
