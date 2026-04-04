import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Trash2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  state: string;
  plan: string;
  telegramId: number;
  discordId: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    api.get('/api/users').then((res) => {
      setUsers(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      await api.delete(`/api/users/${id}`);
      fetchUsers();
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'active': return <span className="badge badge-success">Ativo</span>;
      case 'expired': return <span className="badge badge-warning">Expirado</span>;
      default: return <span className="badge badge-danger">Inativo</span>;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Usuários</h1>
        <p>Usuários do bot</p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum usuário encontrado</h3>
          <p>Os usuários aparecerão aqui quando interagirem com o bot.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Plataforma</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name || u.username || u.email || 'Sem nome'}</td>
                  <td>{u.telegramId ? 'Telegram' : u.discordId ? 'Discord' : 'N/A'}</td>
                  <td>{getStateBadge(u.state)}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
