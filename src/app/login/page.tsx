"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first code input when step changes to code
  useEffect(() => {
    if (step === "code") {
      codeRefs.current[0]?.focus();
    }
  }, [step]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStep("code");
      } else {
        const data = await response.json();
        const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "Failed to send code");
        setError(msg);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (fullCode: string) => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push("/admin");
        router.refresh();
      } else {
        const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "Invalid code");
        setError(msg);
        setCode(["", "", "", "", "", ""]);
        codeRefs.current[0]?.focus();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    const fullCode = newCode.join("");
    if (fullCode.length === 6 && newCode.every((d) => d !== "")) {
      handleVerify(fullCode);
    }
  };

  const handleCodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      codeRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-lg border border-purple-100 w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.svg"
            alt="EDU Logo"
            width={120}
            height={48}
            className="mb-6"
            priority
          />
          <p className="text-gray-500 text-sm">
            {step === "email"
              ? "Zadejte svůj e-mail pro přihlášení"
              : "Zadejte ověřovací kód"}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <Input
              type="email"
              placeholder="vas@email.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Odeslat kód
            </Button>
          </form>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-center text-gray-600">
              Kód byl odeslán na <strong>{email}</strong>
            </p>

            <div
              className="flex justify-center gap-2.5"
              onPaste={handleCodePaste}
            >
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-11 h-12 text-center text-xl font-semibold border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all disabled:opacity-50"
                  disabled={isLoading}
                />
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full"
                isLoading={isLoading}
                onClick={() => {
                  const fullCode = code.join("");
                  if (fullCode.length === 6) handleVerify(fullCode);
                }}
                disabled={code.join("").length !== 6}
              >
                Ověřit
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode(["", "", "", "", "", ""]);
                  setError("");
                }}
                className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Použít jiný e-mail
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
