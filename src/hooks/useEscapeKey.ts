"use client";

import { useEffect } from "react";

/**
 * The keydown listener behind {@link useEscapeKey} — kept separate so the
 * behaviour can be tested without a renderer.
 */
export function escapeListener(onEscape: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === "Escape") onEscape();
  };
}

/**
 * Close a modal with ESC (BR-96MNEE). `active` mirrors the window's own open
 * flag, so nothing is listening on the document while it is closed and two
 * stacked windows never both react to one press.
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handleEscape = escapeListener(onEscape);
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [active, onEscape]);
}
