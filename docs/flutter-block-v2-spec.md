# Block V2 — Flutter Implementation Spec

> This document describes the JSON format produced by the EduAI admin editor.
> Use it to build the block rendering engine in the Flutter mobile app.

---

## 1. Top-Level Structure

```
CourseV2
├── lessons: LessonV2[]
│   └── blocks: LessonBlockBinding[]  (references to BlockV2 by block_id)
└── blocks: BlockV2[]                 (all block definitions, flat array)
    └── steps: BlockStep[]            (ordered content units inside a block)
```

The course JSON arrives as a single object with `export_type: "course_v2"` (or `"exercise_v2"` / `"quiz_v2"`).

```json
{
  "export_type": "course_v2",
  "course_id": "ZLOMKY5TR",
  "name": "Zlomky pro 5. třídu",
  "language": "cs",
  "only_once": false,
  "lessons": [ ... ],
  "blocks": [ ... ]
}
```

### Export Types

| export_type   | Behavior |
|---------------|----------|
| `course_v2`   | Full course with all content, hints, help, solutions visible |
| `exercise_v2` | Practice mode — hints and solutions shown, no grading |
| `quiz_v2`     | Test mode — NO hints, NO help, NO solutions. Only question blocks. Has grading (`mark` field on options) |

---

## 2. Lessons & Block Bindings

Each lesson contains an ordered list of block references:

```json
{
  "lesson_id": "L1_INTRO",
  "name": "Co je zlomek?",
  "order": 1,
  "blocks": [
    { "block_id": "L1_B1_uvod", "order": 1, "default_practice": false },
    { "block_id": "L1_B2_casti", "order": 2, "default_practice": false },
    { "block_id": "L1_B3_poznej", "order": 3, "default_practice": true }
  ]
}
```

- `block_id` — lookup key into the top-level `blocks[]` array
- `order` — display order within the lesson
- `default_practice` — if `true`, auto-add to spaced repetition / practice queue
- `bg_image`, `bg_color` — optional visual overrides for the block card in lesson view

---

## 3. Block Types

Every block has `type` which determines its rendering and interaction model:

| Type | Purpose | Allowed Steps | User Interaction |
|------|---------|---------------|------------------|
| `display` | Teaching content | text, image, video, audio | Read-only, swipe through steps linearly |
| `question` | Assessment with branching | text, image, video, audio, question | Answer determines which step comes next via `go_to` |
| `exercise` | Practice drill | text, image, video, audio, question | Correct/incorrect evaluation only, no branching, linear flow |

---

## 4. BlockV2 Object

```typescript
interface BlockV2 {
  export_type: "block_v2";
  block_id: string;
  version: number;
  language: string;
  author: string;
  updated: string;          // ISO timestamp
  status: "draft" | "locked" | "approved" | "published";
  type: "display" | "question" | "exercise";
  duration: string;         // e.g. "3 min"
  xp?: number;             // Experience points awarded on completion

  // Content
  steps: BlockStep[];       // ORDERED array — this is the main content

  // Block-level hints (shown on ? button)
  hint?: string;            // Short hint
  help?: string;            // Detailed explanation

  // Didactics
  gpf: { domain, construct, subconstruct, grade, level };
  learning: { concepts, competencies, bloom_level, difficulty, prerequisites };
  fsrs?: { ... };           // Spaced repetition params
}
```

### Important: Always use `steps[]`

The `steps` array is the **primary content source**. Legacy flat fields (`content`, `image`, `video`, `question` directly on BlockV2) are deprecated. The admin editor always produces `steps[]`. If you encounter a block without steps, treat it as a migration error.

---

## 5. BlockStep Object

Each step is one screen/card in the block flow:

