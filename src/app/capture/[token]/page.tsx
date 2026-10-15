"use client";

// AI Course Assistant (BR-D4PE8R) — the page a phone lands on after scanning
// the QR code in the course editor.
//
// PUBLIC by design: no login, no admin cookie. The token in the URL is the only
// credential and it can do exactly one thing — add a photo to one session that
// expires in minutes. It is deliberately outside the /admin matcher in
// src/middleware.ts.

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";

interface CaptureInfo {
  course_name: string | null;
  uploaded: number;
  expires_at: string;
  limits: {
    max_attachments: number;
    max_file_bytes: number;
    allowed_mimes: string[];
  };
}

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export default function CapturePage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [info, setInfo] = useState<CaptureInfo | null>(null);
  const [uploaded, setUploaded] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(0);

  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/capture/${token}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setError(json.message ?? "Odkaz je neplatný nebo vypršel.");
          return;
        }

        setInfo(json.data as CaptureInfo);
        setUploaded((json.data as CaptureInfo).uploaded);
      })
      .catch(() => {
        if (!cancelled) setError("Nepodařilo se spojit se serverem.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const upload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files[]", file));

      try {
        const res = await fetch(`/api/capture/${token}/attachments`, {
          method: "POST",
          body: formData,
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(json.message ?? "Nahrání se nezdařilo.");
          return;
        }

        setUploaded(json.data?.uploaded ?? uploaded + files.length);
        setJustUploaded(files.length);
      } catch {
        setError("Nahrání se nezdařilo. Zkontrolujte připojení.");
      } finally {
        setIsUploading(false);
      }
    },
    [token, uploaded]
  );

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </main>
    );
  }

  if (error && !info) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm rounded-lg border border-red-200 bg-white p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Odkaz nefunguje</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <p className="mt-4 text-xs text-gray-400">
            Nechte si v administraci zobrazit nový QR kód.
          </p>
        </div>
      </main>
    );
  }

  const maxAttachments = info?.limits.max_attachments ?? 10;
  const isFull = uploaded >= maxAttachments;

  return (
    <main className="min-h-screen bg-gray-50 p-5">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <header className="pt-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Vyfotit podklady</h1>
          {info?.course_name && (
            <p className="mt-1 text-sm text-gray-500">{info.course_name}</p>
          )}
        </header>

        {justUploaded > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Nahráno. Fotky se objeví v administraci — můžete pokračovat nebo zavřít.
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            disabled={isUploading || isFull}
            onClick={() => cameraRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-4 text-base font-medium text-white disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            Vyfotit
          </button>

          <button
            type="button"
            disabled={isUploading || isFull}
            onClick={() => libraryRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-4 text-base font-medium text-gray-800 disabled:opacity-50"
          >
            <ImagePlus className="h-5 w-5" />
            Vybrat z telefonu
          </button>
        </div>

        {/* `capture` opens the camera straight away; the second input keeps the
            normal picker available for existing photos and PDFs. */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={libraryRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />

        <p className="text-center text-sm text-gray-500">
          Nahráno {uploaded} z {maxAttachments}
        </p>

        {isFull && (
          <p className="text-center text-xs text-amber-600">
            Dosažen limit příloh. Další se dají odebrat v administraci.
          </p>
        )}

        <p className="text-center text-xs text-gray-400">
          Odkaz je dočasný a po chvíli přestane platit.
        </p>
      </div>
    </main>
  );
}
