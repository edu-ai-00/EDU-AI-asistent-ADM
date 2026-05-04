// Re-export V2 types for convenience
export * from "./block-v2";

// ============================================================================
// V1 Course Types (Legacy)
// ============================================================================

export interface SubAnswer {
  text2match: string | null;
  description: string;
  answer_type: string;
  text: string | null;
  text2: string;
  correct_answer: boolean;
  visible_answer: boolean;
  position: number;
}

export interface Answer {
  text2match: string;
  description: string;
  answer_type: "text" | "image" | "video" | "link";
  position: number;
  text: string;
  text2: string;
  correct_answer: boolean;
  visible_answer: boolean;
  following_action: "next" | "again" | "lecture" | "course" | "code";
  following_action_id: string | number;
  subanswers: SubAnswer[];
}

export interface SubStep {
  step_type: string;
  response_type: string;
  description: string;
  text: string;
  position: number;
  text2: string;
  text3: string;
}

export interface Step {
  uuid4: string;
  step_type: "text" | "image";
  response_type: "information" | "question";
  position: number;
  description: string;
  free_input: boolean;
  text: string;
  text2: string;
  text3: string;
  answers: Answer[];
  substeps: SubStep[];
}

export interface Lecture {
  steps: Step[];
  name: string;
  description: string;
  export_type: "lecture";
  uuid4: string;
}

export interface Course {
  lectures: Lecture[];
  export_type: "course";
  name: string;
  description: string;
}

// Block format (EDU Block Design)
export interface BlockMetadata {
  taxonomy: string;
  difficulty: number;
  durationSec: number;
  prerequisites: string;
}

export interface BlockStepData {
  text?: string;
  hint?: string;
  help?: string;
  placeholder?: string;
  type?: string;
  source?: string;
  video_id?: string;
  start_time?: number;
  autoplay?: boolean;
  caption?: string;
  question?: string;
  display1?: string;
  display1_hint?: string;
  display1_help?: string;
  display2?: string;
  answers?: BlockAnswer[];
}

export interface BlockAnswer {
  label: string;
  image: string;
  id: number;
  feedback1: string;
  feedback2: string;
  correct_answer: boolean;
  visible_answer: boolean;
  following_action: string;
  following_action_id: string;
}

export interface BlockStep {
  id: number;
  type: "text" | "media" | "question_open" | "question_mcq";
  data: BlockStepData;
}

export interface Block {
  export_type: "block";
  uid: string;
  version: string;
  type: string;
  title: string;
  bg_image: string;
  bg_color: string;
  metadata: BlockMetadata;
  steps: BlockStep[];
}
