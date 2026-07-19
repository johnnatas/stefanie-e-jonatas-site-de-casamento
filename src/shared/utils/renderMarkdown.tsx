import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((token) => token.length > 0);

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    return <span key={key}>{token}</span>;
  });
}

/**
 * Minimal, dependency-free Markdown renderer supporting only **bold**,
 * *italic*, and blank-line-separated paragraphs. Builds React elements
 * directly from matched tokens — never parses or injects raw HTML, so
 * admin-authored content can't execute arbitrary markup.
 */
export function renderMarkdown(markdown: string): ReactNode {
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index > 0 ? "mt-3" : undefined}>
          {renderInline(paragraph, `p${index}`)}
        </p>
      ))}
    </>
  );
}
