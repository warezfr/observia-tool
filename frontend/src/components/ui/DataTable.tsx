import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  /** Value used for sorting and global search. */
  accessor?: (row: T) => string | number | null | undefined;
  /** Custom cell renderer (falls back to accessor value). */
  render?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface FilterDef<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  predicate: (row: T, value: string) => boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  filters?: FilterDef<T>[];
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  className?: string;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

export default function DataTable<T>({
  data,
  columns,
  rowKey,
  filters = [],
  searchPlaceholder = 'Search…',
  onRowClick,
  emptyState,
  initialSort = undefined,
  className = '',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState>(initialSort ?? null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const accessorMap = useMemo(() => {
    const m = new Map<string, NonNullable<Column<T>['accessor']>>();
    columns.forEach(c => {
      if (c.accessor) m.set(c.key, c.accessor);
    });
    return m;
  }, [columns]);

  const processed = useMemo(() => {
    let rows = data;

    for (const f of filters) {
      const v = filterValues[f.key];
      if (v) rows = rows.filter(r => f.predicate(r, v));
    }

    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(row =>
        columns.some(c => {
          const val = c.accessor?.(row);
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }

    if (sort) {
      const acc = accessorMap.get(sort.key);
      if (acc) {
        rows = [...rows].sort((a, b) => {
          const av = acc(a);
          const bv = acc(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          let cmp: number;
          if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
          else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }

    return rows;
  }, [data, filters, filterValues, query, sort, columns, accessorMap]);

  const toggleSort = (key: string) => {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
          />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent"
          />
        </div>
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <select
                key={f.key}
                value={filterValues[f.key] ?? ''}
                onChange={e =>
                  setFilterValues(prev => ({ ...prev, [f.key]: e.target.value }))
                }
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent"
              >
                <option value="">{f.label}</option>
                {f.options.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map(c => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted ${c.headerClassName ?? ''}`}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 hover:text-fg transition-colors"
                      >
                        {c.header}
                        {active ? (
                          sort?.dir === 'asc' ? (
                            <ArrowUp size={13} />
                          ) : (
                            <ArrowDown size={13} />
                          )
                        ) : (
                          <ChevronsUpDown size={13} className="opacity-50" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {processed.map(row => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-border last:border-0 transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-fg/[0.03]' : ''
                }`}
              >
                {columns.map(c => (
                  <td key={c.key} className={`px-4 py-3 text-fg-secondary align-middle ${c.className ?? ''}`}>
                    {c.render ? c.render(row) : (c.accessor?.(row) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {processed.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  {emptyState ?? (
                    <span className="text-sm text-fg-muted">No results found.</span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
