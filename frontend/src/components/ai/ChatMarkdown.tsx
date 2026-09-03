import React from 'react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMarkdownProps {
  content: string;
}

export const ChatMarkdown: React.FC<
  ChatMarkdownProps
> = ({ content }) => {
  return (
    <div className="jet-ai-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="jet-ai-md-h1">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="jet-ai-md-h2">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="jet-ai-md-h3">
              {children}
            </h3>
          ),

          p: ({ children }) => (
            <p className="jet-ai-md-p">
              {children}
            </p>
          ),

          ul: ({ children }) => (
            <ul className="jet-ai-md-ul">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="jet-ai-md-ol">
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li className="jet-ai-md-li">
              {children}
            </li>
          ),

          strong: ({ children }) => (
            <strong className="jet-ai-md-strong">
              {children}
            </strong>
          ),

          code: ({
            children,
            className,
          }) => {
            const inline =
              !className;

            return inline ? (
              <code className="jet-ai-md-inline-code">
                {children}
              </code>
            ) : (
              <code className="jet-ai-md-code">
                {children}
              </code>
            );
          },

          pre: ({ children }) => (
            <pre className="jet-ai-md-pre">
              {children}
            </pre>
          ),

          blockquote: ({
            children,
          }) => (
            <blockquote className="jet-ai-md-blockquote">
              {children}
            </blockquote>
          ),

          table: ({
            children,
          }) => (
            <div className="jet-ai-md-table-wrap">
              <table className="jet-ai-md-table">
                {children}
              </table>
            </div>
          ),

          th: ({ children }) => (
            <th className="jet-ai-md-th">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="jet-ai-md-td">
              {children}
            </td>
          ),

          a: ({
            children,
            href,
          }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="jet-ai-md-link"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};