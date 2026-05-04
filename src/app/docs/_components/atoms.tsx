"use client";

import * as React from "react";

// ============================================================================
// Code Block Component
// ============================================================================
export function CodeBlock({ code, language = "typescript" }: { code: string; language?: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
      <code>{code}</code>
    </pre>
  );
}

// ============================================================================
// Table Component
// ============================================================================
export function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-sm text-gray-700 border-b">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Info Box Component
// ============================================================================
export function InfoBox({
  type,
  children,
}: {
  type: "info" | "warning" | "tip";
  children: React.ReactNode;
}) {
  const colors = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    tip: "bg-green-50 border-green-200 text-green-800",
  };
  const icons = {
    info: "i",
    warning: "!",
    tip: "*",
  };
  return (
    <div className={`border-l-4 p-4 rounded-r-lg ${colors[type]}`}>
      <span className="font-bold mr-2">[{icons[type]}]</span>
      {children}
    </div>
  );
}
