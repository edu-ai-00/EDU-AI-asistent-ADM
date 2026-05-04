"use client";

import type { StepAudio } from "@/types/block-v2";

export interface AudioStepEditorProps {
  audio?: StepAudio;
  onChange: (audio: StepAudio | undefined) => void;
}

export function AudioStepEditor({ audio, onChange }: AudioStepEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={audio?.url || ""}
          onChange={(e) => {
            if (!e.target.value) {
              onChange(undefined);
            } else {
              onChange({ url: e.target.value });
            }
          }}
          placeholder="https://example.com/audio.mp3"
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
        />
      </div>

      {audio?.url && (
        <audio
          src={audio.url}
          controls
          className="w-full rounded"
        />
      )}
    </div>
  );
}
