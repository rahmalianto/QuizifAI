import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CategoriesPage from './CategoriesPage';

// Mock the hook
vi.mock('../hooks/useCategories', () => ({
  useCategories: vi.fn(),
}));

import { useCategories } from '../hooks/useCategories';

const TestHarness = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders successfully with categories', async () => {
    useCategories.mockReturnValue({
      categories: [
        { id: '1', name: 'Science', question_count: 5, created_at: new Date().toISOString() },
        { id: '2', name: 'Math', question_count: 0, created_at: new Date().toISOString() },
      ],
      loading: false,
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
    });

    render(
      <TestHarness>
        <Routes>
          <Route path="/" element={<CategoriesPage />} />
        </Routes>
      </TestHarness>
    );

    await waitFor(() => {
      expect(screen.getByText('Science')).toBeInTheDocument();
      expect(screen.getByText('Math')).toBeInTheDocument();
    });
  });

  it('renders successfully with empty categories', async () => {
    useCategories.mockReturnValue({
      categories: [],
      loading: false,
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
    });

    render(
      <TestHarness>
        <Routes>
          <Route path="/" element={<CategoriesPage />} />
        </Routes>
      </TestHarness>
    );

    await waitFor(() => {
      expect(screen.getByText('No categories yet')).toBeInTheDocument();
    });
  });
});
