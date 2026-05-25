import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Eye, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import DiscordEmbedPreview from './DiscordEmbedPreview';
import { useLanguage } from '../../hooks/useLanguage';

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
  type: string;
  telegramGroupId?: string;
  discordSubscriptionRoleId?: string;
}

interface DiscordPanelsProps {
  panels: SalesPanel[];
  onChange: (panels: SalesPanel[]) => void;
  onSave: (panels: SalesPanel[]) => void;
  saving: boolean;
  platform?: string;
}

const uid = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

export default function DiscordPanelsManager({ panels, onChange, onSave, saving, platform }: DiscordPanelsProps) {
  const { t } = useLanguage();
  const [expandedPanel, setExpandedPanel] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api.get('/api/products').then((res) => {
      setProducts(res.data || []);
    }).catch(() => {});
  }, []);

  const filteredProducts = products.filter((product) => {
    if (product.type !== 'subscription') return true;
    if (platform === 'telegram') return !!product.telegramGroupId;
    if (platform === 'discord') return !!product.discordSubscriptionRoleId;
    return true;
  });

  const allowedProductIds = new Set(filteredProducts.map((product) => product.id));

  const addPanel = () => {
    const newPanel: SalesPanel = {
      id: uid(),
      name: `${t('botsPage.panels.newPanel')} ${panels.length + 1}`,
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
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t('botsPage.panels.title')}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {t('botsPage.panels.desc')}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={addPanel}>
          <Plus size={14} /> {t('botsPage.panels.newPanel')}
        </button>
      </div>

      {panels.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--accent)' }}>
            <MessageSquare size={24} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t('botsPage.panels.emptyTitle')}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
            {t('botsPage.panels.emptyDesc')}
          </p>
          <button type="button" className="btn btn-primary" onClick={addPanel}>
            <Plus size={16} /> {t('botsPage.panels.newPanel')}
          </button>
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
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: panel.embedConfig.color || '#5865F2',
                    boxShadow: `0 0 8px ${panel.embedConfig.color || '#5865F2'}`,
                    flexShrink: 0,
                    transition: 'background 0.2s, box-shadow 0.2s',
                  }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{panel.name || t('botsPage.panels.panelNameFallback')}</span>
                  {panel.messageId && <span className="badge badge-success" style={{ fontSize: 11 }}>{t('botsPage.panels.published')}</span>}
                  {!panel.isActive && <span className="badge badge-danger" style={{ fontSize: 11 }}>{t('botsPage.panels.inactive')}</span>}
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
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 24,
                    padding: '20px 20px',
                    alignItems: 'start',
                  }}>
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                          <label>{t('botsPage.panels.panelName')}</label>
                          <input className="input" value={panel.name}
                            onChange={(e) => updatePanel(index, { name: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>{t('botsPage.panels.channelId')}</label>
                          <input className="input" value={panel.channelId}
                            placeholder={t('botsPage.panels.channelIdPlaceholder')}
                            onChange={(e) => updatePanel(index, { channelId: e.target.value })} />
                        </div>
                      </div>

                      <div style={{ margin: '8px 0 8px', fontSize: 14, fontWeight: 600 }}>{t('botsPage.panels.embedConfig')}</div>
                      <div className="form-group">
                        <label>{t('botsPage.panels.embedTitle')}</label>
                        <input className="input" value={panel.embedConfig.title}
                          onChange={(e) => updateEmbed(index, { title: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>{t('botsPage.panels.embedDesc')}</label>
                        <textarea className="input" rows={3} value={panel.embedConfig.description}
                          style={{ resize: 'vertical' }}
                          onChange={(e) => updateEmbed(index, { description: e.target.value })} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                          <label>{t('botsPage.panels.embedColor')}</label>
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
                          <label>{t('botsPage.panels.embedImage')}</label>
                          <input className="input" value={panel.embedConfig.imageUrl || ''}
                            placeholder="https://..."
                            onChange={(e) => updateEmbed(index, { imageUrl: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>{t('botsPage.panels.embedThumb')}</label>
                          <input className="input" value={panel.embedConfig.thumbnailUrl || ''}
                            placeholder="https://..."
                            onChange={(e) => updateEmbed(index, { thumbnailUrl: e.target.value })} />
                        </div>
                      </div>

                      <div style={{ margin: '8px 0 8px', fontSize: 14, fontWeight: 600 }}>
                        {t('botsPage.panels.productsLabel')} ({panel.productIds.length})
                      </div>
                      {filteredProducts.length === 0 ? (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('botsPage.panels.noProducts')}</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {filteredProducts.map((product) => (
                            <label key={product.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 12px',
                              background: panel.productIds.includes(product.id) ? 'rgba(88,101,242,0.1)' : 'var(--bg-secondary)',
                              border: `1px solid ${panel.productIds.includes(product.id) ? '#5865F2' : 'var(--border)'}`,
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              transition: 'var(--transition)',
                            }}>
                              <input type="checkbox"
                                checked={panel.productIds.includes(product.id)}
                                onChange={() => toggleProduct(index, product.id)}
                                style={{ width: 'auto', accentColor: '#5865F2' }} />
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>{product.name}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                                  R$ {Number(product.price || 0).toFixed(2).replace('.', ',')}
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
                        <label htmlFor={`active-${panel.id}`} style={{ margin: 0, fontSize: 14 }}>{t('botsPage.panels.activeLabel')}</label>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('botsPage.panels.activeDesc')}</span>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      position: 'sticky',
                      top: 20,
                    }}>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <Eye size={13} /> {t('botsPage.panels.livePreview')}
                      </div>
                      <DiscordEmbedPreview
                        embedConfig={panel.embedConfig}
                        productIds={panel.productIds}
                        products={filteredProducts}
                        panelName={panel.name}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 320 }}>
                        {t('botsPage.panels.previewHint')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {panels.length} {t('botsPage.panels.panelsCount')}
            </span>
            <button type="button" className="btn btn-primary" disabled={saving}
              onClick={() => onSave(panels.map((panel) => ({
                ...panel,
                productIds: panel.productIds.filter((id) => allowedProductIds.has(id)),
              })))}>
              <Save size={16} /> {saving ? t('botsPage.panels.saving') : t('botsPage.panels.savePanels')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