```typescript
interface BlockStep {
  id: string;              // "s1", "s2", "s3" — sequential, stable IDs
  type: "text" | "image" | "video" | "audio" | "question";
  order: number;           // 1-based, matches position in array

  // Type-specific content (only one is set per step):
  content?: string;        // text steps — Markdown with LaTeX ($..$ and $$..$$)
  image?: {
    url: string;
    alt?: string;
    position?: "above" | "below" | "inline";
  };
  video?: {
    url: string;           // Direct MP4 URL (NOT YouTube)
    position?: "above" | "below" | "inline";
  };
  audio?: {
    url: string;           // Direct audio URL (MP3, WAV, OGG, etc.)
  };
  question?: QuestionConfig;

  // Step-level hints
  hint?: string;           // Short hint (shown on ? tap)
  help?: string;           // Detailed help
}
```

---

## 6. Step Rendering by Type

### `text` step
- Render `content` as **Markdown with LaTeX support**
- Supports: headings, bold, italic, lists, tables (GFM), code blocks
- LaTeX: `$inline$` and `$$block$$` notation (use a Flutter KaTeX/MathJax renderer)
- May also contain raw HTML — support basic tags (`<b>`, `<i>`, `<p>`, `<table>`, etc.)

### `image` step
- Show image from `image.url`
- `image.alt` for accessibility
- `image.position`: `"above"` = image before any adjacent text, `"below"` = after, `"inline"` = side by side

### `video` step
- Play MP4 from `video.url` — use a standard video player with controls
- NOT YouTube — these are direct MP4 links
- `video.position`: same as image

### `audio` step
- Play audio from `audio.url` — use a standard audio player with play/pause/seek controls
- Supports MP3, WAV, OGG, and other common audio formats
- No position property — always render as a full-width audio player widget

### `question` step
- This is where user interaction happens
- See Section 7 for full question rendering logic

---

## 7. Question Config

```typescript
interface QuestionConfig {
  type: "multiple_choice" | "true_false" | "open" | "numeric";
  options?: QuestionOption[];     // For MC and T/F
  correct_answer?: string;        // For open questions
  correct_number?: number;        // For numeric questions — expected answer
  tolerance?: number;             // For numeric questions — acceptable ± range (default 0)
  allow_multiple?: boolean;       // MC: allow selecting multiple options
  show_answers?: boolean;         // MC: show answer options (default true)
  solution?: string;              // Shown after answering (Markdown/LaTeX)
  solution_image?: StepImage;     // Optional image in solution
}
```

### QuestionOption (for MC and T/F)

```typescript
interface QuestionOption {
  id: string;              // "a", "b", "c"...
  text: string;            // Option display text
  is_correct: boolean;     // Whether this is a correct answer
  feedback?: string;       // Shown after selecting this option (Markdown/LaTeX)
  feedback_image?: StepImage;
  mark?: string;           // Grade for quiz mode ("1"-"5")
  score_koef?: number;     // Score coefficient 0-1
  go_to?: string;          // Navigation target (see Section 8)
}
```

### Rendering by question type:

**multiple_choice:**
- Show all options as tappable cards/buttons
- If `allow_multiple`: checkboxes, otherwise radio-style (one selection)
- If `show_answers` is false: free-form input instead of showing options
- On selection: show `feedback` for the selected option
- After answering: show `solution` if available

**true_false:**
- Exactly 2 options (typically "Pravda"/"Nepravda" or "True"/"False")
- Render as two large buttons
- On selection: show feedback, then navigate per `go_to`

**open:**
- Show text input field
- Compare user input to `correct_answer` (case-insensitive, trimmed)
- Show `solution` after submission

**numeric:**
- Show numeric input field (number keyboard on mobile)
- Compare user input to `correct_number` with tolerance: answer is correct if `|user_input - correct_number| <= tolerance`
- If `tolerance` is `0` or absent, require exact match
- Show `solution` after submission

---

## 8. Navigation Logic — `go_to`

This is the **core routing system** for question blocks. Each option's `go_to` field determines what happens after the user selects it.

### `go_to` values:

