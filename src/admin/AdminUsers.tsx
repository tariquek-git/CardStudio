import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import DataTable from './components/DataTable';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  designCount: number;
  lastLogin: string | null;
  disabled: boolean;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

const ROLE_STYLES: Record<string, string> = {
  USER: 'bg-slate-700 text-slate-300',
  ADMIN: 'bg-sky-500/20 text-sky-400',
  SUPER_ADMIN: 'bg-violet-500/20 text-violet-400',
};

const ROLE_LABELS: Record<string, string> = {
  USER: 'User',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

export default function AdminUsers() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
    });
    apiFetch<UsersResponse>(`/admin/users?${params}`)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await apiFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
    } catch {
      // silent fail — real app would show toast
    }
  };

  const handleToggleDisable = async (userId: string, disabled: boolean) => {
    try {
      await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ disabled: !disabled }),
      });
      fetchUsers();
    } catch {
      // silent fail
    }
  };

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-red-400">
        <p className="font-medium">Failed to load users</p>
        <p className="text-sm mt-1 text-red-400/70">{error}</p>
      </div>
    );
  }

  const columns = [
    { key: 'name', label: 'Name', width: '20%' },
    { key: 'email', label: 'Email', width: '25%' },
    {
      key: 'role',
      label: 'Role',
      width: '12%',
      render: (value: string) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[value] || ROLE_STYLES.USER}`}
        >
          {ROLE_LABELS[value] || value}
        </span>
      ),
    },
    {
      key: 'designCount',
      label: 'Designs',
      width: '8%',
      render: (value: number) => (
        <span className="text-slate-400">{value}</span>
      ),
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      width: '15%',
      render: (value: string | null) =>
        value ? (
          <span className="text-slate-400 text-xs">
            {new Date(value).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-slate-600 text-xs">Never</span>
        ),
    },
    {
      key: 'id',
      label: 'Actions',
      width: '20%',
      render: (_: string, row: User) => (
        <div className="flex items-center gap-2">
          <select
            value={row.role}
            onChange={(e) => handleChangeRole(row.id, e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <button
            onClick={() => handleToggleDisable(row.id, row.disabled)}
            className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
              row.disabled
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            }`}
          >
            {row.disabled ? 'Enable' : 'Disable'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-100">Users</h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-64"
          />
          <button
            type="submit"
            className="bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      <DataTable
        columns={columns}
        data={data?.users ?? []}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
