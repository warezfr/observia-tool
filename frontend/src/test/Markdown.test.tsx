import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Markdown from '../components/ui/Markdown';

describe('Markdown', () => {
  it('renders headings, bold and lists', () => {
    const { container } = render(
      <Markdown>{`# Title\n\nSome **bold** text\n\n- one\n- two`}</Markdown>
    );
    expect(container.querySelector('h1')?.textContent).toBe('Title');
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders GFM tables', () => {
    const { container } = render(
      <Markdown>{`| a | b |\n| - | - |\n| 1 | 2 |`}</Markdown>
    );
    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelectorAll('td')).toHaveLength(2);
  });

  it('renders links that open in a new tab', () => {
    render(<Markdown>{`[Dynatrace](https://dynatrace.com)`}</Markdown>);
    const link = screen.getByRole('link', { name: 'Dynatrace' });
    expect(link).toHaveAttribute('href', 'https://dynatrace.com');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
