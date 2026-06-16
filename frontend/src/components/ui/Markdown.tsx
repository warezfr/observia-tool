import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Renders Markdown (GFM: tables, task lists, strikethrough, autolinks) with
 * theme-aware prose styles defined in index.css (.prose-observia).
 */
export default function Markdown({ children, className = '' }: MarkdownProps) {
  return (
    <div className={`prose-observia ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: props => {
            const { node, ...rest } = props;
            void node;
            return <a {...rest} target="_blank" rel="noopener noreferrer" />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
