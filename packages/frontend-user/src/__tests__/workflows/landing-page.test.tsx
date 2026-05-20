import { render, screen } from '@testing-library/react';

import HomePage from '@/app/page';

describe('landing page', () => {
  it('presents the approved human-AI collaboration and authorship proof copy', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Humanly' })).toBeInTheDocument();
    expect(screen.getByText('Write with AI. Prove your process.')).toBeInTheDocument();
    expect(screen.getByText(
      'Humanly lets writers collaborate with AI in a tracked workspace and generate verifiable authorship certificates.'
    )).toBeInTheDocument();
    expect(screen.queryByText('Human-AI collaboration')).not.toBeInTheDocument();
    expect(screen.queryByText('Tracked writing process')).not.toBeInTheDocument();
    expect(screen.queryByText('Verifiable certificates')).not.toBeInTheDocument();
  });
});
