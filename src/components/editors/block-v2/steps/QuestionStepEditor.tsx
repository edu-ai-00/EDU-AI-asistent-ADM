"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  BlockStep,
  BlockType,
  BlockV2,
  QuestionConfig,
  QuestionCriterion,
  QuestionOption,
} from "@/types/block-v2";
import { QUESTION_TYPE_LABELS } from "@/lib/defaults";
import { cn } from "@/lib/utils";
import { MarkdownTextarea } from "@/components/MarkdownTextarea";

// ─── AI-guided solving (BR-V9TQA7) ──────────────────────────────────────────
// The app falls back to the same default, so an unset field and a field set to
// 3 behave identically — keep the two in step if this ever changes.
const GUIDED_DEFAULT_ATTEMPTS = 3;
const GUIDED_MIN_ATTEMPTS = 1;
const GUIDED_MAX_ATTEMPTS = 10;

/** Keeps the stored value inside the range the app is willing to honour. */
function clampGuidedAttempts(raw: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return GUIDED_DEFAULT_ATTEMPTS;
  return Math.max(GUIDED_MIN_ATTEMPTS, Math.min(GUIDED_MAX_ATTEMPTS, Math.round(parsed)));
}

export interface QuestionStepEditorProps {
  question: QuestionConfig;
  blockType: BlockType;
  allSteps: BlockStep[];
  courseBlocks?: BlockV2[];
  currentBlockId?: string;
  onChange: (question: QuestionConfig) => void;
}

