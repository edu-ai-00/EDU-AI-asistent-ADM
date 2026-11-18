// node:test suite for notifications.ts (BR-QK6WW3). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_TEMPLATE_LIMITS,
  DEFAULT_WIDE_THRESHOLD,
  EMPTY_HISTORY_FILTERS,
  broadcastProgress,
  channelsLabel,
  collectPathErrors,
  collectTemplateErrors,
  extractTemplateVariables,
  flattenValidationErrors,
  formatDeadline,
  formatDuration,
  fromDateTimeLocalValue,
  historyQueryString,
  insertAtCursor,
  isWideTargeting,
  jsonErrorPosition,
  missingRequiredVariables,
  normalizeCatalogEvents,
  normalizeNotificationMeta,
  normalizeOperators,
  normalizeOptions,
  normalizeRecipientFields,
  offsetToLineColumn,
  pluralCs,
  reasonLabel,
  renderTemplatePreview,
  resolveTemplateLimits,
  ruleEventAndType,
  sameTargeting,
  sampleFieldsForEvent,
  schoolsWithoutSelectedClasses,
  statusLabel,
  targetingProblems,
  toDateTimeLocalValue,
  toggleTargetClassroom,
  toggleTargetRole,
  toggleTargetSchool,
  unknownTemplateVariables,
  warningText,
} from "./notifications.ts";

// ── Labels ───────────────────────────────────────────────────────────────────

test("labels fall back to the raw key and show a dash for nothing", () => {
  assert.equal(statusLabel("app_opened"), "Otevřena aplikace");
  assert.equal(reasonLabel("quiet_hours"), "Tiché hodiny");
  assert.equal(reasonLabel("brand_new_reason"), "brand_new_reason");
  assert.equal(statusLabel(null), "—");
  assert.equal(statusLabel(""), "—");
});

test("channels are listed push first whatever order the API sends", () => {
  assert.equal(channelsLabel(["feed", "push"]), "Push + Novinky");
  assert.equal(channelsLabel(["feed"]), "Novinky");
  assert.equal(channelsLabel([]), "—");
});

test("Czech plural picks one / few / many", () => {
  assert.equal(pluralCs(1, "příjemce", "příjemci", "příjemců"), "příjemce");
  assert.equal(pluralCs(3, "příjemce", "příjemci", "příjemců"), "příjemci");
  assert.equal(pluralCs(5, "příjemce", "příjemci", "příjemců"), "příjemců");
  assert.equal(pluralCs(0, "příjemce", "příjemci", "příjemců"), "příjemců");
});

// ── Templates ────────────────────────────────────────────────────────────────

test("template variables are found once each, in order, whitespace inside braces allowed", () => {
  assert.deepEqual(
    extractTemplateVariables("{{name}}, kurz {{ course_name }} – {{name}} {{course_code}}"),
    ["name", "course_name", "course_code"]
  );
  assert.deepEqual(extractTemplateVariables("Bez proměnných"), []);
  assert.deepEqual(extractTemplateVariables(null), []);
  assert.deepEqual(extractTemplateVariables("{{}} a {{ }}"), []);
});

test("a misspelt placeholder is reported as unknown, declared ones are not", () => {
  assert.deepEqual(
    unknownTemplateVariables(["{{title}}", "{{body}} {{tittle}}", null, "/course/{{course code}}"], [
      "title",
      "body",
    ]),
    ["tittle", "course code"]
  );
  assert.deepEqual(unknownTemplateVariables(["{{title}}"], ["title"]), []);
});

test("a required variable must appear in at least one of the templates", () => {
  const variables = [
    { key: "title", label: "Titulek", sample: "x", fallback: "y", required: true },
    { key: "body", label: "Text", sample: "x", fallback: "y", required: true },
    { key: "extra", label: "Navíc", sample: "x", fallback: "y", required: false },
  ];
  assert.deepEqual(missingRequiredVariables(["{{title}}", "Pevný text"], variables), ["body"]);
  assert.deepEqual(missingRequiredVariables(["{{title}}", "{{ body }}"], variables), []);
});

test("local render uses the value, then the fallback, and never leaves a raw placeholder", () => {
  const variables = [
    { key: "title", fallback: "Důležitá zpráva" },
    { key: "body", fallback: "Otevři aplikaci." },
  ];
  assert.equal(renderTemplatePreview("{{title}}", { title: "Výlet" }, variables), "Výlet");
  assert.equal(renderTemplatePreview("{{ title }}", { title: "  " }, variables), "Důležitá zpráva");
  assert.equal(renderTemplatePreview("{{body}} {{unknown}}!", {}, variables), "Otevři aplikaci. !");
  assert.equal(renderTemplatePreview("{{n}} dní", { n: 7 }), "7 dní");
  assert.equal(renderTemplatePreview(null, {}), "");
});

