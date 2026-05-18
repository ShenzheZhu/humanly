import { render, screen } from '@testing-library/react';

import HomePage from '@/app/page';

describe('landing page', () => {
  it('presents the approved human-AI collaboration and authorship proof copy', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Welcome to Humanly' })).toBeInTheDocument();
    expect(screen.getByText('Write with AI. Prove your process.')).toBeInTheDocument();
    expect(screen.getByText(
      'Humanly lets writers collaborate with AI in a tracked workspace and generate verifiable authorship certificates.'
    )).toBeInTheDocument();
  });
});