export function QuestionStepEditor({
  question,
  blockType,
  allSteps,
  courseBlocks,
  currentBlockId,
  onChange,
}: QuestionStepEditorProps) {
  const q = question;
  const showGoTo = blockType === "question";

  const updateQuestion = (updates: Partial<QuestionConfig>) => {
    onChange({ ...q, ...updates });
  };

  const addOption = () => {
    const options = q.options || [];
    const newOption: QuestionOption = {
      id: `opt_${options.length + 1}`,
      text: "",
      is_correct: false,
    };
    updateQuestion({ options: [...options, newOption] });
  };

  // ─── AI grading criteria (BR-P745Q8) ──────────────────────────────────────
  // Capped at four: the brief asks for feedback that walks through every
  // criterion *and* stays short, and past four those two pull apart.
  const MAX_CRITERIA = 4;
  const criteria = q.ai_criteria_list || [];
  const weightSum = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  /**
   * True when the question gives the AI nothing to judge against. Not an
   * error — the evaluator falls back to plain factual correctness against the
   * task statement — but the author should see that they left it that way.
   */
  const hasNoGradingBasis =
    q.type === "open" &&
    !q.correct_answer?.trim() &&
    !q.solution?.trim() &&
    criteria.length === 0 &&
    !q.ai_criteria?.trim();

  const updateCriteria = (next: QuestionCriterion[]) => {
    updateQuestion({ ai_criteria_list: next.length ? next : undefined });
  };

  const addCriterion = () => {
    if (criteria.length >= MAX_CRITERIA) return;
    updateCriteria([
      ...criteria,
      {
        // Stable id: the AI echoes it back on per-criterion scores, and stored
        // attempts reference it, so it must not be a positional index.
        id: `crit_${Date.now().toString(36)}_${criteria.length + 1}`,
        name: "",
        description: "",
        weight: 0,
      },
    ]);
  };

  const updateCriterion = (index: number, updates: Partial<QuestionCriterion>) => {
    updateCriteria(criteria.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const removeCriterion = (index: number) => {
    updateCriteria(criteria.filter((_, i) => i !== index));
  };

  const removeOption = (index: number) => {
    const options = q.options || [];
    updateQuestion({ options: options.filter((_, i) => i !== index) });
  };

  const updateOption = (index: number, updates: Partial<QuestionOption>) => {
    const options = q.options || [];
    updateQuestion({
      options: options.map((o, i) => (i === index ? { ...o, ...updates } : o)),
    });
  };

  const initTrueFalseOptions = (): QuestionOption[] => {
    if (!q.options || q.options.length !== 2 ||
        q.options[0].id !== "true" || q.options[1].id !== "false") {
      return [
        { id: "true", text: "True (Ano)", is_correct: (q.correct_answer || "true") === "true" },
        { id: "false", text: "False (Ne)", is_correct: (q.correct_answer || "true") === "false" },
      ];
    }
    return q.options;
  };

  const handleTypeChange = (newType: QuestionConfig["type"]) => {
    const updates: Partial<QuestionConfig> = { type: newType };
    if (newType === "true_false") {
      updates.options = initTrueFalseOptions();
      updates.correct_answer = q.correct_answer || "true";
    }
    updateQuestion(updates);
  };

  // Build go_to options: steps in this block + other blocks in course
  const otherBlocks = (courseBlocks || []).filter(b => b.block_id !== currentBlockId);

  const renderGoToSelect = (value: string | undefined, onChangeValue: (v: string | undefined) => void) => (
    <select
      value={value || ""}
      onChange={(e) => onChangeValue(e.target.value || undefined)}
      className="w-36 px-1 py-1 text-xs border border-gray-200 rounded"
      title="Navigation target"
    >
      <option value="">(none)</option>
      <optgroup label="Navigation">
        <option value="NEXT_STEP">NEXT_STEP</option>
        <option value="AGAIN">AGAIN</option>
        <option value="END">END</option>
      </optgroup>
      {allSteps.length > 0 && (
        <optgroup label="Steps">
          {allSteps.map(s => (
            <option key={s.id} value={s.id}>→ {s.id} ({s.type})</option>
          ))}
        </optgroup>
      )}
      {otherBlocks.length > 0 && (
        <optgroup label="Blocks">
          {otherBlocks.map(b => (
            <option key={b.block_id} value={b.block_id}>⬒ {b.block_id}</option>
          ))}
        </optgroup>
      )}
    </select>
  );

  return (
    <div className="space-y-4">
      {/* Question Type Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question Type
          </label>
          <select
            value={q.type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionConfig["type"])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {q.type === "open" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Očekávaná odpověď
            </label>
            {/* The AI reads this field for every open answer (BR-N26ACB); offline
                the app compares the answer against it instead, one variant per
                line (BR-RBUR29). The copy still follows the AI switch because
                that decides what the author should write: prose for feedback,
                short variants for a right/wrong. */}
            <textarea
              value={q.correct_answer || ""}
              onChange={(e) => updateQuestion({ correct_answer: e.target.value || undefined })}
              rows={3}
              placeholder={
                q.ai_evaluation
                  ? "Co má student vlastními slovy vystihnout"
                  : "Každá správná varianta na vlastní řádek, např.\n1/4\nčtvrtina"
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {q.ai_evaluation ? (
              <p className="text-xs text-gray-500 mt-1">
                Interní reference pro AI. Studentovi se <strong>nikdy</strong> nezobrazí —
                ani doslovně, ani parafrází.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Každou přijatelnou variantu napiš na <strong>samostatný řádek</strong>.
                Odpověď posoudí AI podle těchto variant; bez připojení se musí přesně
                shodovat s jedním z řádků (na velikosti písmen nezáleží).
                Studentovi se <strong>nikdy</strong> nezobrazí — uvidí jen správně/špatně
                a řešení.
              </p>
            )}

            {hasNoGradingBasis && (
              <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
                <p className="text-sm font-medium text-amber-900">
                  Bez opory pro vyhodnocení
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Otázka nemá očekávanou odpověď, vzorové řešení ani kritéria. AI bude
                  hodnotit jen obecnou věcnou správnost vůči zadání — což je v pořádku,
                  ale je dobré o tom vědět.
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={q.allow_photo || false}
                onChange={(e) => updateQuestion({ allow_photo: e.target.checked || undefined })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Povolit fotku</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Student může vyfotit řešení z papíru — místo textu nebo vedle něj. Když je
              vypnuto, možnost přiložit fotku se vůbec nezobrazí.
            </p>

            <label className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={q.ai_evaluation || false}
                onChange={(e) => updateQuestion({ ai_evaluation: e.target.checked || undefined })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Vyhodnocení AI</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Otevřenou odpověď vyhodnocuje AI vždy; bez připojení se porovná
              s očekávanou odpovědí. Tento přepínač určuje, co student uvidí: zapnuto —
              zpětnou vazbu AI ve třech částech (co je správně, co zlepšit a jeden krok
              dál); vypnuto — jen správně/špatně a řešení.
            </p>

            {q.ai_evaluation && (
              <div className="mt-3 rounded-md border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Kritéria hodnocení (volitelné)
                  </label>
                  <button
                    type="button"
                    onClick={addCriterion}
                    disabled={criteria.length >= MAX_CRITERIA}
                    className={cn(
                      "flex items-center gap-1 text-sm px-2 py-1 rounded-md",
                      criteria.length >= MAX_CRITERIA
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-blue-600 hover:bg-blue-50"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    Přidat ({criteria.length}/{MAX_CRITERIA})
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  Nadstavba nad očekávanou odpovědí, ne její náhrada. Když jsou vyplněná,
                  feedback jimi projde všemi — stále stručně.
                </p>

                {criteria.map((c, index) => (
                  <div key={c.id} className="mt-3 rounded-md bg-gray-50 p-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => updateCriterion(index, { name: e.target.value })}
                        placeholder="Název, např. Odolnost lesa"
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={c.weight}
                          onChange={(e) =>
                            updateCriterion(index, {
                              weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                            })
                          }
                          className="w-16 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                        />
                        <span className="text-xs text-gray-500">váha</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCriterion(index)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                        aria-label="Odebrat kritérium"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={c.description}
                      onChange={(e) => updateCriterion(index, { description: e.target.value })}
                      rows={2}
                      placeholder="Co přesně má student prokázat"
                      className="w-full mt-2 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                ))}

                {criteria.length > 0 && weightSum !== 100 && (
                  <p className="text-xs text-amber-700 mt-2">
                    Součet vah je {weightSum}, ne 100. Váhy jsou relativní, takže to
                    funguje i tak — jen se hůř čte, o kolik které kritérium váží víc.
                  </p>
                )}

                {/* BR-FFVVYR shipped criteria as one free-text field. Shown only
                    when a course still carries it, so authors can move it into
                    the structured form and stop maintaining two sources. */}
                {q.ai_criteria && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Starší kritéria (volný text)
                    </label>
                    <textarea
                      value={q.ai_criteria}
                      onChange={(e) => updateQuestion({ ai_criteria: e.target.value || undefined })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Pořád se posílá do AI. Přepiš je do kritérií výše a tohle pole
                      vymaž — dvojí zdroj pravdy hodnocení rozostřuje.
                    </p>
                  </div>
                )}
              </div>
            )}

            {q.ai_evaluation && (
              <div className="mt-3 rounded-md border border-gray-200 p-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={q.ai_guided || false}
                    onChange={(e) =>
                      updateQuestion({ ai_guided: e.target.checked || undefined })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    AI průvodce řešením
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Vysvětlení se neprozradí hned. Student dostane zpětnou vazbu,
                  pole zůstane otevřené a blok počká na další pokus. Řešení se
                  ukáže, až to student trefí — nebo až vyčerpá pokusy. V kvízu se
                  neuplatní, tam má student jeden pokus.
                </p>

                {q.ai_guided && (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-sm text-gray-700">Pokusů před prozrazením</label>
                    <input
                      type="number"
                      min={GUIDED_MIN_ATTEMPTS}
                      max={GUIDED_MAX_ATTEMPTS}
                      value={q.ai_guided_attempts ?? GUIDED_DEFAULT_ATTEMPTS}
                      onChange={(e) =>
                        updateQuestion({
                          ai_guided_attempts: clampGuidedAttempts(e.target.value),
                        })
                      }
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                )}

                {q.ai_guided && !q.solution?.trim() && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mt-2">
                    Otázka nemá vyplněné „Solution“, takže není co odhalovat —
                    student po posledním pokusu nedostane nic navíc. Doplň
                    vysvětlení, ať má smyčka kam dojít.
                  </p>
                )}

                {q.ai_guided && q.show_solution === false && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mt-2">
                    „Show Solution“ je vypnuté, takže se vysvětlení neukáže ani po
                    posledním pokusu. Průvodce pak jen povoluje opakované pokusy.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {q.type === "multiple_choice" && (
          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={q.allow_multiple || false}
                onChange={(e) => updateQuestion({ allow_multiple: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Allow multiple</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={q.show_answers !== false}
                onChange={(e) => updateQuestion({ show_answers: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Show answers</span>
            </label>
          </div>
        )}

        {/* True/false never shuffles (BR-K3D8MP) — Ano/Ne keep their position. */}
        {q.type === "multiple_choice" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zamíchat odpovědi
            </label>
            <select
              value={
                q.shuffle_options === undefined
                  ? "inherit"
                  : q.shuffle_options
                    ? "on"
                    : "off"
              }
              onChange={(e) =>
                updateQuestion({
                  shuffle_options:
                    e.target.value === "inherit"
                      ? undefined
                      : e.target.value === "on",
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="inherit">Dědit z kurzu</option>
              <option value="on">Zapnuto</option>
              <option value="off">Vypnuto</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Vypněte u otázek s možnostmi typu „všechny výše uvedené“.
            </p>
          </div>
        )}
      </div>

      {/* Multiple Choice Options */}
      {q.type === "multiple_choice" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Answer Options
            </label>
            <button
              onClick={addOption}
              className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Option
            </button>
          </div>

          {(q.options || []).map((option, index) => (
            <div
              key={option.id}
              className={cn(
                "p-3 rounded border space-y-2",
                option.is_correct
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200"
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={option.is_correct}
                  onChange={(e) => updateOption(index, { is_correct: e.target.checked })}
                  className="rounded border-gray-300"
                  title="Mark as correct answer"
                />
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => updateOption(index, { text: e.target.value })}
                  placeholder="Option text"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <button
                  onClick={() => removeOption(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 pl-6">
                <input
                  type="text"
                  value={option.feedback || ""}
                  onChange={(e) => updateOption(index, { feedback: e.target.value || undefined })}
                  placeholder="Feedback (markdown/LaTeX)"
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600"
                />
                <select
                  value={option.mark || ""}
                  onChange={(e) => updateOption(index, { mark: e.target.value || undefined })}
                  className="w-16 px-1 py-1 text-xs border border-gray-200 rounded"
                  title="Známka"
                >
                  <option value="">Mark</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
                <input
                  type="number"
                  value={option.score_koef ?? ""}
                  onChange={(e) => updateOption(index, { score_koef: e.target.value ? parseFloat(e.target.value) : undefined })}
                  step={0.1}
                  min={0}
                  max={1}
                  placeholder="Score"
                  className="w-16 px-1 py-1 text-xs border border-gray-200 rounded"
                  title="Score coefficient (0-1)"
                />
                {showGoTo && renderGoToSelect(option.go_to, (v) => updateOption(index, { go_to: v }))}
              </div>
            </div>
          ))}

          {(q.options || []).length === 0 && (
            <p className="text-sm text-gray-400 italic py-2">No options added yet</p>
          )}
        </div>
      )}

      {/* True/False Options */}
      {q.type === "true_false" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            True/False Options
          </label>
          {(q.options || initTrueFalseOptions()).map((option, index) => (
            <div
              key={option.id}
              className={cn(
                "p-3 rounded border space-y-2",
                option.is_correct
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200"
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`tf_correct_${q.type}`}
                  checked={option.is_correct}
                  onChange={() => {
                    const opts = q.options || initTrueFalseOptions();
                    const updated = opts.map((o, i) => ({ ...o, is_correct: i === index }));
                    updateQuestion({ options: updated, correct_answer: option.id });
                  }}
                  className="border-gray-300"
                  title="Mark as correct"
                />
                <span className="text-sm font-medium">{option.text}</span>
              </div>
              <div className="flex gap-2 pl-6">
                <input
                  type="text"
                  value={option.feedback || ""}
                  onChange={(e) => updateOption(index, { feedback: e.target.value || undefined })}
                  placeholder="Feedback (markdown/LaTeX)"
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded text-gray-600"
                />
                <select
                  value={option.mark || ""}
                  onChange={(e) => updateOption(index, { mark: e.target.value || undefined })}
                  className="w-16 px-1 py-1 text-xs border border-gray-200 rounded"
                  title="Známka"
                >
                  <option value="">Mark</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
                <input
                  type="number"
                  value={option.score_koef ?? ""}
                  onChange={(e) => updateOption(index, { score_koef: e.target.value ? parseFloat(e.target.value) : undefined })}
                  step={0.1}
                  min={0}
                  max={1}
                  placeholder="Score"
                  className="w-16 px-1 py-1 text-xs border border-gray-200 rounded"
                  title="Score coefficient (0-1)"
                />
                {showGoTo && renderGoToSelect(option.go_to, (v) => updateOption(index, { go_to: v }))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Numeric Question */}
      {q.type === "numeric" && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Numeric Answer
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Correct Number
              </label>
              <input
                type="number"
                value={q.correct_number ?? ""}
                onChange={(e) => updateQuestion({ correct_number: e.target.value !== "" ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g. 42"
                step="any"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tolerance (±)
              </label>
              <input
                type="number"
                value={q.tolerance ?? ""}
                onChange={(e) => updateQuestion({ tolerance: e.target.value !== "" ? parseFloat(e.target.value) : undefined })}
                placeholder="0"
                step="any"
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted range: {q.correct_number !== undefined ? `${q.correct_number - (q.tolerance || 0)} – ${q.correct_number + (q.tolerance || 0)}` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Solution */}
      <div className="pt-2 border-t border-gray-200 space-y-2">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={q.show_solution !== false}
              onChange={(e) => updateQuestion({ show_solution: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
          </label>
          <span className="text-sm font-medium text-gray-700">Show Solution</span>
        </div>
        {q.type === "open" && q.show_solution === false && !q.ai_evaluation && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
            Očekávaná odpověď se studentovi neukazuje, a bez řešení a bez
            „Vyhodnocení AI“ mu tak nezbyde nic než správně/špatně — zapni ho, ať
            dostane zpětnou vazbu, aniž bys řešení prozradil.
          </p>
        )}
        <MarkdownTextarea
          value={q.solution || ""}
          onChange={(v) => updateQuestion({ solution: v || undefined })}
          rows={3}
          label="Solution (shown after answering)"
          placeholder="Explain the correct answer here..."
        />
      </div>
    </div>
  );
}
