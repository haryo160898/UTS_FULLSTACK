const fs = require('fs').promises;
const path = require('path');

const ROOT = process.cwd();
const IGNORES = ['node_modules', '.git', 'dist', 'build', 'public/exports'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const regexes = [
  { type: 'export default function', re: /^\s*export\s+default\s+function(?:\s+([A-Za-z0-9_$]+))?/ },
  { type: 'export function', re: /^\s*export\s+function\s+([A-Za-z0-9_$]+)\s*\(/ },
  { type: 'function', re: /^\s*function\s+([A-Za-z0-9_$]+)\s*\(/ },
  { type: 'export const arrow', re: /^\s*export\s+const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(.*\)\s*=>/ },
  { type: 'const arrow', re: /^\s*const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(.*\)\s*=>/ },
  { type: 'export const', re: /^\s*export\s+const\s+([A-Za-z0-9_$]+)\s*=/ },
  { type: 'const', re: /^\s*const\s+([A-Za-z0-9_$]+)\s*=/ },
  { type: 'class', re: /^\s*(?:export\s+)?class\s+([A-Za-z0-9_$]+)/ },
];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const ent of entries) {
    if (IGNORES.includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results.push(...await walk(full));
    } else if (ent.isFile()) {
      if (EXTENSIONS.has(path.extname(ent.name))) results.push(full);
    }
  }
  return results;
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

(async function main(){
  try {
    const files = await walk(ROOT);
    const index = {};

    for (const file of files) {
      const relPath = rel(file);
      // skip some tooling files
      if (relPath.startsWith('public/') && !relPath.startsWith('public/')) continue;
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split(/\r?\n/);
      const funcs = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const {type, re} of regexes) {
          const m = line.match(re);
          if (m) {
            const name = m[1] || (type === 'export default function' ? 'default' : null) || null;
            funcs.push({ name: name || '<anonymous>', type, line: i + 1, snippet: line.trim() });
            break;
          }
        }
      }
      if (funcs.length) index[relPath] = funcs;
    }

    const jsonPath = path.join(ROOT, 'FUNCTION_INDEX.json');
    await fs.writeFile(jsonPath, JSON.stringify(index, null, 2), 'utf8');

    // Also write markdown with anchors
    const mdLines = ['# Function Index', '', 'Daftar fungsi/komponen per-file dengan nomor baris (link editor-friendly).', ''];
    for (const [filePath, funcs] of Object.entries(index).sort()) {
      mdLines.push(`## ${filePath}`, '');
      for (const f of funcs) {
        const link = `${filePath}#L${f.line}`;
        mdLines.push(`- [${filePath}](${link}): **${f.name}** — ${f.type} (line ${f.line})`);
      }
      mdLines.push('');
    }
    const mdPath = path.join(ROOT, 'FUNCTION_INDEX.md');
    await fs.writeFile(mdPath, mdLines.join('\n'), 'utf8');

    console.log('Wrote', jsonPath, 'and', mdPath);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
