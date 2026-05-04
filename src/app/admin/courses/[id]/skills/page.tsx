"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Settings,
  Layers,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useCourse } from "@/hooks/useCourses";
import {
  useVectors,
  useCourseSkillConfig,
  useSaveCourseSkillConfig,
  useVectorDimensions,
} from "@/hooks/useSkills";
import { Button } from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import type {
  FormulaJson,
  SkillFormula,
  VectorDimension,
  SaveCourseSkillConfigInput,
} from "@/types/skills";

export default function CourseSkillConfigPage({
  params,
}: {
  params: { id: string };
}) {
  const courseId = parseInt(params.id);
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: config, isLoading: configLoading } =
    useCourseSkillConfig(courseId);
  const { data: vectors, isLoading: vectorsLoading } = useVectors();
  const saveConfig = useSaveCourseSkillConfig(courseId);

  const [selectedVectorId, setSelectedVectorId] = useState<string>("");
  const [formula, setFormula] = useState<FormulaJson>({});
  const [confidenceC, setConfidenceC] = useState(2.5);
  const [minCount, setMinCount] = useState(10);
  const [scaleMin, setScaleMin] = useState(1.0);
  const [scaleMax, setScaleMax] = useState(10.0);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize from existing config once loaded
  useEffect(() => {
    if (config) {
      setSelectedVectorId(config.vector_id);
      setFormula(config.formula_json);
      setConfidenceC(config.confidence_c);
      setMinCount(config.min_count);
      setScaleMin(config.display_scale_min);
      setScaleMax(config.display_scale_max);
    }
  }, [config]);

  // Load dimensions for selected vector
  const { data: dimensions } = useVectorDimensions(
    selectedVectorId || undefined
  );

  // Auto-generate default skills from dimensions (grouped by domain) when
  // dimensions load and formula is empty (new config, not existing)
  useEffect(() => {
    if (!dimensions || dimensions.length === 0) return;
    if (Object.keys(formula).length > 0) return; // already has skills
    if (config?.vector_id === selectedVectorId) return; // loaded from existing config

    const domainMap: Record<string, { name: string; dims: number[] }> = {};
    for (const dim of dimensions) {
      const key = dim.domain_code || "other";
      if (!domainMap[key]) {
        domainMap[key] = { name: dim.domain_name || key, dims: [] };
      }
      domainMap[key].dims.push(dim.dimension_index);
    }

    const generated: FormulaJson = {};
    for (const [, group] of Object.entries(domainMap)) {
      generated[group.name] = {
        dims: group.dims,
        weights: group.dims.map(() => 1),
      };
    }
    setFormula(generated);
  }, [dimensions, selectedVectorId, config?.vector_id]);

  const isLoading = courseLoading || configLoading || vectorsLoading;

  const sortedDimensions = useMemo(
    () =>
      [...(dimensions || [])].sort(
        (a, b) => a.dimension_index - b.dimension_index
      ),
    [dimensions]
  );

  // Skill management
  const [newSkillName, setNewSkillName] = useState("");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const addSkill = () => {
    const name = newSkillName.trim();
    if (!name || formula[name]) return;
    setFormula((prev) => ({
      ...prev,
      [name]: { dims: [], weights: [] },
    }));
    setNewSkillName("");
    setExpandedSkill(name);
  };

  const removeSkill = (name: string) => {
    setFormula((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (expandedSkill === name) setExpandedSkill(null);
  };

  const toggleDimension = useCallback(
    (skillName: string, dimIndex: number) => {
      setFormula((prev) => {
        const skill = prev[skillName];
        const idx = skill.dims.indexOf(dimIndex);
        const newDims = [...skill.dims];
        const newWeights = [...(skill.weights || [])];

        if (idx >= 0) {
          newDims.splice(idx, 1);
          newWeights.splice(idx, 1);
        } else {
          newDims.push(dimIndex);
          newWeights.push(1);
        }

        return {
          ...prev,
          [skillName]: { dims: newDims, weights: newWeights },
        };
      });
    },
    []
  );

  const updateWeight = useCallback(
    (skillName: string, dimIndex: number, weight: number) => {
      setFormula((prev) => {
        const skill = prev[skillName];
        const idx = skill.dims.indexOf(dimIndex);
        if (idx < 0) return prev;
        const newWeights = [...(skill.weights || skill.dims.map(() => 1))];
        newWeights[idx] = weight;
        return {
          ...prev,
          [skillName]: { ...skill, weights: newWeights },
        };
      });
    },
    []
  );

  const handleSave = async () => {
    if (!selectedVectorId) return;
    if (Object.keys(formula).length === 0) {
      alert("Přidejte alespoň jednu dovednost před uložením.");
      return;
    }
    const input: SaveCourseSkillConfigInput = {
      vector_id: selectedVectorId,
      formula_json: formula,
      confidence_c: confidenceC,
      min_count: minCount,
      display_scale_min: scaleMin,
      display_scale_max: scaleMax,
    };
    await saveConfig.mutateAsync(input);
  };

  if (isLoading) return <LoadingPage message="Načítám konfiguraci..." />;
  if (!course)
    return (
      <div className="text-center py-12 text-gray-500">Kurz nenalezen</div>
    );

  const skillNames = Object.keys(formula);
  const hasChanges = true; // simplified — always allow save

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kurzy
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {course.emoji && <span className="mr-2">{course.emoji}</span>}
              Dovednosti – {course.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Konfigurace vektoru a vzorců pro výpočet dovedností
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/courses/${courseId}/skills/overview`}>
              <Button variant="secondary" size="sm">
                <Eye className="w-4 h-4" />
                Přehled studentů
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              isLoading={saveConfig.isPending}
              disabled={!selectedVectorId}
            >
              <Save className="w-4 h-4" />
              Uložit
            </Button>
          </div>
        </div>
      </div>

      {/* Vector selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Vektor dovedností
          </label>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <Settings className="w-4 h-4" />
            Nastavení
          </button>
        </div>

        <select
          value={selectedVectorId}
          onChange={(e) => {
            setSelectedVectorId(e.target.value);
            // Formula will be auto-generated when dimensions load
            setFormula({});
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Vyberte vektor...</option>
          {vectors?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.dimension_count} dimenzí)
            </option>
          ))}
        </select>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Rozptyl jistoty (c)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="10"
                value={confidenceC}
                onChange={(e) => setConfidenceC(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Výchozí: 2.5, test: 5.0
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Min. počet úloh
              </label>
              <input
                type="number"
                min="1"
                value={minCount}
                onChange={(e) => setMinCount(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
              <p className="text-xs text-gray-400 mt-0.5">
                Min. úloh pro zobrazení dimenze
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Stupnice — min
              </label>
              <input
                type="number"
                step="0.5"
                value={scaleMin}
                onChange={(e) => setScaleMin(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Stupnice — max
              </label>
              <input
                type="number"
                step="0.5"
                value={scaleMax}
                onChange={(e) => setScaleMax(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Skills (dovednosti) editor */}
      {selectedVectorId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Dovednosti ({skillNames.length})
            </h2>
          </div>

          {/* Add skill */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
              placeholder="Název nové dovednosti (např. Zlomky)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              variant="secondary"
              onClick={addSkill}
              disabled={!newSkillName.trim() || !!formula[newSkillName.trim()]}
            >
              <Plus className="w-4 h-4" />
              Přidat
            </Button>
          </div>

          {/* Skills list */}
          {skillNames.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
              <p className="text-sm">
                Žádné dovednosti. Přidejte první dovednost a přiřaďte jí dimenze
                z vektoru.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {skillNames.map((skillName) => {
                const skill = formula[skillName];
                const isExpanded = expandedSkill === skillName;
                return (
                  <div
                    key={skillName}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    {/* Skill header */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        setExpandedSkill(isExpanded ? null : skillName)
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900 flex-1">
                        {skillName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {skill.dims.length} dimenzí
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSkill(skillName);
                        }}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Expanded: dimension picker */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-4 py-3">
                        <p className="text-xs text-gray-500 mb-2">
                          Vyberte dimenze a nastavte váhy pro výpočet této
                          dovednosti:
                        </p>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {sortedDimensions.map((dim) => {
                            const isSelected = skill.dims.includes(
                              dim.dimension_index
                            );
                            const weightIdx = skill.dims.indexOf(
                              dim.dimension_index
                            );
                            const weight =
                              weightIdx >= 0
                                ? (skill.weights?.[weightIdx] ?? 1)
                                : 1;

                            return (
                              <div
                                key={dim.id}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded ${
                                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    toggleDimension(
                                      skillName,
                                      dim.dimension_index
                                    )
                                  }
                                  className="rounded border-gray-300"
                                />
                                <span className="text-xs font-mono text-blue-600 w-12 shrink-0">
                                  {dim.code || dim.dimension_index}
                                </span>
                                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">
                                  {dim.name}
                                </span>
                                {isSelected && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <label className="text-xs text-gray-400">
                                      w:
                                    </label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="5"
                                      value={weight}
                                      onChange={(e) =>
                                        updateWeight(
                                          skillName,
                                          dim.dimension_index,
                                          parseFloat(e.target.value) || 1
                                        )
                                      }
                                      className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-xs text-center"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
