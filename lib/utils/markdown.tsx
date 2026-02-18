import React from 'react';

/**
 * Lightweight markdown renderer — no external packages.
 * Supports: # headings, **bold**, *italic*, - lists, blank line paragraphs.
 */

function parseInline(text: string): React.ReactNode {
  // Process **bold** and *italic* inline
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[0].startsWith('**')) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else {
      parts.push(<em key={match.index}>{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

export function renderMarkdown(markdown: string): React.ReactNode {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={key++} className="list-disc pl-5 space-y-1">{listItems}</ul>);
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      flushList();
      elements.push(<h4 key={key++} className="text-base font-semibold text-gray-900 mt-4 mb-1">{parseInline(line.slice(2))}</h4>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h5 key={key++} className="text-sm font-semibold text-gray-800 mt-3 mb-1">{parseInline(line.slice(3))}</h5>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(<li key={key++}>{parseInline(line.slice(2))}</li>);
    } else if (line.startsWith('---') || line.startsWith('***')) {
      flushList();
      elements.push(<hr key={key++} className="my-3 border-gray-200" />);
    } else if (line.trim() === '') {
      flushList();
      // blank line = paragraph separator, no element needed
    } else {
      flushList();
      elements.push(<p key={key++} className="text-sm text-gray-700 leading-relaxed">{parseInline(line)}</p>);
    }
  }

  flushList();

  return <>{elements}</>;
}
