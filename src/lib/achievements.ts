/**
 * Achievement metadata — mirror of the Flutter app's gamification config
 * (`eduai-app/lib/models/gamification_config_model.dart`).
 *
 * The API only stores `achievement_id` + `earned_at` (table `user_achievements`);
 * the human label / XP reward / icon live in the app config, so we duplicate
 * them here to render a readable breakdown in admin. Keep in sync with the app.
 */

export type AchievementCategory = "trophy" | "goal" | "challenge";

export interface AchievementMeta {
  label: string;
  xpReward: number;
  icon: string; // emoji
  category: AchievementCategory;
}

export const ACHIEVEMENT_META: Record<string, AchievementMeta> = {
  // ── Trophies ──
  trophy_first_lesson: { label: "První lekce", xpReward: 25, icon: "🏆", category: "trophy" },
  trophy_five_lessons: { label: "Pilný student", xpReward: 50, icon: "📚", category: "trophy" },
  trophy_first_quiz: { label: "Kvízový nováček", xpReward: 30, icon: "🧠", category: "trophy" },
  trophy_first_course: { label: "Mistrovský kousek", xpReward: 100, icon: "🧬", category: "trophy" },
  trophy_week_streak: { label: "Týdenní série", xpReward: 50, icon: "🔥", category: "trophy" },
  trophy_month_streak: { label: "Měsíční série", xpReward: 150, icon: "💪", category: "trophy" },
  // ── Goals ──
  goal_xp_100: { label: "Získat 100 XP", xpReward: 10, icon: "⚡", category: "goal" },
  goal_xp_500: { label: "Získat 500 XP", xpReward: 50, icon: "⚡", category: "goal" },
  goal_xp_1000: { label: "Získat 1000 XP", xpReward: 100, icon: "⚡", category: "goal" },
  goal_streak_3: { label: "Série 3 dní", xpReward: 15, icon: "🔥", category: "goal" },
  goal_streak_14: { label: "Série 14 dní", xpReward: 70, icon: "🔥", category: "goal" },
  goal_level_3: { label: "Dosáhnout úrovně 3", xpReward: 50, icon: "⭐", category: "goal" },
  goal_lessons_10: { label: "Dokonči 10 lekcí", xpReward: 60, icon: "📚", category: "goal" },
  // ── Challenges ──
  challenge_xp_5000: { label: "Získat 5000 XP", xpReward: 500, icon: "💎", category: "challenge" },
  challenge_courses_3: { label: "Dokonči 3 kurzy", xpReward: 200, icon: "🚀", category: "challenge" },
  challenge_streak_60: { label: "Série 60 dní", xpReward: 300, icon: "🌋", category: "challenge" },
};

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  trophy: "Trofej",
  goal: "Cíl",
  challenge: "Výzva",
};

export function getAchievementMeta(id: string): AchievementMeta {
  return (
    ACHIEVEMENT_META[id] ?? {
      label: id,
      xpReward: 0,
      icon: "🎖️",
      category: "trophy",
    }
  );
}
