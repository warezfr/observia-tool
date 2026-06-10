import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Plus, Trash2 } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive';
}

const mockUsers: User[] = [
  { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'admin', status: 'active' },
  { id: 2, name: 'Editor User', email: 'editor@example.com', role: 'editor', status: 'active' },
];

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');

  const handleInvite = () => {
    if (!email) return;
    const newUser: User = {
      id: Math.max(...users.map(u => u.id)) + 1,
      name: email.split('@')[0],
      email,
      role,
      status: 'active',
    };
    setUsers([...users, newUser]);
    setEmail('');
    setShowInvite(false);
  };

  const handleDelete = (id: number) => {
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowInvite(!showInvite)} className="flex items-center gap-2">
          <Plus size={18} />
          Invite User
        </Button>
      </div>

      {showInvite && (
        <Card>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value as any)}
              className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleInvite}>
                Send Invite
              </Button>
              <Button variant="ghost" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {users.map(user => (
          <Card key={user.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-slate-400">{user.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="info">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Badge>
                <Badge variant="success">{user.status}</Badge>
              </div>
            </div>
            <button
              onClick={() => handleDelete(user.id)}
              className="p-2 hover:bg-slate-700 rounded transition-colors text-error"
            >
              <Trash2 size={18} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
