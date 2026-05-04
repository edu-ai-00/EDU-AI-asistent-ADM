"use client";

import { Upload } from "lucide-react";
import { useCallback } from "react";

interface FileUploaderProps {
  onFileLoad: (data: unknown, filename: string) => void;
}

export function FileUploader({ onFileLoad }: FileUploaderProps) {
  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          onFileLoad(json, file.name);
        } catch (err) {
          alert("Invalid JSON file");
          console.error(err);
        }
      };
      reader.readAsText(file);
    },
    [onFileLoad]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".json")) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
    >
      <input
        type="file"
        accept=".json"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700">
          Drop a JSON file here or click to upload
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Supports Course, Block, and Lecture formats
        </p>
      </label>
    </div>
  );
}
