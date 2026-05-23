import { useEffect, useState } from 'react';
import api from '../../services/api';
import PageLoading from '../layout/PageLoading';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  totalSales: number;
  approvedSales: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard').then((res) => {
      setStats(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageLoading stats />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Visão geral do seu negócio</p>
      </div>
      <div className="grid grid-4">
        <div className="stat-card">
          <span className="stat-label">Total usuários</span>
          <span className="stat-value">{stats?.totalUsers ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Usuários ativos</span>
          <span className="stat-value">{stats?.activeUsers ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Produtos</span>
          <span className="stat-value">{stats?.totalProducts ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vendas aprovadas</span>
          <span className="stat-value">{stats?.approvedSales ?? 0}</span>
        </div>
      </div>
    </div>
  );
}
