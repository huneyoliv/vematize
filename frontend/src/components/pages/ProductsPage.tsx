import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Pencil } from 'lucide-react';
import PageLoading from '../layout/PageLoading';

interface Product {
  id: string;
  name: string;
  price: number;
  type: string;
  productSubtype: string;
  stock: number | null;
  description?: string;
  durationDays?: number | null;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', price: '', type: 'product', description: '', durationDays: '' });

  const fetchProducts = () => {
    api.get('/api/products').then((res) => {
      setProducts(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price),
      durationDays: form.type === 'subscription' ? parseInt(form.durationDays) || 30 : null,
    };
    if (editingId) {
      await api.put(`/api/products/${editingId}`, payload);
    } else {
      await api.post('/api/products', payload);
    }
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', price: '', type: 'product', description: '', durationDays: '' });
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await api.delete(`/api/products/${id}`);
      fetchProducts();
    }
  };

  const startEdit = (p: Product) => {
    setForm({
      name: p.name,
      price: String(p.price),
      type: p.type,
      description: p.description || '',
      durationDays: p.durationDays ? String(p.durationDays) : '',
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div>
      <div className="page-header">
        <h1>Produtos</h1>
        <p>Gerencie seus produtos e assinaturas</p>
      </div>
      <div className="toolbar">
        <span className="toolbar-meta">{products.length} produto(s)</span>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', price: '', type: 'product', description: '', durationDays: '' }); }}>
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      {showForm && (
        <div className="dialog-overlay" onClick={() => setShowForm(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Editar Produto' : 'Novo Produto'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Preço (R$)</label>
                <input className="input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="product">Produto</option>
                  <option value="subscription">Assinatura</option>
                </select>
              </div>
              {form.type === 'subscription' && (
                <div className="form-group">
                  <label>Duração da Assinatura (dias)</label>
                  <input className="input" type="number" min="1" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} required />
                </div>
              )}
              <div className="form-group">
                <label>Descrição</label>
                <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="dialog-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <PageLoading showTitle={false} table />
      ) : products.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum produto encontrado</h3>
          <p>Crie seu primeiro produto clicando no botão acima.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Preço</th>
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{formatCurrency(Number(p.price))}</td>
                  <td><span className={`badge ${p.type === 'subscription' ? 'badge-warning' : 'badge-success'}`}>{p.type === 'subscription' ? `Assinatura (${p.durationDays || 30} dias)` : 'Produto'}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
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
