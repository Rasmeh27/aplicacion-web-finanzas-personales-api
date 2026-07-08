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
  | { type: 'p'; lines: string[] };

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const UL_RE = /^\s*[-*•]\s+(.*)$/;
const OL_RE = /^\s*\d+[.)]\s+(.*)$/;
// Inline: `code` | **bold**/__bold__ | *italic*/_italic_ | [text](http(s)://url)
const INLINE_RE =
  /(`[^`]+`)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', lines: paragraph });
      paragraph = [];
    }
  };

  for (const line of lines) {
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
  const blocks = parseBlocks(content ?? '');

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