test("inserting a chip replaces the selection and puts the caret after it", () => {
  assert.deepEqual(insertAtCursor("Ahoj !", 5, 5, "{{name}}"), { text: "Ahoj {{name}}!", cursor: 13 });
  assert.deepEqual(insertAtCursor("Ahoj XXX", 5, 8, "{{name}}"), { text: "Ahoj {{name}}", cursor: 13 });
  // No caret known → append.
  assert.deepEqual(insertAtCursor("Ahoj ", null, null, "{{name}}"), { text: "Ahoj {{name}}", cursor: 13 });
  // Out-of-range selection is clamped.
  assert.deepEqual(insertAtCursor("ab", 10, 20, "X"), { text: "abX", cursor: 3 });
});

test("template limits accept the flat, the config and no shape at all", () => {
  assert.deepEqual(resolveTemplateLimits(undefined), DEFAULT_TEMPLATE_LIMITS);
  assert.deepEqual(resolveTemplateLimits({ push_title: 50, feed_body: "900" }), {
    ...DEFAULT_TEMPLATE_LIMITS,
    push_title: 50,
    feed_body: 900,
  });
  assert.deepEqual(
    resolveTemplateLimits({ push: { title_max: 60, body_max: 170 }, feed: { title_max: 100, body_max: 800 } }),
    { push_title: 60, push_body: 170, feed_title: 100, feed_body: 800 }
  );
  assert.deepEqual(resolveTemplateLimits({ push_title: -1, push_body: "x" }), DEFAULT_TEMPLATE_LIMITS);
});

// ── JSON editor ──────────────────────────────────────────────────────────────

test("offsets map to 1-based line and column", () => {
  const text = 'a\nbc\n"d"';
  assert.deepEqual(offsetToLineColumn(text, 0), { line: 1, column: 1 });
  assert.deepEqual(offsetToLineColumn(text, 3), { line: 2, column: 2 });
  assert.deepEqual(offsetToLineColumn(text, 5), { line: 3, column: 1 });
  assert.deepEqual(offsetToLineColumn(text, 999), { line: 3, column: 4 });
});

test("valid JSON has no error position", () => {
  for (const text of [
    "{}",
    "[]",
    '{"when":{"event":"course.completed"},"if":[],"then":{"type":"x","channels":["feed"],"delay_minutes":0}}',
    '  {\n  "a": [1, -2.5e3, true, false, null, "\\u00e1\\n"]\n}\n',
    '"jen řetězec"',
    "0",
  ]) {
    assert.equal(jsonErrorPosition(text), null, text);
  }
});

test("a missing comma is pinned to the line and column where the next key starts", () => {
  const text = '{\n  "when": {"event": "x"}\n  "if": []\n}';
  const err = jsonErrorPosition(text);
  assert.ok(err);
  assert.equal(err.line, 3);
  assert.equal(err.column, 3);
  assert.match(err.message, /čárka/);
});

test("a trailing comma points at the comma itself", () => {
  const text = '{\n  "if": [1, 2,]\n}';
  const err = jsonErrorPosition(text);
  assert.ok(err);
  assert.deepEqual([err.line, err.column], [2, 14]);
  assert.match(err.message, /Přebytečná čárka/);
});

test("single quotes, unquoted keys, unterminated strings and garbage after the end are all located", () => {
  const single = jsonErrorPosition("{'a': 1}");
  assert.deepEqual([single.line, single.column], [1, 2]);

  const unquoted = jsonErrorPosition('{\n  when: {}\n}');
  assert.deepEqual([unquoted.line, unquoted.column], [2, 3]);
  assert.match(unquoted.message, /dvojitých uvozovkách/);

  const unterminated = jsonErrorPosition('{\n  "a": "abc\n}');
  // Pinned to the end of the line the string runs off.
  assert.deepEqual([unterminated.line, unterminated.column], [2, 12]);

  const trailing = jsonErrorPosition('{"a": 1} x');
  assert.deepEqual([trailing.line, trailing.column], [1, 10]);

  const truncated = jsonErrorPosition('{"a": [1, 2');
  assert.ok(truncated);
  assert.equal(truncated.offset, 11);
});

