import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
  cwd: root, encoding: 'utf8', windowsHide: true,
}).split('\0').filter(Boolean);
const forbidden = /(^|\/)(?:\.env(?:\..+)?|\.vercel|\.agents|Skills|dist(?:-[^/]*)?|node_modules|supabase-export\.sql|NEXT_SESSION_SECURITY_AUDIT\.md|CONTEXTO_PROYECTO[^/]*)(\/|$)/i;
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{12,}/],
  ['JWT credential', /\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/],
  ['hosted project address', /https?:\/\/[a-z0-9]{20}\.supabase\.(?:co|in)\b/],
  ['GitHub credential', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ['local personal path', /[A-Z]:[\\/]Users[\\/][^\s/\\]+[\\/]/i],
];
const issues = [];
for (const file of new Set(files)) {
  if (forbidden.test(file) && !file.endsWith('.env.example')) issues.push(`${file}: excluded artifact`);
  if (!/\.(?:md|json|mjs|ts|tsx|toml|sql|yml|yaml|example)$/.test(file)) continue;
  const content = readFileSync(new URL(file, new URL('../', import.meta.url)), 'utf8');
  for (const [label, pattern] of patterns) {
    if (pattern.test(content)) issues.push(`${file}: ${label}`);
  }
  if (content.split(/\r?\n/).some((line) => /[ \t]+$/.test(line))) issues.push(`${file}: trailing whitespace`);
}
if (issues.length) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked ${new Set(files).size} public candidate files: no excluded artifacts or matching credential patterns.`);
  console.log('Pattern checks supplement manual review; they are not a complete secrets audit.');
}
