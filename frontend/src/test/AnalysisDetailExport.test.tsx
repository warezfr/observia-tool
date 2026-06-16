import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Analysis } from '../types';

const completedAnalysis: Analysis = {
  id: 42,
  environment_id: 1,
  ai_provider_id: 1,
  analysis_type: 'performance',
  status: 'completed',
  result: { summary: '# Summary\n\nLooks **good**.', raw_data: [] },
  reasoning_steps: [],
  error_message: null,
  created_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
};

const generateMock = vi.fn().mockResolvedValue({
  id: 1,
  analysis_id: 42,
  format: 'html',
  content: '<!DOCTYPE html><html></html>',
  include_raw_data: true,
});

vi.mock('../services/reports-api', () => ({
  reportsApi: {
    generate: (req: unknown) => generateMock(req),
    getComparison: vi.fn().mockResolvedValue({ has_baseline: false, metrics: [] }),
    downloadPdf: vi.fn().mockResolvedValue(new Blob()),
  },
}));

vi.mock('../services/api', () => ({
  recommendationsApi: {
    list: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../contexts/AnalysesContext', () => ({
  useAnalyses: () => ({ getAnalysis: vi.fn().mockResolvedValue(completedAnalysis) }),
}));

import AnalysisDetail from '../pages/AnalysisDetail';

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/analyses/42']}>
      <Routes>
        <Route path="/analyses/:id" element={<AnalysisDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AnalysisDetail export buttons', () => {
  beforeEach(() => generateMock.mockClear());

  it('calls reportsApi.generate with html format on Export HTML', async () => {
    renderDetail();
    const btn = await screen.findByRole('button', { name: /Export HTML/i });
    fireEvent.click(btn);
    await waitFor(() =>
      expect(generateMock).toHaveBeenCalledWith(
        expect.objectContaining({ analysis_id: 42, format: 'html' })
      )
    );
  });

  it('calls reportsApi.generate with markdown format on MD', async () => {
    renderDetail();
    const btn = await screen.findByRole('button', { name: /^MD$/i });
    fireEvent.click(btn);
    await waitFor(() =>
      expect(generateMock).toHaveBeenCalledWith(
        expect.objectContaining({ analysis_id: 42, format: 'markdown' })
      )
    );
  });
});
