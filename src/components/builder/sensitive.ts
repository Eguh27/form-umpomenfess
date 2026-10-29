/**
 * sensitive.ts — detektor data sensitif & phishing 2 tingkat (T-84, Opsi B).
 * - Tier 1 (Kritis): Kata sandi, password, PIN ATM, CVV, OTP -> Blokir Autosave & Publish.
 * - Tier 2 (Sensitif Bersyarat): NIK, rekening, BPJS, PIN umum -> Izinkan Autosave, Blokir Publish.
 */
const CRITICAL_RE =
  /\b(kata\s*sandi|sandi|password|passcode|pass\s*word|pin\s*atm|cvv|kode\s*otp|otp)\b/i;

const CONDITIONAL_RE =
  /\b(pin)\b|\bnik\b|\bkk\b|\bno\.?\s*kk\b|rekening|\batm\b|kartu\s*kredit|nomor\s*induk|bpjs/i;

/** Tier 1: Pelanggaran kritis (kata sandi/password/CVV/OTP). Memblokir simpan draft & publish. */
export function isCriticalLabel(label: string): boolean {
  return CRITICAL_RE.test(label);
}

/** Tier 1 ATAU Tier 2: Berisiko data sensitif/phishing. Memblokir publish. */
export function isSensitiveLabel(label: string): boolean {
  return CRITICAL_RE.test(label) || CONDITIONAL_RE.test(label);
}

/** Daftar ID pertanyaan yang memicu Tier 1 Kritis (simpan & publish diblokir). */
export function criticalQuestionIds(
  blocks: Array<{ id: string; type: string; label?: string }>,
): string[] {
  return blocks
    .filter((b) => b.type === 'question' && typeof b.label === 'string' && isCriticalLabel(b.label))
    .map((b) => b.id);
}

/** Daftar ID pertanyaan yang memicu proteksi publish (Tier 1 atau Tier 2). */
export function sensitiveQuestionIds(
  blocks: Array<{ id: string; type: string; label?: string }>,
): string[] {
  return blocks
    .filter((b) => b.type === 'question' && typeof b.label === 'string' && isSensitiveLabel(b.label))
    .map((b) => b.id);
}

