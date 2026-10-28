#!/usr/bin/env node
/**
 * scripts/security-audit.mjs — Audit Keamanan Otomatis (Epic Plan Security).
 *
 * Memeriksa:
 * 1. Tidak ada file rahasia (.env, google.json, credentials) yang terlacak di git.
 * 2. Tidak ada kebocoran service_role atau secret key di dalam bundle dist/client/.
 * 3. Tidak ada penggunaan raw HTML sink (set:html, dangerouslySetInnerHTML).
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function checkGitTrackedSecrets() {
  const tracked = execSync('git ls-files', { encoding: 'utf-8' }).split('\n');
  const forbiddenPatterns = [/\.env($|\.local|\.prod)/i, /google\.json$/i, /secret.*\.json$/i, /client_secret.*\.json$/i];
  const leaked = tracked.filter((file) => forbiddenPatterns.some((pattern) => pattern.test(file)));
  if (leaked.length > 0) {
    throw new Error(`File rahasia terlacak di Git: ${leaked.join(', ')}`);
  }
}

function checkSourceCodeUnsafeSinks() {
  const result = execSync(
    "git grep -n -E '\\bset:html\\s*=|dangerouslySetInnerHTML\\s*=|\\.innerHTML\\s*=' -- 'src/' || true",
    { encoding: 'utf-8' }
  ).trim();

  // Hanya periksa baris kode aktif (bukan komentar atau tipe)
  const violations = result
    .split('\n')
    .filter((line) => line && !line.includes('//') && !line.includes('/*') && !line.includes('* '));

  if (violations.length > 0) {
    throw new Error(`Ditemukan penggunaan raw HTML sink yang dilarang:\n${violations.join('\n')}`);
  }
}

function scanDirFiles(dir, fileList = []) {
  if (!existsSync(dir)) return fileList;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      scanDirFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function checkClientBundleLeaks() {
  const clientDir = join(process.cwd(), 'dist', 'client');
  if (!existsSync(clientDir)) return;

  const files = scanDirFiles(clientDir);
  const sensitivePatterns = [
    { name: 'SUPABASE_SERVICE_ROLE_KEY keyword', regex: /SUPABASE_SERVICE_ROLE_KEY/ },
    { name: 'service_role token payload', regex: /"role":"service_role"/ },
    { name: 'CLOUDINARY_API_SECRET keyword', regex: /CLOUDINARY_API_SECRET/ },
    { name: 'TURNSTILE_SECRET_KEY keyword', regex: /TURNSTILE_SECRET_KEY/ },
  ];

  for (const file of files) {
    if (!file.endsWith('.js') && !file.endsWith('.mjs') && !file.endsWith('.html') && !file.endsWith('.css')) continue;
    const content = readFileSync(file, 'utf-8');
    for (const pattern of sensitivePatterns) {
      if (pattern.regex.test(content)) {
        throw new Error(`Kebocoran rahasia (${pattern.name}) ditemukan pada aset publik: ${file}`);
      }
    }

    // JWT Supabase ditulis sebagai string base64url, jadi regex teks
    // "service_role" di atas tidak menangkapnya. Decode setiap kandidat JWT
    // dan tolak bila role-nya service_role.
    for (const match of content.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
      try {
        const payload = match[0].split('.')[1];
        const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
        if (json?.role === 'service_role') {
          throw new Error(`Kebocoran rahasia (JWT role=service_role) ditemukan pada aset publik: ${file}`);
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('Kebocoran rahasia')) throw err;
        // Bukan JWT valid — abaikan.
      }
    }
  }
}

try {
  checkGitTrackedSecrets();
  checkSourceCodeUnsafeSinks();
  checkClientBundleLeaks();
  console.log('✓ Security Audit PASS: Semua aturan keamanan, isolasi rahasia, dan sanitasi terpenuhi.');
  process.exit(0);
} catch (err) {
  console.error('✗ Security Audit GAGAL:', err instanceof Error ? err.message : err);
  process.exit(1);
}
