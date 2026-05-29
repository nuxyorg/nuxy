import fs from 'fs';
import path from 'path';

const EXTENSIONS_DIR = '/home/xava/Documents/nuxy/extensions';

// Exclude build artifacts or node_modules if any
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git'];

// Match emojis or special non-standard characters like ellipsis (…), long dashes, etc., but wait,
// the guide says "No emojis in UI: Do not use emoji characters as icons or visual affordances. Use icon components...".
// Wait, the regex in the previous run matched ellipsis ("…") and symbols like arrow ("→") and box-drawing characters (───).
// Ellipsis (…), Em-dash, etc. are NOT emojis. Let's refine the emoji check to only match actual emojis!
// Standard emoji regex:
const EMOJI_REGEX = /(?:\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFC]|\uD83E[\uDD00-\uDDFF]|[\u2600-\u27BF])/g;

// Helper to check if file has hardcoded styles
const HARDCODED_STYLE_REGEX = /style=\{\{\s*[^}]*(?:color|background|padding|margin|border|boxShadow)\s*:\s*['"`](?!var\()[^'"`]+['"`]/i;

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (EXCLUDE_DIRS.includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const extensions = fs.readdirSync(EXTENSIONS_DIR).filter(file => {
  const fullPath = path.join(EXTENSIONS_DIR, file);
  return fs.statSync(fullPath).isDirectory() && !EXCLUDE_DIRS.includes(file);
});

const report = {};

for (const ext of extensions) {
  // We can skip ui-default because it is a uikit extension that contains packages, or maybe scan it as well
  if (ext === 'ui-default' || ext === 'icons-default') {
    // These are structural extensions, but let's check them if needed.
    // Let's still scan them but keep in mind they are different.
  }
  
  const extPath = path.join(EXTENSIONS_DIR, ext);
  const files = walkDir(extPath);
  
  const extReport = {
    manifest: null,
    violations: [],
    filesCount: files.length,
    hasBackend: false,
    hasBackendTest: false,
    hasFrontend: false,
  };

  // Find manifest
  const manifestFile = files.find(f => path.basename(f) === 'manifest.json');
  if (manifestFile) {
    try {
      extReport.manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    } catch (e) {
      extReport.violations.push({
        file: 'manifest.json',
        rule: 'Valid JSON manifest',
        message: `Failed to parse manifest.json: ${e.message}`,
        severity: 'high'
      });
    }
  } else {
    // If it's a theme or icon pack it might have manifest.json. If it does not, it's a violation.
    extReport.violations.push({
      file: 'manifest.json',
      rule: 'Manifest existence',
      message: 'manifest.json does not exist',
      severity: 'high'
    });
  }

  // Check file extension rules (no .js source files)
  for (const file of files) {
    const relative = path.relative(extPath, file);
    const extname = path.extname(file);
    const basename = path.basename(file);

    // Banned JS files: source files in extensions must be TS/TSX.
    // However, build outputs or entry points listed in manifest might be .js in manifest, 
    // but the source directory shouldn't have .js unless it's a config file or similar.
    // Wait, the rule is "All source files use .ts or .tsx - no .js extension files".
    if (extname === '.js' && basename !== 'manifest.json' && basename !== 'package.json' && !file.includes('node_modules')) {
      // Is it a compiled/dist file? Let's check. If the extension has a tsconfig or packages, it might have build outputs.
      // But typically, Nuxy loads source .ts/.tsx files and transpiles them at runtime.
      // So if there are .js files, they might be legacy or wrong.
      extReport.violations.push({
        file: relative,
        rule: 'TypeScript only (No .js)',
        message: 'JavaScript source files are banned. All source files must be TypeScript.',
        severity: 'high'
      });
    }

    if (basename === 'backend.ts') {
      extReport.hasBackend = true;
    }
    if (basename === 'backend.test.ts') {
      extReport.hasBackendTest = true;
    }
    if (basename === 'frontend.tsx') {
      extReport.hasFrontend = true;
    }
  }

  if (extReport.hasBackend && !extReport.hasBackendTest) {
    extReport.violations.push({
      file: 'backend.ts',
      rule: 'Backend Unit Tests',
      message: 'backend.ts exists but no backend.test.ts was found in the extension directory.',
      severity: 'medium'
    });
  }

  // Scan individual files for patterns
  for (const file of files) {
    const relative = path.relative(extPath, file);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const isBackend = file.endsWith('backend.ts');
    const isFrontend = file.endsWith('frontend.tsx');

    // 1. Direct Node.js imports in backend
    if (isBackend) {
      const nodeImports = [
        /import\s+.*\s+from\s+['"]fs['"]/g,
        /import\s+.*\s+from\s+['"]os['"]/g,
        /import\s+.*\s+from\s+['"]path['"]/g,
        /import\s+.*\s+from\s+['"]child_process['"]/g,
        /import\s+.*\s+from\s+['"]node:sqlite['"]/g,
        /import\s+.*\s+from\s+['"]node:.*['"]/g,
        /require\(['"](?:fs|os|path|child_process|node:.*)['"]\)/g
      ];

      nodeImports.forEach(regex => {
        if (regex.test(content)) {
          extReport.violations.push({
            file: relative,
            rule: 'No Direct Node.js Imports',
            message: `Backend contains direct Node.js imports (matched regex: ${regex.toString()}). Use core.fs, core.db, or core.shell instead.`,
            severity: 'high'
          });
        }
      });

      // 2. Console logs in backend
      lines.forEach((line, index) => {
        if (line.includes('console.log') || line.includes('console.error') || line.includes('console.warn')) {
          extReport.violations.push({
            file: `${relative}:${index + 1}`,
            rule: 'No Console Logs in Backend',
            message: `Found console statement in backend: "${line.trim()}"`,
            severity: 'medium'
          });
        }
      });
    }

    // 3. Frontend checks
    if (isFrontend) {
      // Check for import React from 'react'
      if (/import\s+React\s+from\s+['"]react['"]/g.test(content)) {
        extReport.violations.push({
          file: relative,
          rule: 'No ESM React Import in Frontend',
          message: 'Frontend contains "import React from \'react\'". Use "const React = window.React" instead.',
          severity: 'high'
        });
      }

      // Check for raw html inputs, textareas, buttons
      lines.forEach((line, index) => {
        if (/<input\b/i.test(line)) {
          // If it is in a comment, ignore. But simple regex:
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            extReport.violations.push({
              file: `${relative}:${index + 1}`,
              rule: 'No HTML Input Elements',
              message: `Frontend contains raw <input> element: "${line.trim()}". All text input must come through the shell's omnibar query.`,
              severity: 'high'
            });
          }
        }
        if (/<textarea\b/i.test(line)) {
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            extReport.violations.push({
              file: `${relative}:${index + 1}`,
              rule: 'No HTML Textarea Elements',
              message: `Frontend contains raw <textarea> element: "${line.trim()}".`,
              severity: 'high'
            });
          }
        }
        if (/<button\b/i.test(line)) {
          // Wait, is it a component named Button (e.g. <Button ...>) or lowercase button?
          // Lowercase button is a raw html element: <button.
          // Note that <Button from UIkit is fine.
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            extReport.violations.push({
              file: `${relative}:${index + 1}`,
              rule: 'No HTML Button Elements',
              message: `Frontend contains raw <button> element: "${line.trim()}". Use window.UI.Button instead.`,
              severity: 'high'
            });
          }
        }
        if (EMOJI_REGEX.test(line)) {
          // Make sure it's not a comment
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            extReport.violations.push({
              file: `${relative}:${index + 1}`,
              rule: 'No Emojis in UI',
              message: `Found emoji character: "${line.trim()}". Use icon components from window.UI instead.`,
              severity: 'medium'
            });
          }
        }
        if (HARDCODED_STYLE_REGEX.test(line)) {
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            extReport.violations.push({
              file: `${relative}:${index + 1}`,
              rule: 'No Hardcoded Styles',
              message: `Found hardcoded style/color: "${line.trim()}". Use CSS variables/theme tokens instead.`,
              severity: 'medium'
            });
          }
        }
      });
    }

    // Check for undeclared permissions in manifest
    if (extReport.manifest && extReport.manifest.permissions) {
      const perms = extReport.manifest.permissions;
      if (content.includes('core.storage') && !perms.includes('storage')) {
        extReport.violations.push({
          file: relative,
          rule: 'Undeclared Permission (storage)',
          message: 'Uses core.storage but "storage" permission is not declared in manifest.json',
          severity: 'high'
        });
      }
      if (content.includes('core.clipboard') && !perms.includes('clipboard')) {
        extReport.violations.push({
          file: relative,
          rule: 'Undeclared Permission (clipboard)',
          message: 'Uses core.clipboard but "clipboard" permission is not declared in manifest.json',
          severity: 'high'
        });
      }
      if (content.includes('core.media') && !perms.includes('media')) {
        extReport.violations.push({
          file: relative,
          rule: 'Undeclared Permission (media)',
          message: 'Uses core.media but "media" permission is not declared in manifest.json',
          severity: 'high'
        });
      }
      if (content.includes('fetch(') && !perms.includes('network')) {
        extReport.violations.push({
          file: relative,
          rule: 'Undeclared Permission (network)',
          message: 'Uses fetch() but "network" permission is not declared in manifest.json',
          severity: 'high'
        });
      }
    }
  }

  report[ext] = extReport;
}

