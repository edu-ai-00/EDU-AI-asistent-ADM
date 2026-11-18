// Which state a loaded list renders (BR-DN8BWW).
//
// A failed request is not an empty result: when the data never arrived, the
// page has to say the load failed instead of claiming there is nothing to
// show. Rows from an earlier load that are still on screen stay there, with
// the error above them.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight off this file.

export interface ListLoadState {
  /** The query is running. */
  isLoading: boolean;
  /** The last attempt failed. */
  hasError: boolean;
  /** A payload is in hand — this load's, or an earlier one still on screen. */
  hasData: boolean;
  /** Rows in that payload. */
  rowCount: number;
}

export interface ListView {
  /** What goes where the list belongs. */
  body: "loading" | "error" | "empty" | "list";
  /** Whether to show the error above the body — the rows below it are stale. */
  inlineError: boolean;
}

/** The state to render for a list query. */
export function listView(state: ListLoadState): ListView {
  if (state.isLoading && !state.hasData) return { body: "loading", inlineError: false };
  if (state.hasError && !state.hasData) return { body: "error", inlineError: false };
  return {
    body: state.rowCount === 0 ? "empty" : "list",
    inlineError: state.hasError,
  };
}
