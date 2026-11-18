"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort error page of the App Router. It replaces the root layout, so it
 * renders its own <html>/<body> and styles itself inline. Next.js catches the
 * error before Sentry's global handlers would see it, so it is reported here.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="cs">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "16px",
          fontFamily: "system-ui, sans-serif",
          color: "#1f2937",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "20px", margin: 0 }}>Něco se pokazilo</h1>
        <p style={{ margin: 0, color: "#6b7280" }}>
          Chybu jsme zaznamenali. Zkuste stránku načíst znovu.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: "8px",
            background: "#7c3aed",
            color: "#fff",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Načíst znovu
        </button>
      </body>
    </html>
  );
}
