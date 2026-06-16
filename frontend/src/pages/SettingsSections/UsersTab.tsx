import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Plus, Trash2 } from 'lucide-react';
import { usersApi, type User } from '../../services/users-api';
import { useToast } from '../../contexts/ToastContext';

export default function UsersTab() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [error, setError] = useState('');

  const reload = () =>
    usersApi
      .list()
      .then((u) => {
        setUsers(u);
        setError('');
      })
      .catch(() => setError('User management requires authentication to be enabled.'));

  useEffect(() => {
    reload();
  }, []);

  const handleCreate = async () => {
    if (!username || !password) {
      toast.error('Username and password are required');
      return;
    }
    try {
      await usersApi.create({ username, password, role });
      toast.success('User created');
      setUsername('');
      setPassword('');
      setShowInvite(false);
      reload();
    } catch {
      /* toast handled by interceptor */
    }
  };

  const handleDelete = async (id: number) => {
    await usersApi.delete(id);
    reload();
  };

  return (
    <div className="space-y-4">
      {error && (
        <Card bodyClassName="p-4">
          <p className="text-sm text-fg-muted">{error}</p>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setShowInvite(!showInvite)} className="flex items-center gap-2">
          <Plus size={18} /> Add User
        </Button>
      </div>

      {showInvite && (
        <Card>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent"
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'viewer')}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-fg focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleCreate}>Create</Button>
              <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {users.map((user) => (
          <Card key={user.id} bodyClassName="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-fg">{user.username}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="info">{user.role}</Badge>
                <Badge variant={user.is_active ? 'success' : 'default'}>
                  {user.is_active ? 'active' : 'inactive'}
                </Badge>
              </div>
            </div>
            <button
              onClick={() => handleDelete(user.id)}
              className="p-2 rounded-lg text-fg-muted hover:text-error hover:bg-error/10 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
