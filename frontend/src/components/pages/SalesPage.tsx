import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import api from '../../services/api';
import PageLoading from '../layout/PageLoading';
import { useLanguage } from '../../hooks/useLanguage';

interface Sale {
  id: string;
  productId: string;
  userId: string;
  status: string;
  paymentGateway: string;
  quantity: number;
  totalPrice: number | null;
  couponCode: string | null;
  telegramChatId: number | null;
  discordThreadId: string | null;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

export default function SalesPage() {
  const { t } = useLanguage();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/sales'),
      api.get('/api/products'),
    ]).then(([salesRes, productsRes]) => {
      setSales(salesRes.data);
      const prodMap: Record<string, Product> = {};
      (productsRes.data || []).forEach((p: Product) => { prodMap[p.id] = p; });
      setProducts(prodMap);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="badge badge-success">{t('salesPage.statusApproved')}</span>;
      case 'pending': return <span className="badge badge-warning">{t('salesPage.statusPending')}</span>;
      case 'failed': return <span className="badge badge-danger">{t('salesPage.statusFailed')}</span>;
      default: return <span className="badge badge-muted">{status}</span>;
    }
  };

  const getGatewayLabel = (gw: string) => {
    switch (gw) {
      case 'mercadopago': return t('salesPage.gwMercadoPago');
      case 'efi': return t('salesPage.gwEfi');
      case 'free': return t('salesPage.gwFree');
      case 'pending': return t('salesPage.gwPending');
      default: return gw;
    }
  };

  const getPlatformBadge = (sale: Sale) => {
    if (sale.telegramChatId) return <span className="badge badge-telegram">Telegram</span>;
    if (sale.discordThreadId) return <span className="badge badge-discord">Discord</span>;
    return <span className="badge badge-muted">API</span>;
  };

  const approvedCount = sales.filter(s => s.status === 'approved').length;
  const totalRevenue = sales
    .filter(s => s.status === 'approved')
    .reduce((sum, s) => sum + Number(s.totalPrice || products[s.productId]?.price || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>{t('salesPage.title')}</h1>
        <p>{t('salesPage.subtitle')}</p>
      </div>

      {!loading && sales.length > 0 && (
        <div className="grid grid-4 stats-grid">
          <div className="stat-card">
            <span className="stat-label">{t('salesPage.statTotal')}</span>
            <span className="stat-value">{sales.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">{t('salesPage.statApproved')}</span>
            <span className="stat-value">{approvedCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">{t('salesPage.statRevenue')}</span>
            <span className="stat-value stat-value--currency">{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">{t('salesPage.statPending')}</span>
            <span className="stat-value">{sales.filter(s => s.status === 'pending').length}</span>
          </div>
        </div>
      )}

      {loading ? (
        <PageLoading stats table />
      ) : sales.length === 0 ? (
        <div className="empty-state">
          <h3>{t('salesPage.emptyTitle')}</h3>
          <p>{t('salesPage.emptyDesc')}</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('salesPage.thProduct')}</th>
                <th>{t('salesPage.thValue')}</th>
                <th>{t('salesPage.thGateway')}</th>
                <th>{t('salesPage.thPlatform')}</th>
                <th>{t('salesPage.thStatus')}</th>
                <th>{t('salesPage.thDate')}</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td className="cell-strong">
                    {products[s.productId]?.name || (
                      <span className="cell-mono" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>
                        {s.productId.slice(0, 8)}...
                      </span>
                    )}
                  </td>
                  <td>
                    {s.totalPrice
                      ? formatCurrency(Number(s.totalPrice))
                      : products[s.productId]
                        ? formatCurrency(Number(products[s.productId].price))
                        : '—'}
                    {s.couponCode && (
                      <span className="coupon-tag">
                        <Tag size={11} aria-hidden />
                        {s.couponCode}
                      </span>
                    )}
                  </td>
                  <td>{getGatewayLabel(s.paymentGateway)}</td>
                  <td>{getPlatformBadge(s)}</td>
                  <td>{getStatusBadge(s.status)}</td>
                  <td>{new Date(s.createdAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
