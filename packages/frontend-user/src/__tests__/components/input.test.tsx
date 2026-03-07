import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with default value', () => {
    render(<Input defaultValue="hello" />);
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
  });

  it('accepts user typing', async () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'test input');
    expect(input).toHaveValue('test input');
  });

  it('calls onChange when value changes', async () => {
    const onChange = jest.fn();
    render(<Input onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders as password type', () => {
    render(<Input type="password" data-testid="pw" />);
    expect(screen.getByTestId('pw')).toHaveAttribute('type', 'password');
  });

  it('forwards additional className', () => {
    render(<Input className="extra-class" />);
    expect(screen.getByRole('textbox').className).toMatch(/extra-class/);
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
