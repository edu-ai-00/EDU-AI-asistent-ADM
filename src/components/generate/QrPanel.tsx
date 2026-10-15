"use client";

// AI Course Assistant (BR-D4PE8R) — QR code pointing at the phone capture page.

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";

interface QrPanelProps {
  captureUrl: string;
  expiresAt: string | null;
}

export function QrPanel({ captureUrl, expiresAt }: QrPanelProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(captureUrl, { width: 220, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [captureUrl]);

  // The session dies within minutes; show the countdown so nobody stares at a
  // QR code that stopped working a while ago.
  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const msLeft = new Date(expiresAt).getTime() - Date.now();
      if (msLeft <= 0) {
        setRemaining("vypršelo");
        return;
      }
      const minutes = Math.floor(msLeft / 60000);
      const seconds = Math.floor((msLeft % 60000) / 1000);
      setRemaining(`${minutes}:${String(seconds).padStart(2, "0")}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Smartphone className="h-4 w-4" />
        Vyfotit telefonem
      </div>

      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="QR kód pro nahrání z telefonu" className="rounded bg-white p-2" />
      ) : (
        <div className="h-[220px] w-[220px] animate-pulse rounded bg-gray-200" />
      )}

      <p className="text-center text-xs text-gray-500">
        Naskenujte kód telefonem. Přihlášení není potřeba — fotky se objeví zde.
      </p>

      {remaining && (
        <p className="text-xs text-gray-400">
          Platnost odkazu: <span className="font-mono">{remaining}</span>
        </p>
      )}
    </div>
  );
}