test("empty input and bad numbers are errors", () => {
  assert.match(jsonErrorPosition("   ").message, /prázdný/);
  assert.ok(jsonErrorPosition("01"));
  assert.ok(jsonErrorPosition("1."));
  assert.ok(jsonErrorPosition("-"));
  assert.ok(jsonErrorPosition('"tab\tinside"'));
});

test("the scanner agrees with JSON.parse on every sample", () => {
  const samples = [
    "{",
    "}",
    "[1,]",
    '{"a":}',
    '{"a" 1}',
    "nul",
    "truex",
    '"\\x"',
    '"\\u12"',
    "[1 2]",
    '{"a":1,}',
    "1e",
    "-0.5E+2",
    '[{"a":[{}]}]',
    "﻿{}",
  ];
  for (const text of samples) {
    let valid = true;
    try {
      JSON.parse(text);
    } catch {
      valid = false;
    }
    assert.equal(jsonErrorPosition(text) === null, valid, JSON.stringify(text));
  }
});

// ── Rules ────────────────────────────────────────────────────────────────────

test("event and type are read from any parsed definition", () => {
  assert.deepEqual(ruleEventAndType({ when: { event: "goal.completed" }, then: { type: "goal_completed" } }), {
    event: "goal.completed",
    type: "goal_completed",
  });
  assert.deepEqual(ruleEventAndType([]), { event: null, type: null });
  assert.deepEqual(ruleEventAndType({ when: "x" }), { event: null, type: null });
});

test("sample fields take the first enum value, 1 for ints and the label for strings", () => {
  assert.deepEqual(
    sampleFieldsForEvent({
      key: "activation.daily",
      label: "",
      description: null,
      dedup: null,
      recipient: null,
      fields: {
        suggestion: { type: "enum", label: "Návrh", enum: ["quiz", "practice"], required: true },
        due_count: { type: "int", label: "Počet", required: true },
        game_name: { type: "string", label: "Hra", required: false },
      },
    }),
    { suggestion: "quiz", due_count: 1, game_name: "Hra" }
  );
  assert.deepEqual(sampleFieldsForEvent(null), {});
});

// ── Catalog normalisation ────────────────────────────────────────────────────

test("catalog events come from a list or a keyed map, fields from a map or a list", () => {
  const fromList = normalizeCatalogEvents([
    {
      key: "course.completed",
      label: "Dokončení kurzu",
      fields: { course_id: { type: "int", label: "ID kurzu", required: true } },
      dedup: "course_completed:{course_id}",
    },
  ]);
  assert.equal(fromList.length, 1);
  assert.equal(fromList[0].key, "course.completed");
  assert.equal(fromList[0].fields.course_id.type, "int");
  assert.equal(fromList[0].dedup, "course_completed:{course_id}");
  assert.equal(fromList[0].recipient, null);

  const fromMap = normalizeCatalogEvents({
    "goal.completed": {
      label: "Cíl",
      fields: [{ name: "period", type: "enum", enum: ["daily", "weekly"] }, "xp"],
    },
  });
  assert.equal(fromMap[0].key, "goal.completed");
  assert.deepEqual(fromMap[0].fields.period.enum, ["daily", "weekly"]);
  assert.equal(fromMap[0].fields.period.required, true);
  assert.equal(fromMap[0].fields.xp.label, "xp");

  assert.deepEqual(normalizeCatalogEvents(null), []);
});

test("recipient fields come from a list or a map, and are none when absent", () => {
  const fromList = normalizeRecipientFields([
    { name: "user.xp", type: "int", label: "Celkové XP příjemce", description: "Všechna získaná XP.", required: true },
  ]);
  assert.equal(fromList.length, 1);
  assert.equal(fromList[0].name, "user.xp");
  assert.equal(fromList[0].type, "int");
  assert.equal(fromList[0].description, "Všechna získaná XP.");

  const fromMap = normalizeRecipientFields({ "user.xp": { type: "int", label: "XP" } });
  assert.equal(fromMap[0].name, "user.xp");
  assert.equal(fromMap[0].description, null);

  // An API build without the recipient catalog simply offers nothing.
  assert.deepEqual(normalizeRecipientFields(undefined), []);
  assert.deepEqual(normalizeNotificationMeta({}).recipientFields, []);
});

