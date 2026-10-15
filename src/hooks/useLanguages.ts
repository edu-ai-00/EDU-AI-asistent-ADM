import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Language } from "@/types/api";

const LANGUAGES_KEY = ["languages"];

/**
 * The shared language catalogue (BR-AYACEK).
 *
 * Course uploads validate `language` against this list, so every language
 * picker in the admin must read from here rather than offering free text.
 * Pass `includeInactive` where a course may still be labelled with a language
 * that has since been retired.
 */
export function useLanguages(includeInactive = false) {
  return useQuery({
    queryKey: [...LANGUAGES_KEY, { includeInactive }],
    queryFn: () =>
      api.get<Language[]>(includeInactive ? "/languages?all=1" : "/languages"),
    // The catalogue changes about as often as a new market opens.
    staleTime: 60 * 60 * 1000,
  });
}

/** Display label for a language code, falling back to the raw code. */
export function languageLabel(
  code: string | null | undefined,
  languages: Language[] | undefined,
): string {
  if (!code) return "—";
  return languages?.find((l) => l.code === code)?.native_name ?? code.toUpperCase();
}
