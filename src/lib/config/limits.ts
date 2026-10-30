// Limit MVP (usulan awal, ubah di sini saja). Lihat TASK.md bagian 4.2.
export const LIMITS = {
  maxActiveFormsPerUser: 20,
  maxImagesPerForm: 5,
  maxImageBytes: 2 * 1024 * 1024,
  maxQuestionsPerForm: 50,
  maxBlocksPerForm: 120,
  maxTextAnswerLength: 2000,
  maxResponsesPerForm: 2000,
  maxSubmitPayloadBytes: 64 * 1024,
  tmpImageTtlHours: 24,
  softDeleteRetentionDays: 5,
} as const;

export const RESERVED_SLUGS = [
  'admin', 'api', 'dashboard', 'f', 'login', 'logout', 'auth',
  'assets', 'static', 'terms', 'privacy', 'report', 'new', 'edit',
] as const;
