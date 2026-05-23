import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plus, Trash2, Pencil, Key, Hash } from 'lucide-react';
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
  activationCodes?: string[];
  activationCodesUsed?: string[];
  createdAt: string;
}

export default function ProductsPage() {
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
    const payload: any = {
      name: form.name,
      price: parseFloat(form.price),
      type: form.type,
      productSubtype: form.productSubtype,
      description: form.description,
      durationDays: form.type === 'subscription' ? parseInt(form.durationDays) || 30 : null,
    };

    if (form.productSubtype === 'activation_codes') {
      payload.activationCodes = form.keysText
        .split('\n')
        .map((k) => k.trim())
        .filter(Boolean);
    } else {
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
    });
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
      productSubtype: p.productSubtype || 'standard',
      stock: p.stock !== null && p.stock !== undefined ? String(p.stock) : '',
      keysText: p.activationCodes?.join('\n') || '',
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
        <p>Gerencie seus produtos, chaves de ativação e estoque</p>
      </div>
      <div className="toolbar">
        <span className="toolbar-meta">{products.length} produto(s)</span>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
        >
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
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Preço (R$)</label>
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
                <label>Tipo</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="product">Produto</option>
                  <option value="subscription">Assinatura</option>
                </select>
              </div>
              {form.type === 'subscription' && (
                <div className="form-group">
                  <label>Duração da Assinatura (dias)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={form.durationDays}
                    onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Subtipo / Entrega</label>
                <select
                  className="input"
                  value={form.productSubtype}
                  onChange={(e) => setForm({ ...form, productSubtype: e.target.value })}
                >
                  <option value="standard">Entrega Manual (Estoque numérico)</option>
                  <option value="activation_codes">Entrega Automática (Chaves/Códigos de Ativação)</option>
                </select>
              </div>

              {form.productSubtype === 'activation_codes' ? (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ margin: 0 }}>Chaves de Ativação (uma por linha)</label>
                    <span style={{ fontSize: '11px', opacity: 0.7, background: 'rgba(255,255,255,0.07)', padding: '2px 6px', borderRadius: '4px' }}>
                      Estoque calculado: {form.keysText.split('\n').filter(Boolean).length}
                    </span>
                  </div>
                  <textarea
                    className="input"
                    rows={6}
                    style={{ fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
                    value={form.keysText}
                    onChange={(e) => setForm({ ...form, keysText: e.target.value })}
                    placeholder="exemplo-chave-1&#10;exemplo-chave-2&#10;exemplo-chave-3"
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>Quantidade em Estoque</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder="Deixe em branco para ilimitado"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Descrição</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="dialog-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Salvar' : 'Criar'}
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
                <th>Estoque</th>
                <th>Subtipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{formatCurrency(Number(p.price))}</td>
                  <td>
                    <span className={`badge ${p.type === 'subscription' ? 'badge-warning' : 'badge-success'}`}>
                      {p.type === 'subscription' ? `Assinatura (${p.durationDays || 30} dias)` : 'Produto'}
                    </span>
                  </td>
                  <td>
                    {p.productSubtype === 'activation_codes' ? (
                      <span className="cell-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Key size={12} /> {p.stock ?? 0} restando
                      </span>
                    ) : p.stock !== null && p.stock !== undefined ? (
                      <span className="cell-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Hash size={12} /> {p.stock} un.
                      </span>
                    ) : (
                      <span className="cell-meta" style={{ opacity: 0.6 }}>Ilimitado</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', textTransform: 'capitalize', opacity: 0.8 }}>
                      {p.productSubtype === 'activation_codes' ? 'Entrega Automática' : 'Entrega Manual'}
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
