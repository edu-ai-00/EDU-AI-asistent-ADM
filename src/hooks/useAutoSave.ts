import { useEffect, useRef, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { UseMutationResult } from "@tanstack/react-query";

interface UseAutoSaveOptions<T> {
  data: T;
  mutation: UseMutationResult<unknown, unknown, T, unknown>;
  debounceMs?: number;
  enabled?: boolean;
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: unknown) => void;
}

export function useAutoSave<T>({
  data,
  mutation,
  debounceMs = 2000,
  enabled = true,
  onSaveStart,
  onSaveComplete,
  onSaveError,
}: UseAutoSaveOptions<T>) {
  const previousDataRef = useRef<string>("");
  const isFirstRender = useRef(true);

  const save = useCallback(async () => {
    if (!enabled) return;

    onSaveStart?.();
    try {
      await mutation.mutateAsync(data);
      onSaveComplete?.();
    } catch (error) {
      onSaveError?.(error);
    }
  }, [data, mutation, enabled, onSaveStart, onSaveComplete, onSaveError]);

  const debouncedSave = useDebouncedCallback(save, debounceMs);

  useEffect(() => {
    if (!enabled) return;

    // Serialize data for comparison
    const serialized = JSON.stringify(data);

    // Skip first render to avoid immediate save on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousDataRef.current = serialized;
      return;
    }

    // Only save if data has changed
    if (serialized !== previousDataRef.current) {
      previousDataRef.current = serialized;
      debouncedSave();
    }
  }, [data, enabled, debouncedSave]);

  // Cancel pending saves on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    isSaving: mutation.isPending,
    saveError: mutation.error,
    saveNow: save,
    cancel: debouncedSave.cancel,
  };
}
