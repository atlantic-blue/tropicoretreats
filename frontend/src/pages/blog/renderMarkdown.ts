function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function processInlineMarkdown(line: string): string {
  let result = escapeHtml(line);

  // Bold: **text**
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code: `code`
  result = result.replace(
    /`(.+?)`/g,
    '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
  );

  // Links: [text](url)
  result = result.replace(
    /\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" class="text-emerald-700 underline hover:text-emerald-800" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return result;
}

function processListBlock(lines: string[]): string {
  const items = lines.map(line => {
    const content = line.replace(/^[-*]\s+/, '');
    return `<li class="ml-4">${processInlineMarkdown(content)}</li>`;
  });

  return `<ul class="list-disc space-y-1 pl-4 text-gray-600 leading-relaxed">${items.join('')}</ul>`;
}

function processBlock(block: string): string {
  const trimmed = block.trim();

  if (!trimmed) {
    return '';
  }

  // Headings
  const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const text = processInlineMarkdown(headingMatch[2]);
    const styles: Record<number, string> = {
      1: 'font-serif text-3xl font-bold text-gray-900 mt-10 mb-4',
      2: 'font-serif text-2xl font-bold text-gray-900 mt-8 mb-3',
      3: 'font-serif text-xl font-semibold text-gray-900 mt-6 mb-2',
      4: 'font-serif text-lg font-semibold text-gray-900 mt-4 mb-2',
      5: 'font-serif text-base font-semibold text-gray-900 mt-4 mb-1',
      6: 'font-serif text-sm font-semibold text-gray-900 mt-4 mb-1',
    };
    const className = styles[level] || styles[6];
    return `<h${level} class="${className}">${text}</h${level}>`;
  }

  // Check if the block is a list
  const lines = trimmed.split('\n');
  const isListBlock = lines.every(line => /^[-*]\s+/.test(line));
  if (isListBlock) {
    return processListBlock(lines);
  }

  // Regular paragraph
  const processed = lines.map(line => processInlineMarkdown(line)).join('<br />');
  return `<p class="text-gray-600 leading-relaxed mb-4">${processed}</p>`;
}

export function renderMarkdown(content: string): string {
  if (!content) {
    return '';
  }

  // Extract code blocks first to protect them from processing
  const codeBlocks: string[] = [];
  const withPlaceholders = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const index = codeBlocks.length;
    const languageLabel = lang
      ? `<span class="text-xs text-gray-400">${escapeHtml(lang)}</span>`
      : '';
    codeBlocks.push(
      `<div class="my-4 rounded-lg bg-gray-900 p-4 overflow-x-auto">${languageLabel}<pre class="text-sm text-gray-100 font-mono"><code>${escapeHtml(code.trim())}</code></pre></div>`
    );
    return `__CODE_BLOCK_${index}__`;
  });

  // Split by double newlines to get blocks
  const blocks = withPlaceholders.split(/\n\n+/);
  const processedBlocks = blocks
    .map(block => {
      const codeBlockMatch = block.trim().match(/^__CODE_BLOCK_(\d+)__$/);
      if (codeBlockMatch) {
        return codeBlocks[parseInt(codeBlockMatch[1], 10)];
      }
      return processBlock(block);
    })
    .filter(Boolean);

  return processedBlocks.join('');
}
