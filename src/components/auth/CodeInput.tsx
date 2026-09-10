"use client";

import { useRef, useState } from "react";

/**
 * Six single-character boxes that behave like one field: typing advances,
 * backspace retreats, and a pasted code fills every box at once. The joined
 * value is mirrored into a hidden input so the server action sees one string.
 */
export function CodeInput({ name = "code", autoFocus = true }: { name?: string; autoFocus?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setAt = (index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  return (
    <>
      <input type="hidden" name={name} value={digits.join("")} />
      <div className="otp">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            autoFocus={autoFocus && i === 0}
            aria-label={`Digit ${i + 1} of 6`}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              if (!value) return setAt(i, "");
              setAt(i, value.slice(-1));
              if (i < 5) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) {
                refs.current[i - 1]?.focus();
                setAt(i - 1, "");
              }
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
              if (!pasted) return;
              const next = Array(6).fill("");
              for (let j = 0; j < pasted.length; j += 1) next[j] = pasted[j];
              setDigits(next);
              refs.current[Math.min(pasted.length, 5)]?.focus();
            }}
          />
        ))}
      </div>
    </>
  );
}
