import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

interface EmbedConfig {
  title: string;
  description: string;
  color: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

interface SalesPanel {
  id: string;
  name: string;
  channelId: string;
  productIds: string[];
  embedConfig: EmbedConfig;
  isActive: boolean;
  messageId?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface DiscordPanelsProps {
  panels: SalesPanel[];
  onChange: (panels: SalesPanel[]) => void;
  onSave: (panels: SalesPanel[]) => void;
  saving: boolean;
}

const uid = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

export default function DiscordPanelsManager({ panels, onChange, onSave, saving }: DiscordPanelsProps) {
  const [expandedPanel, setExpandedPanel] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api.get('/api/products').then((res) => {
      setProducts(res.data || []);
    }).catch(() => {});
  }, []);

  const addPanel = () => {
    const newPanel: SalesPanel = {
      id: uid(),
      name: `Painel ${panels.length + 1}`,
      channelId: '',
      productIds: [],
      embedConfig: {
        title: 'Produtos Disponíveis',
        description: 'Selecione o produto que deseja comprar:',
        color: '#5865F2',
      },
      isActive: true,
    };
    onChange([...panels, newPanel]);
    setExpandedPanel(panels.length);
  };

  const removePanel = (index: number) => {
    onChange(panels.filter((_, i) => i !== index));
    if (expandedPanel === index) setExpandedPanel(null);
  };

  const updatePanel = (index: number, partial: Partial<SalesPanel>) => {
    const updated = [...panels];
    updated[index] = { ...updated[index], ...partial };
    onChange(updated);
  };

  const updateEmbed = (index: number, partial: Partial<EmbedConfig>) => {
    const panel = panels[index];
    updatePanel(index, { embedConfig: { ...panel.embedConfig, ...partial } });
  };

  const toggleProduct = (panelIndex: number, productId: string) => {
    const panel = panels[panelIndex];
    const ids = panel.productIds.includes(productId)
      ? panel.productIds.filter(id => id !== productId)
      : [...panel.productIds, productId];
    updatePanel(panelIndex, { productIds: ids });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Painéis de Vendas</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Crie painéis de produtos em canais do seu servidor Discord.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={addPanel}>
          <Plus size={14} /> Novo Painel
        </button>
      </div>

      {panels.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum painel criado</h3>
          <p>Clique em "Novo Painel" para começar.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {panels.map((panel, index) => (
            <div key={panel.id} className="card" style={{ padding: 0 }}>
              <div
                style={{
                  padding: '14px 20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedPanel(expandedPanel === index ? null : index)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{panel.name || `Painel ${index + 1}`}</span>
                  {panel.messageId && <span className="badge badge-success" style={{ fontSize: 11 }}>Publicado</span>}
                  {!panel.isActive && <span className="badge badge-danger" style={{ fontSize: 11 }}>Inativo</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" className="btn btn-danger btn-sm"
                    onClick={(e) => { e.stopPropagation(); removePanel(index); }}
                    style={{ padding: '4px 8px' }}>
                    <Trash2 size={12} />
                  </button>
                  {expandedPanel === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expandedPanel === index && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                    <div className="form-group">
                      <label>Nome do Painel</label>
                      <input className="input" value={panel.name}
                        onChange={(e) => updatePanel(index, { name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>ID do Canal</label>
                      <input className="input" value={panel.channelId}
                        placeholder="Clique direito no canal → Copiar ID"
                        onChange={(e) => updatePanel(index, { channelId: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ margin: '16px 0 8px', fontSize: 14, fontWeight: 600 }}>Configuração do Embed</div>
                  <div className="form-group">
                    <label>Título</label>
                    <input className="input" value={panel.embedConfig.title}
                      onChange={(e) => updateEmbed(index, { title: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Descrição</label>
                    <textarea className="input" rows={3} value={panel.embedConfig.description}
                      style={{ resize: 'vertical' }}
                      onChange={(e) => updateEmbed(index, { description: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label>Cor</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="input" value={panel.embedConfig.color}
                          onChange={(e) => updateEmbed(index, { color: e.target.value })}
                          style={{ flex: 1 }} />
                        <input type="color" value={panel.embedConfig.color || '#5865F2'}
                          onChange={(e) => updateEmbed(index, { color: e.target.value })}
                          style={{ width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'transparent' }} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>URL da Imagem</label>
                      <input className="input" value={panel.embedConfig.imageUrl || ''}
                        placeholder="https://..."
                        onChange={(e) => updateEmbed(index, { imageUrl: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>URL do Thumbnail</label>
                      <input className="input" value={panel.embedConfig.thumbnailUrl || ''}
                        placeholder="https://..."
                        onChange={(e) => updateEmbed(index, { thumbnailUrl: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ margin: '16px 0 8px', fontSize: 14, fontWeight: 600 }}>
                    Produtos ({panel.productIds.length} selecionados)
                  </div>
                  {products.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nenhum produto cadastrado.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {products.map((product) => (
                        <label key={product.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px',
                          background: panel.productIds.includes(product.id) ? 'rgba(124,58,237,0.1)' : 'var(--bg-secondary)',
                          border: `1px solid ${panel.productIds.includes(product.id) ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                        }}>
                          <input type="checkbox"
                            checked={panel.productIds.includes(product.id)}
                            onChange={() => toggleProduct(index, product.id)}
                            style={{ width: 'auto', accentColor: 'var(--accent)' }} />
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{product.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                              R$ {product.price?.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id={`active-${panel.id}`}
                      checked={panel.isActive}
                      onChange={(e) => updatePanel(index, { isActive: e.target.checked })}
                      style={{ width: 'auto' }} />
                    <label htmlFor={`active-${panel.id}`} style={{ margin: 0, fontSize: 14 }}>Painel Ativo</label>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Painéis inativos não processarão vendas.</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {panels.length} painel(is) configurado(s)
            </span>
            <button type="button" className="btn btn-primary" disabled={saving}
              onClick={() => onSave(panels)}>
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Painéis'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
