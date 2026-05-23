import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plus, Trash2 } from 'lucide-react';
import PageLoading from '../layout/PageLoading';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  isActive: boolean;
  currentUses: number;
  maxUses: number | null;
  expiresAt: string | null;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'percentage', value: '', maxUses: '', limitToOneUsePerUser: true });

  const fetchCoupons = () => {
    api.get('/api/coupons').then((res) => {
      setCoupons(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/coupons', {
      ...form,
      value: parseFloat(form.value),
      maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
    });
    setShowForm(false);
    setForm({ code: '', type: 'percentage', value: '', maxUses: '', limitToOneUsePerUser: true });
    fetchCoupons();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir cupom?')) {
      await api.delete(`/api/coupons/${id}`);
      fetchCoupons();
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Cupons</h1>
        <p>Gerencie cupons de desconto</p>
      </div>
      <div className="toolbar">
        <span className="toolbar-meta">{coupons.length} cupom(ns)</span>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Novo Cupom
        </button>
      </div>

      {showForm && (
        <div className="dialog-overlay" onClick={() => setShowForm(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Novo Cupom</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Código</label>
                <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EX: DESCONTO20" required />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="percentage">Porcentagem (%)</option>
                  <option value="fixed_amount">Valor Fixo (R$)</option>
                  <option value="free_days">Dias Grátis</option>
                </select>
              </div>
              <div className="form-group">
                <label>Valor</label>
                <input className="input" type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Máximo de usos (vazio = ilimitado)</label>
                <input className="input" type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
              </div>
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={form.limitToOneUsePerUser}
                    onChange={(e) => setForm({ ...form, limitToOneUsePerUser: e.target.checked })}
                  />
                  <span className="checkbox-text">
                    <span className="checkbox-title">Limitar a um uso por usuário</span>
                    <span className="checkbox-hint">Cada usuário só poderá usar este cupom uma vez</span>
                  </span>
                </label>
              </div>
              <div className="dialog-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <PageLoading showTitle={false} table />
      ) : coupons.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum cupom encontrado</h3>
          <p>Crie cupons de desconto para seus clientes.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Usos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="cell-mono">{c.code}</td>
                  <td>{c.type === 'percentage' ? '%' : c.type === 'fixed_amount' ? 'R$' : 'Dias'}</td>
                  <td>{c.value}{c.type === 'percentage' ? '%' : ''}</td>
                  <td>{c.currentUses}{c.maxUses ? `/${c.maxUses}` : ''}</td>
                  <td>{c.isActive ? <span className="badge badge-success">Ativo</span> : <span className="badge badge-danger">Inativo</span>}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
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
