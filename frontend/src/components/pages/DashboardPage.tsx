import { useEffect, useState } from 'react';
import api from '../../services/api';
import PageLoading from '../layout/PageLoading';
import { useLanguage } from '../../hooks/useLanguage';

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
  const { t } = useLanguage();

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
        <h1>{t('dashboard.title')}</h1>
        <p>{t('dashboard.subtitle')}</p>
      </div>
      <div className="grid grid-4">
        <div className="stat-card">
          <span className="stat-label">{t('dashboard.totalUsers')}</span>
          <span className="stat-value">{stats?.totalUsers ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('dashboard.activeUsers')}</span>
          <span className="stat-value">{stats?.activeUsers ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('dashboard.products')}</span>
          <span className="stat-value">{stats?.totalProducts ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t('dashboard.approvedSales')}</span>
          <span className="stat-value">{stats?.approvedSales ?? 0}</span>
        </div>
      </div>
    </div>
  );
}
