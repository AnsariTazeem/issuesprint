'use client';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

/** Resolve repository-relative references without permitting executable URL schemes. */
export function resolveContentUrl(value: string, baseUrl?: string, image = false): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed, baseUrl || 'https://github.com/');
    if (url.protocol !== 'https:' && url.protocol !== 'http:' && !(url.protocol === 'mailto:' && !image)) return '';
    if (image && url.hostname === 'github.com') {
      const parts = url.pathname.split('/');
      if (parts[3] === 'blob') {
        parts.splice(3, 1);
        url.hostname = 'raw.githubusercontent.com';
        url.pathname = parts.join('/');
      }
    }
    return url.href;
  } catch { return ''; }
}

export default function RepositoryMarkdown({
  text,
  baseUrl,
  compact = false,
}: {
  text: string;
  baseUrl?: string;
  compact?: boolean;
}) {
  return <div className={'repository-markdown' + (compact ? ' compact' : '')}>
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      urlTransform={(url, key) => resolveContentUrl(url, baseUrl, key === 'src')}
      components={{
        a: ({ href, children }) => href
          ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          : <span>{children}</span>,
        img: ({ src, alt }) => src
          ? <img src={src} alt={alt || 'Repository image'} loading="lazy" referrerPolicy="no-referrer" />
          : <span>{alt || ''}</span>,
        input: ({ checked, type }) => type === 'checkbox' ? <input type="checkbox" checked={Boolean(checked)} disabled readOnly /> : null,
      }}
    >{text}</Markdown>
  </div>;
}