// Write JSON
fs.writeFileSync('/home/xava/Documents/nuxy/scratch/scan-report.json', JSON.stringify(report, null, 2));

// Generate Markdown
let md = `# Extension Scan Report\n\nGenerated on: ${new Date().toISOString()}\n\n`;

for (const [ext, data] of Object.entries(report)) {
  const violations = data.violations;
  if (violations.length === 0) continue; // Skip clean extensions
  
  md += `## Extension: \`${ext}\` (Type: ${data.manifest?.type || 'unknown'})\n`;
  md += `- **Backend**: ${data.hasBackend ? '✅ Yes' : '❌ No'}\n`;
  md += `- **Frontend**: ${data.hasFrontend ? '✅ Yes' : '❌ No'}\n`;
  md += `- **Backend Test**: ${data.hasBackendTest ? '✅ Yes' : '❌ No'}\n\n`;
  
  md += `| File | Rule | Message | Severity |\n`;
  md += `| --- | --- | --- | --- |\n`;
  for (const v of violations) {
    md += `| \`${v.file}\` | **${v.rule}** | ${v.message.replace(/\|/g, '\\|')} | \`${v.severity}\` |\n`;
  }
  md += `\n---\n\n`;
}

fs.writeFileSync('/home/xava/Documents/nuxy/scratch/scan-report.md', md);
console.log('Report saved to scratch/scan-report.json and scratch/scan-report.md');
