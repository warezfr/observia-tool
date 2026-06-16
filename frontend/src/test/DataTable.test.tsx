import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DataTable, { type Column, type FilterDef } from '../components/ui/DataTable';

interface Row {
  id: number;
  name: string;
  status: string;
  score: number;
}

const data: Row[] = [
  { id: 1, name: 'Alpha', status: 'active', score: 30 },
  { id: 2, name: 'Bravo', status: 'inactive', score: 10 },
  { id: 3, name: 'Charlie', status: 'active', score: 20 },
];

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', sortable: true, accessor: r => r.name },
  { key: 'status', header: 'Status', sortable: true, accessor: r => r.status },
  { key: 'score', header: 'Score', sortable: true, accessor: r => r.score },
];

const filters: FilterDef<Row>[] = [
  {
    key: 'status',
    label: 'All statuses',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
    predicate: (r, v) => r.status === v,
  },
];

function bodyRowNames() {
  const rows = screen.getAllByRole('row').slice(1); // skip header
  return rows
    .map(r => within(r).queryAllByRole('cell')[0]?.textContent ?? '')
    .filter(Boolean);
}

describe('DataTable', () => {
  it('renders all rows initially', () => {
    render(<DataTable data={data} columns={columns} rowKey={r => r.id} />);
    expect(bodyRowNames()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('filters by search query', () => {
    render(<DataTable data={data} columns={columns} rowKey={r => r.id} searchPlaceholder="Search…" />);
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'brav' } });
    expect(bodyRowNames()).toEqual(['Bravo']);
  });

  it('filters via filter dropdown', () => {
    render(<DataTable data={data} columns={columns} filters={filters} rowKey={r => r.id} />);
    fireEvent.change(screen.getByDisplayValue('All statuses'), { target: { value: 'active' } });
    expect(bodyRowNames()).toEqual(['Alpha', 'Charlie']);
  });

  it('sorts ascending then descending on header click', () => {
    render(<DataTable data={data} columns={columns} rowKey={r => r.id} />);
    const scoreHeader = screen.getByRole('button', { name: /Score/i });

    fireEvent.click(scoreHeader); // asc by score
    expect(bodyRowNames()).toEqual(['Bravo', 'Charlie', 'Alpha']);

    fireEvent.click(scoreHeader); // desc by score
    expect(bodyRowNames()).toEqual(['Alpha', 'Charlie', 'Bravo']);
  });

  it('shows empty state when nothing matches', () => {
    render(<DataTable data={data} columns={columns} rowKey={r => r.id} searchPlaceholder="Search…" />);
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'zzz' } });
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });
});
