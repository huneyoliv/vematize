import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Trash2 } from 'lucide-react';
import PageLoading from '../layout/PageLoading';
import { useLanguage } from '../../hooks/useLanguage';

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
  const { t } = useLanguage();
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
    if (confirm(t('usersPage.deleteConfirm'))) {
      await api.delete(`/api/users/${id}`);
      fetchUsers();
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'active': return <span className="badge badge-success">{t('usersPage.statusActive')}</span>;
      case 'expired': return <span className="badge badge-warning">{t('usersPage.statusExpired')}</span>;
      default: return <span className="badge badge-danger">{t('usersPage.statusInactive')}</span>;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('usersPage.title')}</h1>
        <p>{t('usersPage.subtitle')}</p>
      </div>

      {loading ? (
        <PageLoading showTitle={false} table />
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h3>{t('usersPage.emptyTitle')}</h3>
          <p>{t('usersPage.emptyDesc')}</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('usersPage.thName')}</th>
                <th>{t('usersPage.thPlatform')}</th>
                <th>{t('usersPage.thStatus')}</th>
                <th>{t('usersPage.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-strong">{u.name || u.username || u.email || t('usersPage.unnamed')}</td>
                  <td>{u.telegramId ? t('usersPage.platformTelegram') : u.discordId ? t('usersPage.platformDiscord') : t('usersPage.platformNA')}</td>
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
