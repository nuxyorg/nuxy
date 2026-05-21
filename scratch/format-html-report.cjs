const fs = require('fs');

const raw = fs.readFileSync('scratch/raw-html.txt', 'utf8');
const lines = raw.split('\n').filter(Boolean);

const files = {};
let totalCount = 0;
const tagCounts = {};

for (const line of lines) {
  const match = line.match(/^([^:]+):(\d+):(.*)$/);
  if (!match) continue;
  
  const [, file, lineNum, content] = match;
  
  // Find all HTML-like tags in the line
  const regex = /<([a-z][a-z0-9]*)(?:\s|>|\/)/g;
  let tagMatch;
  const tags = [];
  while ((tagMatch = regex.exec(content)) !== null) {
    const tagName = tagMatch[1];
    tags.push(tagName);
    tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    totalCount++;
  }
  
  if (tags.length > 0) {
    if (!files[file]) files[file] = [];
    files[file].push({ line: lineNum, content: content.trim(), tags });
  }
}

let md = `# Raw HTML Element Usage Report (Extensions)\n\n`;
md += `**Total files with raw HTML elements:** ${Object.keys(files).length}\n`;
md += `**Total instances:** ${totalCount}\n\n`;

md += `### Summary by Element\n`;
const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
for (const [tag, count] of sortedTags) {
  md += `- \`<${tag}>\`: ${count} instances\n`;
}
md += `\n`;

for (const [file, occurrences] of Object.entries(files)) {
  md += `### \`${file}\`\n`;
  md += `| Line | Element(s) | Code Snippet |\n`;
  md += `|------|------------|--------------|\n`;
  for (const occ of occurrences) {
    const elements = occ.tags.map(t => "\`<" + t + ">\`").join(', ');
    md += `| ${occ.line} | ${elements} | \`${occ.content.replace(/`/g, "'")}\` |\n`;
  }
  md += `\n`;
}

fs.writeFileSync('docs/raw-html-elements-report.md', md);
console.log('Formatted report written to docs/raw-html-elements-report.md');
