"use client";

import { useState } from "react";
import Link from "next/link";

import { navigation, type SectionId } from "./_lib/navigation";
import { Overview } from "./_sections/Overview";
import { Changelog } from "./_sections/Changelog";
import { V1Format } from "./_sections/V1Format";
import { V2FormatPart1 } from "./_sections/V2FormatPart1";
import { V2FormatPart2 } from "./_sections/V2FormatPart2";
import { Comparison } from "./_sections/Comparison";
import { ImportExport } from "./_sections/ImportExport";

// ============================================================================
// Main Documentation Component
// ============================================================================
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              &larr; Zpet do editoru
            </Link>
            <h1 className="text-xl font-bold text-gray-800">
              Dokumentace JSON Formatu
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/docs/design-tokens.html"
              target="_blank"
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Design Tokens &rarr;
            </Link>
            <span className="text-sm text-gray-500">EduAI Admin v2.0</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 flex-shrink-0 bg-white border-r border-gray-200 h-[calc(100vh-65px)] sticky top-[65px] overflow-y-auto">
          <div className="p-4 space-y-1">
            {navigation.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === item.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </button>
                {item.children && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => scrollToSection(child.id)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          activeSection === child.id
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8 space-y-12">
          <Overview />
          <Changelog />
          <V1Format />
          <V2FormatPart1 />
          <V2FormatPart2 />
          <Comparison />
          <ImportExport />

          {/* Footer */}
          <footer className="border-t border-gray-200 pt-8 mt-12">
            <p className="text-gray-500 text-sm">
              Dokumentace JSON Formatu &bull; EduAI Admin v2.0 &bull; Posledni
              aktualizace: Unor 2026
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