| Value | Meaning | Action |
|-------|---------|--------|
| `undefined` / `null` | Default | Go to next step in order (s1 → s2 → s3...) |
| `"NEXT_STEP"` | Explicit next | Same as default — advance to next step |
| `"AGAIN"` | Repeat | Show the SAME step again (retry) |
| `"END"` | Finish block | End the block immediately, mark as completed |
| `"s3"` (step ID) | Jump to step | Jump to that step within the current block |
| `"L1_B2_casti"` (block ID) | Cross-block jump | Navigate to a different block entirely |

### Navigation algorithm (pseudocode):

```
function handleAnswer(selectedOption, currentStep, currentBlock, allBlocks):
    target = selectedOption.go_to

    // Show feedback first
    if selectedOption.feedback:
        showFeedback(selectedOption.feedback)

    // Then navigate
    if target == null OR target == "NEXT_STEP":
        nextStep = getNextStepByOrder(currentBlock.steps, currentStep)
        if nextStep:
            showStep(nextStep)
        else:
            completeBlock(currentBlock)

    else if target == "AGAIN":
        showStep(currentStep)  // re-render same step

    else if target == "END":
        completeBlock(currentBlock)

    else if target starts with "s" and is a valid step ID in currentBlock:
        step = findStepById(currentBlock.steps, target)
        showStep(step)

    else:
        // Cross-block navigation
        targetBlock = findBlockById(allBlocks, target)
        if targetBlock:
            navigateToBlock(targetBlock)  // start from s1 of that block
        else:
            // Fallback: treat as NEXT_STEP
            advanceToNextStep()
```

### Navigation by block type:

**`display` blocks:**
- No question steps, so no `go_to` logic
- Simple linear flow: s1 → s2 → s3 → ... → done
- User swipes/taps "Next" to advance

**`question` blocks:**
- `go_to` on each option drives navigation
- Can branch: correct answer → skip ahead, wrong → review step, very wrong → different block
- Steps that are only reachable via `go_to` jumps act as "remediation" content

**`exercise` blocks:**
- Linear like display, BUT question steps evaluate correct/incorrect
- `go_to` is **ignored** — always advance linearly regardless of answer
- Show feedback (correct/incorrect) but don't branch

---

## 9. Step Flow Examples

### Example 1: Simple display block (linear)
```
[s1: text] → [s2: image] → [s3: text] → DONE
```
User taps Next through each step.

### Example 2: Question block with branching
```
[s1: text "Read the problem"]
    ↓
[s2: question "What is 1/4 + 2/4?"]
    ├── Option A (correct, go_to: "s5")  → jumps to s5
    ├── Option B (wrong, go_to: "s3")    → jumps to s3
    └── Option C (very wrong, go_to: "L3_B1_scitani")  → jumps to different block
    ↓
[s3: text "Review: here's how to add fractions..."]
    ↓
[s4: question "Try again: 1/4 + 2/4 = ?"]
    ├── Option A (correct, go_to: "s5")  → jumps to s5
    └── Option B (wrong, go_to: "L3_B1_scitani")  → cross-block remediation
    ↓
[s5: text "Great job!"]  → DONE
```

### Example 3: Exercise block (linear, evaluated)
```
[s1: text "Solve this problem"]
    ↓
[s2: question] → show correct/incorrect feedback, then advance
    ↓
[s3: text "Another problem"]
    ↓
[s4: question] → show correct/incorrect feedback, then advance
    ↓
DONE
```

---

## 10. Hint & Help System

Two levels of hints:

### Block-level (`block.hint`, `block.help`)
- Shown via a persistent `?` button while viewing ANY step in the block
- `hint` = short text (tooltip style)
- `help` = longer explanation (modal/bottom sheet)

### Step-level (`step.hint`, `step.help`)
- Shown via `?` button only when viewing THAT specific step
- Overrides or supplements block-level hints
- Priority: show step-level hint first, then block-level if step has none

