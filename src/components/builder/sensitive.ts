/**
 * sensitive.ts — detektor pertanyaan sensitif (T-43, TASK 7).
 * "Larangan minta kata sandi/data sensitif: tampilkan peringatan di builder."
 * Word-boundary supaya "unik"/"pinning" tidak salah tangkap.
 */
const SENSITIVE_RE =
  /\b(kata\s*sandi|sandi|password|passcode|pass\s*word|pin)\b|\bnik\b|\bkk\b|\bno\.?\s*kk\b|rekening|\batm\b|\bcvv\b|kartu\s*kredit|nomor\s*induk|bpjs|\bnik\b|otp/i;

/** Label berisiko meminta data sensitif? (bukan larangan keras — hanya peringatan) */
export function isSensitiveLabel(label: string): boolean {
  return SENSITIVE_RE.test(label);
}

export function sensitiveQuestionIds(
  blocks: Array<{ id: string; type: string; label?: string }>,
): string[] {
  return blocks
    .filter((b) => b.type === 'question' && typeof b.label === 'string' && isSensitiveLabel(b.label))
    .map((b) => b.id);
}
