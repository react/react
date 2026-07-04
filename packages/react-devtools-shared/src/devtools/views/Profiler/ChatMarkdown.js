/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import * as React from 'react';
import {memo} from 'react';

import styles from './ChatMarkdown.css';

// A minimal, dependency-free markdown renderer for streamed chat responses.
// Modeled on streaming-first renderers (e.g. Streamdown): input is parsed
// per block and stays readable while incomplete — an unterminated ``` fence
// renders as a code block, partial emphasis falls back to literal text.
// Supported: headings, paragraphs, ordered/unordered lists, fenced code,
// tables, inline code/bold/italic/links.

type InlineNode = React.Node;

const INLINE_PATTERN =
  // `code`         **bold**            *italic*         [text](url)
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/;

function parseInline(text: string): Array<InlineNode> {
  const nodes: Array<InlineNode> = [];
  let remaining = text;
  let key = 0;

  while (remaining !== '') {
    const match = remaining.match(INLINE_PATTERN);
    if (match == null || match.index == null) {
      nodes.push(remaining);
      break;
    }
    if (match.index > 0) {
      nodes.push(remaining.slice(0, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      nodes.push(
        <code key={key++} className={styles.InlineCode}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={key++}>{parseInline(token.slice(2, -2))}</strong>,
      );
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key++}>{parseInline(token.slice(1, -1))}</em>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (linkMatch != null) {
        nodes.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer">
            {parseInline(linkMatch[1])}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    remaining = remaining.slice(match.index + token.length);
  }

  return nodes;
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1;
}

function splitTableRow(line: string): Array<string> {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return (
    isTableRow(line) &&
    splitTableRow(line).every(cell => /^:?-{3,}:?$/.test(cell))
  );
}

// Lightweight JS/JSX syntax highlighting for fenced code blocks — enough
// for the code models emit in React performance answers, with zero
// dependencies. Order matters: comments, then strings, then keywords/numbers.
const CODE_TOKEN_PATTERN =
  /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|export|from|default|new|class|extends|async|await|try|catch|finally|throw|typeof|instanceof|in|of|delete|void|yield|static|get|set|null|undefined|true|false|this)\b|(\b\d[\d._]*\b)/g;

function highlightCode(code: string): Array<React.Node> {
  const nodes: Array<React.Node> = [];
  let lastIndex = 0;
  let key = 0;
  CODE_TOKEN_PATTERN.lastIndex = 0;
  let match;
  while ((match = CODE_TOKEN_PATTERN.exec(code)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(code.slice(lastIndex, match.index));
    }
    const [token, comment, string, keyword, number] = match;
    const tokenClass =
      comment != null
        ? styles.TokenComment
        : string != null
          ? styles.TokenString
          : keyword != null
            ? styles.TokenKeyword
            : number != null
              ? styles.TokenNumber
              : null;
    if (tokenClass != null) {
      nodes.push(
        <span key={key++} className={tokenClass}>
          {token}
        </span>,
      );
    } else {
      nodes.push(token);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }
  return nodes;
}

function parseBlocks(content: string): Array<React.Node> {
  const lines = content.split('\n');
  const blocks: Array<React.Node> = [];
  let key = 0;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === '') {
      index++;
      continue;
    }

    // Fenced code block; tolerate a missing closing fence while streaming.
    if (trimmed.startsWith('```')) {
      const codeLines = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index++;
      }
      index++; // Skip the closing fence if present.
      blocks.push(
        <pre key={key++} className={styles.CodeBlock}>
          {highlightCode(codeLines.join('\n'))}
        </pre>,
      );
      continue;
    }

    // Headings.
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch != null) {
      const level = headingMatch[1].length;
      const headingClass =
        level === 1
          ? styles.Heading1
          : level === 2
            ? styles.Heading2
            : styles.Heading3;
      blocks.push(
        <div
          key={key++}
          className={headingClass}
          role="heading"
          aria-level={level}>
          {parseInline(headingMatch[2])}
        </div>,
      );
      index++;
      continue;
    }

    // Tables (header row + separator row).
    if (
      isTableRow(line) &&
      index + 1 < lines.length &&
      isTableSeparator(lines[index + 1])
    ) {
      const headerCells = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index++;
      }
      blocks.push(
        <table key={key++} className={styles.Table}>
          <thead>
            <tr>
              {headerCells.map((cell, cellIndex) => (
                <th key={cellIndex}>{parseInline(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{parseInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    // Lists (unordered and ordered).
    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (unorderedMatch != null || orderedMatch != null) {
      const ordered = orderedMatch != null;
      const items = [];
      while (index < lines.length) {
        const itemTrimmed = lines[index].trim();
        const itemMatch = ordered
          ? itemTrimmed.match(/^\d+\.\s+(.*)$/)
          : itemTrimmed.match(/^[-*]\s+(.*)$/);
        if (itemMatch == null) {
          break;
        }
        items.push(<li key={items.length}>{parseInline(itemMatch[1])}</li>);
        index++;
      }
      blocks.push(
        ordered ? (
          <ol key={key++} className={styles.List}>
            {items}
          </ol>
        ) : (
          <ul key={key++} className={styles.List}>
            {items}
          </ul>
        ),
      );
      continue;
    }

    // Paragraph: consume consecutive plain lines.
    const paragraphLines = [line];
    index++;
    while (index < lines.length) {
      const nextTrimmed = lines[index].trim();
      if (
        nextTrimmed === '' ||
        nextTrimmed.startsWith('```') ||
        nextTrimmed.startsWith('#') ||
        isTableRow(lines[index]) ||
        /^[-*]\s+/.test(nextTrimmed) ||
        /^\d+\.\s+/.test(nextTrimmed)
      ) {
        break;
      }
      paragraphLines.push(lines[index]);
      index++;
    }
    blocks.push(
      <p key={key++} className={styles.Paragraph}>
        {parseInline(paragraphLines.join(' '))}
      </p>,
    );
  }

  return blocks;
}

type Props = {
  content: string,
};

// memo: during streaming only the last message's content changes; earlier
// transcript entries skip re-parsing entirely.
const ChatMarkdown: component(...props: Props) = memo(function ChatMarkdown({
  content,
}: Props) {
  return <div className={styles.ChatMarkdown}>{parseBlocks(content)}</div>;
});

export default ChatMarkdown;
