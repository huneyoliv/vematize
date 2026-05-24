import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreviewBanner from './PreviewBanner';

describe('PreviewBanner', () => {
  it('should render preview environment text inside a portal in the document body', () => {
    const { container } = render(<PreviewBanner />);
    
    expect(container.firstChild).toBeNull();
    
    const banner = screen.getByRole('status');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/Ambiente de Preview/i);
    expect(banner).toHaveTextContent(/Nenhum dado é salvo/i);
    
    const styles = window.getComputedStyle(banner);
    expect(styles.position).toBe('fixed');
    expect(styles.bottom).toBe('24px');
    expect(styles.right).toBe('24px');
    expect(styles.zIndex).toBe('99999');
  });
});