test("options accept keys, objects and maps, labelled from the fallback map", () => {
  const labels = { push: "Push", feed: "Novinky" };
  assert.deepEqual(normalizeOptions(["push", "feed"], labels), [
    { value: "push", label: "Push" },
    { value: "feed", label: "Novinky" },
  ]);
  assert.deepEqual(normalizeOptions([{ key: "push", label: "Notifikace" }], labels), [
    { value: "push", label: "Notifikace" },
  ]);
  assert.deepEqual(normalizeOptions({ feed: "Feed" }, labels), [{ value: "feed", label: "Feed" }]);
  assert.deepEqual(normalizeOptions([{ path: "/dash", label: "Přehled" }]), [{ value: "/dash", label: "Přehled" }]);
});

test("operators grouped by field type are merged, and missing ones fall back to the contract's eight", () => {
  const grouped = normalizeOperators({ int: ["eq", "gt"], string: ["eq", "in"] });
  assert.deepEqual(
    grouped.map((o) => [o.value, o.types]),
    [
      ["eq", ["int", "string"]],
      ["gt", ["int"]],
      ["in", ["string"]],
    ]
  );
  assert.equal(normalizeOperators(undefined).length, 8);
  assert.equal(normalizeOperators({ eq: "je rovno" })[0].label, "je rovno");
});

test("meta normalisation finds limits and the wide threshold wherever they sit", () => {
  const meta = normalizeNotificationMeta({
    events: [],
    operators: null,
    categories: ["provoz"],
    roles: ["student", "all"],
    channels: ["push", "feed"],
    deep_links: [{ path: "/dash", label: "Přehled" }],
    limits: { push: { title_max: 60 } },
    defaults: { broadcast: { wide_threshold: 150 } },
  });
  assert.equal(meta.limits.push_title, 60);
  assert.equal(meta.limits.feed_body, 1000);
  assert.equal(meta.wideThreshold, 150);
  assert.deepEqual(meta.categories, [{ value: "provoz", label: "Provoz" }]);
  assert.deepEqual(meta.deepLinks, [{ path: "/dash", label: "Přehled" }]);

  const bare = normalizeNotificationMeta({
    events: [],
    operators: [],
    categories: [],
    roles: [],
    channels: [],
    deep_links: [],
    limits: null,
    defaults: null,
  });
  assert.equal(bare.wideThreshold, DEFAULT_WIDE_THRESHOLD);
});

// ── Validation errors ────────────────────────────────────────────────────────

test("definition errors come from objects, plain strings and dotted keys", () => {
  const payload = {
    message: "Neplatná definice",
    errors: {
      definition: [
        { path: "if[0].field", message: "Pole „foo“ událost course.completed nemá." },
        { path: "$", message: "Neplatný JSON", line: 3, column: 5 },
        "Definice je povinná.",
      ],
      "definition.then.type": ["Typ neexistuje."],
      name: ["Název je povinný."],
    },
  };
  assert.deepEqual(collectPathErrors(payload), [
    { path: "if[0].field", message: "Pole „foo“ událost course.completed nemá." },
    { path: "$", message: "Neplatný JSON", line: 3, column: 5 },
    { path: "$", message: "Definice je povinná." },
    { path: "then.type", message: "Typ neexistuje." },
  ]);
  assert.deepEqual(flattenValidationErrors(payload, ["definition"]), ["Název je povinný."]);
  assert.deepEqual(collectPathErrors(undefined), []);
});

test("template errors are read from errors.templates", () => {
  const payload = {
    errors: {
      templates: [{ template: "push_title", code: "too_long", message: "Titulek je delší než 65 znaků." }],
      channels: ["Vyberte alespoň jeden kanál."],
    },
  };
  assert.deepEqual(collectTemplateErrors(payload), [
    { template: "push_title", code: "too_long", message: "Titulek je delší než 65 znaků." },
  ]);
  assert.deepEqual(flattenValidationErrors(payload, ["templates"]), ["Vyberte alespoň jeden kanál."]);
  assert.deepEqual(collectTemplateErrors({}), []);
});

test("warnings are shown as text whatever their shape", () => {
  assert.equal(warningText("Pozor"), "Pozor");
  assert.equal(warningText({ code: "x", message: "Zpráva" }), "Zpráva");
  assert.equal(warningText({ code: "jen_kod" }), "jen_kod");
});

// ── Broadcast targeting ──────────────────────────────────────────────────────

const base = { school_ids: [1, 2], classroom_ids: [11, 21], roles: ["student"] };