### Quiz mode (`export_type: "quiz_v2"`)
- **Hide ALL hints, help, solutions, and feedback**
- Only show the question and options
- Use `mark` field on options for grading
- After quiz completion, show total score

---

## 11. XP & Scoring

- `block.xp` — experience points awarded when block is completed
- `option.score_koef` — multiplier (0 to 1) for scoring the answer
  - Correct answer typically has `score_koef: 1.0`
  - Partially correct might have `score_koef: 0.3`
  - Wrong answer has `score_koef: 0` or no field
- `option.mark` — grade string ("1" to "5") for quiz mode grading (Czech grading: 1=best, 5=worst)

### XP calculation suggestion:
```
earned_xp = block.xp * best_score_koef_achieved
```

---

## 12. Content Format Reference

All text content fields support:

| Feature | Syntax | Example |
|---------|--------|---------|
| Bold | `**text**` | **text** |
| Italic | `*text*` | *text* |
| Heading | `# H1` / `## H2` / `### H3` | |
| List | `- item` or `1. item` | |
| Table | GFM pipe tables | `\| A \| B \|` |
| Inline math | `$...$` | `$\frac{1}{2}$` |
| Block math | `$$...$$` | `$$\frac{a}{b} + \frac{c}{d}$$` |
| Code | `` `code` `` | |
| Link | `[text](url)` | |
| Image in MD | `![alt](url)` | |
| Raw HTML | `<b>`, `<table>`, etc. | |

**Fields that support Markdown/LaTeX:**
- `step.content` (text steps)
- `option.text` (may contain LaTeX)
- `option.feedback`
- `question.solution`
- `step.hint`, `step.help`
- `block.hint`, `block.help`

---

## 13. Video & Audio Handling

### Video
Videos are **direct MP4 URLs** (not YouTube embeds).

```json
{
  "type": "video",
  "video": {
    "url": "https://cdn.example.com/fraction-intro.mp4",
    "position": "below"
  }
}
```

Use a standard video player widget. Support play/pause/seek controls.

### Audio
Audio steps contain direct audio file URLs (MP3, WAV, OGG).

```json
{
  "type": "audio",
  "audio": {
    "url": "https://cdn.example.com/pronunciation.mp3"
  }
}
```

Use a standard audio player widget with play/pause/seek. No `position` field — render as a full-width player.

---

## 14. Prerequisites

Blocks can declare prerequisites:

```json
"prerequisites": [
  { "block_id": "L1_B2_casti", "min_level": 0.5 },
  { "skill": "ALG_3.1.2", "min_level": 0.3, "weight": 0.5 }
]
```

- `block_id` + `min_level` — user must have mastery >= min_level on that block
- `skill` + `min_level` — user must have skill level >= threshold
- Use for adaptive ordering: skip blocks the student already mastered, or lock blocks they're not ready for

---

## 15. FSRS Spaced Repetition

Blocks with `default_practice: true` in their lesson binding should be added to the spaced repetition queue. The `fsrs` object on each block provides parameters:

```json
"fsrs": {
  "initial_difficulty": 0.3,
  "initial_stability": 2.5,
  "initial_recall": 0.65,
  "forgetting_rate": 0.25,
  "weight": 1.0,
  "min_interval": 1,
  "max_interval": 90
}
```

Use the FSRS algorithm to schedule review intervals based on student performance.

---

## 16. Complete Block Example

Here's a real question block with branching, cross-block navigation, hints, and feedback:

