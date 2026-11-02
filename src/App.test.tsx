import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the settings hint', () => {
  render(<App />);
  expect(screen.getByText(/press s for settings/i)).toBeInTheDocument();
});