test("whole schools are always wide; picked classes are wide only from the threshold up", () => {
  assert.equal(isWideTargeting({ classroom_ids: [] }), true);
  assert.equal(isWideTargeting({ classroom_ids: [11] }, 30), false);
  assert.equal(isWideTargeting({ classroom_ids: [11] }, 200), true);
  assert.equal(isWideTargeting({ classroom_ids: [11] }, 120, 100), true);
  assert.equal(isWideTargeting({ classroom_ids: [11] }), false);
});

test("leaving a school drops its classes; joining one keeps the picked classes", () => {
  assert.deepEqual(toggleTargetSchool(base, 2, [21, 22]), {
    school_ids: [1],
    classroom_ids: [11],
    roles: ["student"],
  });
  assert.deepEqual(toggleTargetSchool(base, 3, [31]), {
    school_ids: [1, 2, 3],
    classroom_ids: [11, 21],
    roles: ["student"],
  });
});

test("classes and roles toggle; roles stay in student-teacher order", () => {
  assert.deepEqual(toggleTargetClassroom(base, 11).classroom_ids, [21]);
  assert.deepEqual(toggleTargetClassroom(base, 12).classroom_ids, [11, 21, 12]);
  assert.deepEqual(toggleTargetRole({ ...base, roles: ["teacher"] }, "student").roles, ["student", "teacher"]);
  assert.deepEqual(toggleTargetRole(base, "student").roles, []);
});

test("a selected school with no picked class is flagged once any class is picked", () => {
  const bySchool = new Map([
    [1, [11, 12]],
    [2, [21]],
    [3, [31]],
  ]);
  assert.deepEqual(schoolsWithoutSelectedClasses({ ...base, school_ids: [1, 2, 3] }, bySchool), [3]);
  assert.deepEqual(schoolsWithoutSelectedClasses({ ...base, classroom_ids: [] }, bySchool), []);
});

test("targeting needs a school and a role", () => {
  assert.deepEqual(targetingProblems(base), []);
  assert.equal(targetingProblems({ school_ids: [], classroom_ids: [], roles: [] }).length, 2);
});

test("targeting equality ignores order", () => {
  assert.equal(
    sameTargeting(base, { school_ids: [2, 1], classroom_ids: [21, 11], roles: ["student"] }),
    true
  );
  assert.equal(sameTargeting(base, { ...base, roles: ["student", "teacher"] }), false);
});

test("progress is processed over recipients, capped and safe for zero", () => {
  assert.deepEqual(broadcastProgress({ processed_count: 50, recipient_count: 200 }), {
    processed: 50,
    total: 200,
    percent: 25,
  });
  assert.equal(broadcastProgress({ processed_count: 0, recipient_count: 0 }).percent, 0);
  assert.equal(broadcastProgress({ processed_count: 300, recipient_count: 200 }).percent, 100);
});

// ── Dates, durations, query strings ──────────────────────────────────────────

test("datetime-local values round-trip through ISO", () => {
  const local = "2026-10-20T08:30";
  const iso = fromDateTimeLocalValue(local);
  assert.ok(iso);
  assert.equal(toDateTimeLocalValue(iso), local);
  assert.equal(fromDateTimeLocalValue(""), null);
  assert.equal(fromDateTimeLocalValue("nonsense"), null);
  assert.equal(toDateTimeLocalValue(null), "");
});

test("deadlines read like the catalog's d. m. Y H:i, in local time", () => {
  assert.equal(formatDeadline(new Date(2026, 9, 20, 8, 5)), "20. 10. 2026 08:05");
  assert.equal(formatDeadline(fromDateTimeLocalValue("2026-01-02T23:45")), "2. 1. 2026 23:45");
  assert.equal(formatDeadline(null), "");
  assert.equal(formatDeadline("nonsense"), "");
});

test("queue ages read as seconds, minutes, hours or days", () => {
  assert.equal(formatDuration(45), "45 s");
  assert.equal(formatDuration(720), "12 min");
  assert.equal(formatDuration(7500), "2 h 5 min");
  assert.equal(formatDuration(7200), "2 h");
  assert.equal(formatDuration(3 * 86400 + 4 * 3600), "3 d 4 h");
  assert.equal(formatDuration(null), "—");
});

test("history query string keeps only set filters plus paging", () => {
  assert.equal(historyQueryString(EMPTY_HISTORY_FILTERS), "");
  assert.equal(
    historyQueryString(
      { ...EMPTY_HISTORY_FILTERS, user_id: "42", result: "suppressed", is_test: "0", type: " " },
      { page: 2, per_page: 50 }
    ),
    "?user_id=42&result=suppressed&is_test=0&page=2&per_page=50"
  );
});