```json
{
  "export_type": "block_v2",
  "block_id": "L1_B3_poznej",
  "type": "question",
  "xp": 15,
  "steps": [
    {
      "id": "s1",
      "type": "text",
      "order": 1,
      "content": "Podivej se na zlomek $\\frac{5}{7}$ a odpovez na otazku.",
      "hint": "Citatel je cislo nahore, jmenovatel je cislo dole."
    },
    {
      "id": "s2",
      "type": "question",
      "order": 2,
      "question": {
        "type": "multiple_choice",
        "show_answers": true,
        "options": [
          {
            "id": "a",
            "text": "Citatel je 5, jmenovatel je 7",
            "is_correct": true,
            "feedback": "Spravne! Citatel (nahore) = 5, jmenovatel (dole) = 7.",
            "go_to": "s4"
          },
          {
            "id": "b",
            "text": "Citatel je 7, jmenovatel je 5",
            "is_correct": false,
            "feedback": "Pozor, popletl/a sis to!",
            "go_to": "s3"
          },
          {
            "id": "c",
            "text": "Citatel je 5, jmenovatel je 12",
            "is_correct": false,
            "feedback": "Ne, jmenovatel je cislo dole ve zlomku, tedy 7.",
            "go_to": "L1_B2_casti"
          }
        ],
        "solution": "Ve zlomku $\\frac{5}{7}$ je citatel **5** a jmenovatel **7**."
      },
      "hint": "Horni cislo = citatel, dolni cislo = jmenovatel."
    },
    {
      "id": "s3",
      "type": "text",
      "order": 3,
      "content": "### Pripomenuti\n\nV zlomku $\\frac{a}{b}$:\n- **a** (nahore) = **citatel**\n- **b** (dole) = **jmenovatel**\n\nZkus to znovu!"
    },
    {
      "id": "s4",
      "type": "text",
      "order": 4,
      "content": "Vyborne! Umis spravne urcit citatel a jmenovatel."
    }
  ]
}
```

**Flow diagram:**
```
s1 (text: read the fraction)
 ↓
s2 (question: identify numerator/denominator)
 ├─ Option A (correct) ──────→ s4 (success message) → DONE
 ├─ Option B (swapped) ──────→ s3 (review) → continues to s4
 └─ Option C (very wrong) ───→ [L1_B2_casti] (different block entirely)
```

---

## 17. Checklist for Flutter Implementation

- [ ] Parse `course_v2` / `exercise_v2` / `quiz_v2` JSON
- [ ] Build block lookup map: `Map<String, BlockV2>` from `blocks[]`
- [ ] Render lessons in order, resolve block bindings
- [ ] **Step renderer**: switch on `step.type` → text/image/video/audio/question widget
- [ ] **Markdown + LaTeX renderer** for all text content
- [ ] **MP4 video player** for video steps
- [ ] **Audio player** for audio steps (MP3/WAV/OGG)
- [ ] **Question widget**: MC (radio/checkbox), T/F (two buttons), Open (text input), Numeric (number input with tolerance)
- [ ] **Navigation engine**: implement `go_to` routing (Section 8 algorithm)
- [ ] **Exercise mode**: linear flow, ignore `go_to`, show correct/incorrect only
- [ ] **Quiz mode**: hide hints/help/solutions/feedback, collect `mark` values
- [ ] **Hint/help UI**: `?` button → show step-level hint first, fallback to block-level
- [ ] **XP tracking**: award `block.xp` on completion, weighted by `score_koef`
- [ ] **Cross-block navigation**: `go_to` with a block_id loads that block from s1
- [ ] **Prerequisites**: check mastery before unlocking blocks
- [ ] **FSRS queue**: add `default_practice` blocks to spaced repetition
- [ ] **Only Once**: if `course.only_once === true`, prevent student from re-entering course after completion

---

## 18. Test Course

A complete test course is available at:
```
test-courses/zlomky-5-trida.json
```

Stats:
- 5 lessons, 25 blocks (11 display, 9 question, 5 exercise)
- 83 total steps
- 31 go_to references (7 cross-block)
- 15 multiple choice, 5 open, 1 true/false questions
- 335 total XP
- 30 steps with hints, 4 with detailed help

Use this to validate your implementation covers all edge cases.
