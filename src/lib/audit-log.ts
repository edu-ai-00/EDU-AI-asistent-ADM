// Czech labels for the unified audit log (BR-BNNASY). The API keeps adding
// action keys, so every lookup falls back to the raw key rather than hiding an
// entry the map does not know yet.

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "classroom.created": "Třída vytvořena",
  "classroom.updated": "Třída upravena",
  "classroom.deleted": "Třída smazána",
  "classroom.students_added": "Žáci přidáni do třídy",
  "classroom.teachers_changed": "Změna učitelů třídy",
  "classroom.join_code_changed": "Změna kódu třídy",
  "classroom.courses_assigned": "Kurzy přiřazeny třídě",
  "classroom.course_removed": "Kurz odebrán ze třídy",
  "classroom.joined": "Připojení do třídy",

  "school.created": "Škola vytvořena",
  "school.updated": "Škola upravena",
  "school.deleted": "Škola smazána",
  "school.teachers_changed": "Změna učitelů školy",
  "school.classrooms_changed": "Změna tříd školy",

  "user.invited": "Uživatel pozván",
  "user.invite_resent": "Pozvánka odeslána znovu",
  "user.invite_accepted": "Pozvánka přijata",
  "user.updated": "Uživatel upraven",
  "user.role_changed": "Změna role uživatele",
  "user.classrooms_changed": "Změna tříd uživatele",
  "user.schools_changed": "Změna škol uživatele",
  "user.teaching_classrooms_changed": "Změna tříd, které uživatel učí",
  "user.merged": "Uživatelé sloučeni",
  "user.deleted": "Uživatel smazán",

  "course.published": "Kurz publikován",
  "course.unpublished": "Kurz stažen z publikace",
  "course.deleted": "Kurz smazán",
  "course.restored": "Kurz obnoven",

  "export.activity": "Export aktivity",
  "export.course_answers": "Export odpovědí z kurzu",
  "export.elo_interactions": "Export ELO dat",
  "export.audit_log": "Export audit logu",

  "consent.requested": "Vyžádán souhlas rodiče",
  "consent.confirmed": "Souhlas potvrzen",
  "consent.failed_attempt": "Neúspěšný pokus o potvrzení souhlasu",
  "consent.codes_sent": "Kódy pro souhlas odeslány",
  "consent.code_regenerated": "Kód pro souhlas vygenerován znovu",
  "consent.revoked": "Souhlas odvolán",
  "consent.superseded": "Souhlas nahrazen novějším",
  "consent.purged": "Data souhlasu smazána",
  "consent.link_sent": "Odkaz k souhlasu odeslán",
  "consent.link_opened": "Odkaz k souhlasu otevřen",
  "consent.mail_failed": "E-mail k souhlasu se nepodařilo doručit",
  "consent.overview_sent": "Přehled odeslán rodiči",
  "consent.children_provisioned": "Dětské účty založeny",
  "consent.provision_failed": "Založení dětských účtů selhalo",
};

/** The part before the first dot, e.g. `classroom` — what a `prefix.*` filter matches. */
export const AUDIT_ACTION_GROUP_LABELS: Record<string, string> = {
  classroom: "Třídy",
  school: "Školy",
  user: "Uživatelé",
  course: "Kurzy",
  export: "Exporty",
  consent: "Souhlasy rodičů",
};

export const AUDIT_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Učitel",
  student: "Student",
  guardian: "Rodič/zákonný zástupce",
  api_key: "API klíč",
  system: "Systém",
};

export const AUDIT_SOURCE_LABELS: Record<string, string> = {
  admin: "Administrace",
  self_service: "Samoobsluha",
  system: "Systém",
};

export const AUDIT_OUTCOME_LABELS: Record<string, string> = {
  success: "Provedeno",
  denied: "Zamítnuto",
};

export const AUDIT_TARGET_TYPE_LABELS: Record<string, string> = {
  user: "Uživatel",
  classroom: "Třída",
  school: "Škola",
  course: "Kurz",
  consent: "Souhlas",
};

function labelOr(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key;
}

export const auditActionLabel = (key: string) => labelOr(AUDIT_ACTION_LABELS, key);
export const auditRoleLabel = (key: string | null) => labelOr(AUDIT_ROLE_LABELS, key);
export const auditSourceLabel = (key: string | null) => labelOr(AUDIT_SOURCE_LABELS, key);
export const auditOutcomeLabel = (key: string | null) => labelOr(AUDIT_OUTCOME_LABELS, key);
export const auditTargetTypeLabel = (key: string | null) => labelOr(AUDIT_TARGET_TYPE_LABELS, key);

function actionGroup(key: string): string {
  const dot = key.indexOf(".");
  return dot === -1 ? key : key.slice(0, dot);
}

/** A human label for an action filter value, including `prefix.*` groups. */
export function auditActionFilterLabel(value: string): string {
  if (value.endsWith(".*")) {
    const group = value.slice(0, -2);
    return `${AUDIT_ACTION_GROUP_LABELS[group] ?? group} (vše)`;
  }
  return auditActionLabel(value);
}

export interface AuditActionOptionGroup {
  group: string;
  label: string;
  /** First option is always the `group.*` wildcard. */
  options: { value: string; label: string }[];
}

const KNOWN_ACTION_ORDER = Object.keys(AUDIT_ACTION_LABELS);
const KNOWN_GROUP_ORDER = Object.keys(AUDIT_ACTION_GROUP_LABELS);

function orderOf(list: string[], key: string): number {
  const i = list.indexOf(key);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/**
 * Action filter options, grouped by prefix: `Třídy (vše)` = `classroom.*`
 * first, then each action of that group. Known keys keep the label map's
 * order; keys the map does not know yet sort alphabetically after them.
 */
export function buildAuditActionOptions(actions: string[]): AuditActionOptionGroup[] {
  const byGroup = new Map<string, string[]>();
  for (const key of Array.from(new Set(actions))) {
    if (!key) continue;
    const group = actionGroup(key);
    const list = byGroup.get(group) ?? [];
    list.push(key);
    byGroup.set(group, list);
  }

  const byKnownThenAlpha = (order: string[]) => (a: string, b: string) =>
    orderOf(order, a) - orderOf(order, b) || a.localeCompare(b);

  return Array.from(byGroup.keys())
    .sort(byKnownThenAlpha(KNOWN_GROUP_ORDER))
    .map((group) => {
      const label = AUDIT_ACTION_GROUP_LABELS[group] ?? group;
      const keys = byGroup.get(group)!.sort(byKnownThenAlpha(KNOWN_ACTION_ORDER));
      return {
        group,
        label,
        options: [
          { value: `${group}.*`, label: `${label} (vše)` },
          ...keys.map((key) => ({ value: key, label: auditActionLabel(key) })),
        ],
      };
    });
}
