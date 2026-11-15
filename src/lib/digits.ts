/*
FILE:      src/lib/digits.ts
CREATED:   2026-11-15 11:05 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Arabic-Indic and Persian digits to ASCII.
WHY:       Shared by the server (phone.ts) and the browser (code field); kept free of Node-only imports so the client bundle stays clean.
*/

export function toAsciiDigits(input: string): string {
  return Array.from(input, (ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x0660 && cp <= 0x0669) return String(cp - 0x0660);
    if (cp >= 0x06f0 && cp <= 0x06f9) return String(cp - 0x06f0);
    return ch;
  }).join("");
}
