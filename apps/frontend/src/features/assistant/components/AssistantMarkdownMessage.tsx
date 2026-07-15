'use client';

import { Fragment, type ReactNode } from 'react';

/**
 * Minimal, SAFE Markdown renderer for assistant replies.
 *
 * Parses a practical subset (headings, bold, italic, inline code, links, and
 * ordered/unordered lists + paragraphs) into React elements. It NEVER uses
 * dangerouslySetInnerHTML and NEVER interprets raw HTML — any HTML in the source
 * is rendered verbatim as text, so it cannot inject markup or scripts. Links are
 * limited to http(s) and open with rel="noopener noreferrer nofollow".
 *
 * (Chosen over react-markdown to avoid adding a dependency; it covers the
 * DeepSeek-R1 output shape: **bold**, `code`, numbered/bulleted lists, headings.)
 */

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; lines: string[] }
  | { type: 'p'; lines: string[] };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const UL_RE = /^\s*[-*•]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;
const CODE_FENCE_RE = /^```(.*)$/;

// Language tags that mean the model wrapped the WHOLE reply in a fence as a
// formatting artifact (not intentional code). Mirrors the ai-service cleanup so
// old/edge messages never show literal ```markdown to the user.
const WRAPPER_FENCE_LANGS = new Set(['', 'markdown', 'md', 'text', 'plaintext']);

function stripWrappingCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```') || !trimmed.endsWith('```')) return text;
  if ((trimmed.match(/```/g) ?? []).length !== 2) return text; // embedded code -> keep
  const firstNewline = trimmed.indexOf('\n');
  if (firstNewline === -1) return text;
  const lang = trimmed.slice(3, firstNewline).trim().toLowerCase();
  if (!WRAPPER_FENCE_LANGS.has(lang)) return text; // real ```python etc. -> keep
  return trimmed.slice(firstNewline + 1, trimmed.lastIndexOf('```')).trim();
}
// Inline: `code` | **bold**/__bold__ | *italic*/_italic_ | [text](http(s)://url)
const INLINE_RE =
  /(`[^`]+`)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  let inCode = false;
  let code: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', lines: paragraph });
      paragraph = [];
    }
  };

  for (const line of lines) {
    // Fenced code block: toggle in/out on ``` lines; content is kept verbatim.
    if (CODE_FENCE_RE.test(line.trim())) {
      if (inCode) {
        blocks.push({ type: 'code', lines: code });
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      continue;
    }
    const ul = UL_RE.exec(line);
    if (ul) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'ul') last.items.push(ul[1]);
      else blocks.push({ type: 'ul', items: [ul[1]] });
      continue;
    }
    const ol = OL_RE.exec(line);
    if (ol) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'ol') last.items.push(ol[1]);
      else blocks.push({ type: 'ol', items: [ol[1]] });
      continue;
    }
    paragraph.push(line);
  }
  // An unterminated code fence still renders its captured lines as code.
  if (inCode && code.length) blocks.push({ type: 'code', lines: code });
  flushParagraph();
  return blocks;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const [token] = match;
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-medium text-indigo-600 underline underline-offset-2"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      // italic (*text* or _text_)
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function AssistantMarkdownMessage({ content }: { content: string }) {
  const blocks = parseBlocks(stripWrappingCodeFence(content ?? ''));

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-800">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const size = block.level <= 2 ? 'text-base' : 'text-sm';
          return (
            <p key={index} className={`${size} font-bold text-slate-900`}>
              {renderInline(block.text, `h-${index}`)}
            </p>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `ul-${index}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={index} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `ol-${index}-${itemIndex}`)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'code') {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100"
            >
              <code className="font-mono">{block.lines.join('\n')}</code>
            </pre>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line, `p-${index}-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
