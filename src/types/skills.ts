// ============================================================================
// Skills Module Types — Vectors, Dimensions, Course Skill Configs, Events
// ============================================================================

// --- Skill Vector (ordered set of dimensions for a course) ---

export interface SkillVector {
  id: string; // UUID
  name: string;
  description: string | null;
  dimension_count: number;
  version: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  dimensions?: VectorDimension[];
}

export interface CreateVectorInput {
  name: string;
  description?: string | null;
  dimension_count: number;
  is_public?: boolean;
}

export interface UpdateVectorInput {
  name?: string;
  description?: string | null;
  is_public?: boolean;
}

// --- Vector Dimension (one atomic element of a vector) ---

export interface VectorDimension {
  id: string; // UUID
  vector_id: string;
  dimension_index: number;
  code: string | null;
  name: string;
  domain_code: string | null;
  domain_name: string | null;
  construct_name: string | null;
  description: string | null;
  tags: string[] | null;
}

export interface CreateDimensionInput {
  dimension_index: number;
  code?: string | null;
  name: string;
  domain_code?: string | null;
  domain_name?: string | null;
  construct_name?: string | null;
  description?: string | null;
  tags?: string[] | null;
}

export interface UpdateDimensionInput {
  code?: string | null;
  name?: string;
  domain_code?: string | null;
  domain_name?: string | null;
  construct_name?: string | null;
  description?: string | null;
  tags?: string[] | null;
}

// --- Course Skill Config (per-course formula mapping vector dims to skills) ---

export interface SkillFormula {
  dims: number[];
  weights?: number[];
}

/** formula_json: Record<skill_name, SkillFormula> */
export type FormulaJson = Record<string, SkillFormula>;

export interface CourseSkillConfig {
  id: string;
  course_id: number;
  vector_id: string;
  formula_json: FormulaJson;
  display_scale_min: number;
  display_scale_max: number;
  confidence_c: number;
  min_count: number;
  version: number;
  created_at: string;
  updated_at: string;
  vector?: SkillVector;
}

export interface SaveCourseSkillConfigInput {
  vector_id: string;
  formula_json: FormulaJson;
  display_scale_min?: number;
  display_scale_max?: number;
  confidence_c?: number;
  min_count?: number;
}

// --- Computed Skill (returned from the skill computation endpoint) ---

export interface ComputedSkill {
  name: string;
  level: number | null;
  interval_low: number | null;
  interval_high: number | null;
  confidence_label: string | null; // "nižší" | "střední" | "vyšší" | null
  included_count: number;
  excluded_count: number;
  median_count: number | null;
  message: string | null; // null = has data, non-null = "not enough data"
}

// --- Student Skill Vector (overview: one student row) ---

export interface StudentSkillRow {
  user: {
    id: number;
    name: string;
    email?: string | null;
    classroom_id: number | null;
    classroom_name?: string | null;
  };
  skills: ComputedSkill[];
}

// --- Course Skills Overview (heatmap data) ---

export interface CourseSkillsOverview {
  skill_names: string[];
  students: StudentSkillRow[];
}

// --- Course Statistics ---

export interface CourseSkillStats {
  total_events: number;
  total_students: number;
  correct_ratio: number; // 0-100
  help_usage_ratio: number; // 0-100
  avg_time_on_task_ms: number;
  problematic_skills: { name: string; avg_level: number }[];
}

// --- GPF JSON import format (matches gpf.json structure) ---

// Flat format: { dimensions: [{ code, name, domain_code, ... }] }
export interface GpfJsonDimensionFlat {
  code: string;
  name: string;
  domain_code: string;
  domain_name: string;
  construct_name: string;
}

export interface GpfJsonImportFlat {
  name?: string;
  dimensions: GpfJsonDimensionFlat[];
}

// Native GPF format: array of domains → constructs → subconstructs
export interface GpfSubconstruct {
  id: string;
  subconstruct: string;
  skills?: string[];
}

export interface GpfConstruct {
  id: string;
  construct: string;
  subconstructs: GpfSubconstruct[];
}

export interface GpfDomain {
  id: string;
  domain: string;
  constructs: GpfConstruct[];
}
