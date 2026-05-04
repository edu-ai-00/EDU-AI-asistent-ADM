"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "katex/dist/katex.min.css";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow KaTeX-rendered math classes/styles.
    span: [
      ...((defaultSchema.attributes && defaultSchema.attributes.span) || []),
      ["className", /^katex/, /^math/],
      "style",
    ],
    div: [
      ...((defaultSchema.attributes && defaultSchema.attributes.div) || []),
      ["className", /^katex/, /^math/],
    ],
  },
  tagNames: [
    ...((defaultSchema.tagNames as string[]) || []),
    "math",
    "semantics",
    "mrow",
    "mo",
    "mi",
    "mn",
    "msup",
    "msub",
    "mfrac",
    "annotation",
  ],
};

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  if (!content || content.trim() === "") {
    return (
      <div className={className}>
        <p className="text-gray-400 italic text-sm">No content to preview</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
