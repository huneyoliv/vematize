import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Pencil, Key, Hash } from 'lucide-react';
import PageLoading from '../layout/PageLoading';
import { useLanguage } from '../../hooks/useLanguage';

interface Product {
  id: string;
  name: string;
  price: number;
  type: string;
  productSubtype: string;
  stock: number | null;
  description?: string;
  durationDays?: number | null;
  telegramGroupId?: string;
  isTelegramGroupAccess?: boolean;
  discordSubscriptionRoleId?: string;
  activationCodes?: string[];
  activationCodesUsed?: string[];
  createdAt: string;
}

export default function ProductsPage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    price: '',
    type: 'product',
    productSubtype: 'standard',
    stock: '',
    keysText: '',
    description: '',
    durationDays: '',
    telegramGroupId: '',
    discordSubscriptionRoleId: '',
    subscriptionPlatform: 'telegram',
  });

  const fetchProducts = () => {
    api.get('/api/products').then((res) => {
      setProducts(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isSubscription = form.type === 'subscription';
    const wantsTelegram = isSubscription && (form.subscriptionPlatform === 'telegram' || form.subscriptionPlatform === 'both');
    const wantsDiscord = isSubscription && (form.subscriptionPlatform === 'discord' || form.subscriptionPlatform === 'both');

    const payload: any = {
      name: form.name,
      price: parseFloat(form.price),
      type: form.type,
      productSubtype: isSubscription ? 'standard' : form.productSubtype,
      description: form.description,
      durationDays: isSubscription ? parseInt(form.durationDays) || 30 : null,
      telegramGroupId: wantsTelegram ? form.telegramGroupId : null,
      discordSubscriptionRoleId: wantsDiscord ? form.discordSubscriptionRoleId : null,
      isTelegramGroupAccess: wantsTelegram,
    };

    if (!isSubscription && form.productSubtype === 'activation_codes') {
      payload.activationCodes = form.keysText
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean);
    } else if (!isSubscription) {
      payload.stock = form.stock ? parseInt(form.stock) : null;
    }

    if (editingId) {
      await api.put(`/api/products/${editingId}`, payload);
    } else {
      await api.post('/api/products', payload);
    }
    setShowForm(false);
    setEditingId(null);
    resetForm();
    fetchProducts();
  };

  const resetForm = () => {
    setForm({
      name: '',
      price: '',
      type: 'product',
      productSubtype: 'standard',
      stock: '',
      keysText: '',
      description: '',
      durationDays: '',
      telegramGroupId: '',
      discordSubscriptionRoleId: '',
      subscriptionPlatform: 'telegram',
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('productsPage.deleteConfirm'))) {
      await api.delete(`/api/products/${id}`);
      fetchProducts();
    }
  };

  const startEdit = (p: Product) => {
    const hasTelegram = !!p.telegramGroupId;
    const hasDiscord = !!p.discordSubscriptionRoleId;
    const subscriptionPlatform = hasTelegram && hasDiscord ? 'both' : hasDiscord ? 'discord' : 'telegram';

    setForm({
      name: p.name,
      price: String(p.price),
      type: p.type,
      productSubtype: p.productSubtype || 'standard',
      stock: p.stock !== null && p.stock !== undefined ? String(p.stock) : '',
      keysText: p.activationCodes?.join('\n') || '',
      description: p.description || '',
      durationDays: p.durationDays ? String(p.durationDays) : '',
      telegramGroupId: p.telegramGroupId || '',
      discordSubscriptionRoleId: p.discordSubscriptionRoleId || '',
      subscriptionPlatform,
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div>
      <div className="page-header">
        <h1>{t('productsPage.title')}</h1>
        <p>{t('productsPage.subtitle')}</p>
      </div>
      <div className="toolbar">
        <span className="toolbar-meta">{t('productsPage.count').replace('{{count}}', String(products.length))}</span>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
        >
          <Plus size={16} /> {t('productsPage.newProduct')}
        </button>
      </div>

      {showForm && (
        <div className="dialog-overlay" onClick={() => setShowForm(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? t('productsPage.editProduct') : t('productsPage.newProduct')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{t('productsPage.formName')}</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('productsPage.formPrice')}</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('productsPage.formType')}</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="product">{t('productsPage.typeProduct')}</option>
                  <option value="subscription">{t('productsPage.typeSubscription')}</option>
                </select>
              </div>
              {form.type === 'subscription' && (
                <>
                  <div className="form-group">
                    <label>{t('productsPage.formDuration')}</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={form.durationDays}
                      onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('productsPage.formPlatform')}</label>
                    <select
                      className="input"
                      value={form.subscriptionPlatform}
                      onChange={(e) => {
                        const value = e.target.value;
                        setForm({
                          ...form,
                          subscriptionPlatform: value,
                          telegramGroupId: value === 'discord' ? '' : form.telegramGroupId,
                          discordSubscriptionRoleId: value === 'telegram' ? '' : form.discordSubscriptionRoleId,
                        });
                      }}
                    >
                      <option value="telegram">{t('productsPage.platformTelegram')}</option>
                      <option value="discord">{t('productsPage.platformDiscord')}</option>
                      <option value="both">{t('productsPage.platformBoth')}</option>
                    </select>
                  </div>
                  {(form.subscriptionPlatform === 'telegram' || form.subscriptionPlatform === 'both') && (
                    <div className="form-group">
                      <label>{t('productsPage.formTelegramId')}</label>
                      <input
                        className="input"
                        value={form.telegramGroupId}
                        onChange={(e) => setForm({ ...form, telegramGroupId: e.target.value })}
                        placeholder={t('productsPage.formTelegramIdPlaceholder')}
                        required
                      />
                    </div>
                  )}
                  {(form.subscriptionPlatform === 'discord' || form.subscriptionPlatform === 'both') && (
                    <div className="form-group">
                      <label>{t('productsPage.formDiscordId')}</label>
                      <input
                        className="input"
                        value={form.discordSubscriptionRoleId}
                        onChange={(e) => setForm({ ...form, discordSubscriptionRoleId: e.target.value })}
                        placeholder={t('productsPage.formDiscordIdPlaceholder')}
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {form.type !== 'subscription' && (
                <>
                  <div className="form-group">
                    <label>{t('productsPage.formSubtype')}</label>
                    <select
                      className="input"
                      value={form.productSubtype}
                      onChange={(e) => setForm({ ...form, productSubtype: e.target.value })}
                    >
                      <option value="standard">{t('productsPage.subtypeManual')}</option>
                      <option value="activation_codes">{t('productsPage.subtypeAuto')}</option>
                    </select>
                  </div>

                  {form.productSubtype === 'activation_codes' ? (
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ margin: 0 }}>{t('productsPage.formKeys')}</label>
                        <span style={{ fontSize: '11px', opacity: 0.7, background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: '4px' }}>
                          {t('productsPage.calcStock').replace('{{count}}', String(form.keysText.split('\n').filter(Boolean).length))}
                        </span>
                      </div>
                      <textarea
                        className="input"
                        rows={6}
                        style={{ fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
                        value={form.keysText}
                        onChange={(e) => setForm({ ...form, keysText: e.target.value })}
                        placeholder={t('productsPage.keysPlaceholder')}
                        required
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>{t('productsPage.formStock')}</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        placeholder={t('productsPage.stockPlaceholder')}
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="form-group">
                <label>{t('productsPage.formDesc')}</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="dialog-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  {t('productsPage.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? t('productsPage.save') : t('productsPage.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <PageLoading showTitle={false} table />
      ) : products.length === 0 ? (
        <div className="empty-state">
          <h3>{t('productsPage.emptyTitle')}</h3>
          <p>{t('productsPage.emptyDesc')}</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('productsPage.thName')}</th>
                <th>{t('productsPage.thPrice')}</th>
                <th>{t('productsPage.thType')}</th>
                <th>{t('productsPage.thStock')}</th>
                <th>{t('productsPage.thSubtype')}</th>
                <th>{t('productsPage.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{formatCurrency(Number(p.price))}</td>
                  <td>
                    <span className={`badge ${p.type === 'subscription' ? 'badge-warning' : 'badge-success'}`}>
                      {p.type === 'subscription' ? t('productsPage.badgeSubscription').replace('{{days}}', String(p.durationDays || 30)) : t('productsPage.badgeProduct')}
                    </span>
                  </td>
                  <td>
                    {p.productSubtype === 'activation_codes' ? (
                      <span className="cell-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Key size={12} /> {t('productsPage.stockRemaining').replace('{{count}}', String(p.stock ?? 0))}
                      </span>
                    ) : p.stock !== null && p.stock !== undefined ? (
                      <span className="cell-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Hash size={12} /> {t('productsPage.stockUnits').replace('{{count}}', String(p.stock))}
                      </span>
                    ) : (
                      <span className="cell-meta" style={{ opacity: 0.6 }}>{t('productsPage.stockUnlimited')}</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', textTransform: 'capitalize', opacity: 0.8 }}>
                      {p.productSubtype === 'activation_codes' ? t('productsPage.subtypeAuto') : t('productsPage.subtypeManual')}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
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
