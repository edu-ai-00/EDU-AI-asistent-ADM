"use client";

import { MarkdownTextarea } from "@/components/MarkdownTextarea";

interface TextStepEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function TextStepEditor({ content, onChange }: TextStepEditorProps) {
  return (
    <MarkdownTextarea
      value={content}
      onChange={onChange}
      rows={6}
      label="Content (Markdown/HTML)"
      placeholder="Enter the content (supports Markdown, HTML, and LaTeX)..."
    />
  );
}
