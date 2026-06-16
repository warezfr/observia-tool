import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ui/ThemeToggle';

function setup() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe('ThemeToggle', () => {
  it('defaults to light theme', () => {
    setup();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles theme and persists choice to localStorage', () => {
    setup();
    const btn = screen.getByRole('button');

    fireEvent.click(btn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('observia-theme')).toBe('dark');

    fireEvent.click(btn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('observia-theme')).toBe('light');
  });

  it('restores persisted theme on mount', () => {
    localStorage.setItem('observia-theme', 'dark');
    setup();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
