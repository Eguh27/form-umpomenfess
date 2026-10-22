/** Format ringkasan cleanup untuk log GitHub Actions / terminal. Tanpa secret. */

/**
 * @param {Awaited<ReturnType<import('./cleanup-run.mjs').runCleanup>>} summary
 */
export function formatCleanupSummary(summary) {
  const mode = summary.apply ? 'APPLY' : 'DRY-RUN';
  const lines = [`Cleanup ${summary.at} — ${summary.mode} — ${mode}`];

  lines.push(
    `- Form lewat closes_at: ${summary.daily.expiredForms}` +
      (summary.apply ? ` (ditutup: ${summary.daily.closedForms})` : ' (akan ditutup)'),
  );
  lines.push(
    `- Gambar tmp > TTL: ${summary.daily.tmpImages}` +
      (summary.apply ? ` (dihapus: ${summary.daily.deletedTmpImages})` : ' (akan dihapus)'),
  );

  if (summary.weekly) {
    const w = summary.weekly;
    lines.push(
      `- Gambar orphan: ${w.orphans}` +
        (summary.apply ? ` (dihapus: ${w.deletedOrphans})` : ' (akan dihapus)'),
    );
    lines.push(
      `- Form soft-deleted > retensi: ${w.softDeletedForms} kandidat` +
        (summary.apply
          ? ` (dipurge: ${w.purgedForms}, ${w.purgedImages} baris gambar)`
          : ' (dry-run: belum diubah)'),
    );
    lines.push(`- Form tidak aktif > 6 bulan: ${w.staleForms} kandidat arsip (hanya laporan)`);
  }

  if (summary.errors.length > 0) {
    lines.push(`- Error: ${summary.errors.length}`);
    for (const error of summary.errors) lines.push(`  • ${error.step}: ${error.message}`);
  } else {
    lines.push('- Error: 0');
  }
  return lines.join('\n');
}
