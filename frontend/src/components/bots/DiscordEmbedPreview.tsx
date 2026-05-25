interface EmbedConfig {
  title: string;
  description: string;
  color: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface DiscordEmbedPreviewProps {
  embedConfig: EmbedConfig;
  productIds: string[];
  products: Product[];
  panelName: string;
}

import { useLanguage } from '../../hooks/useLanguage';

export default function DiscordEmbedPreview({ embedConfig, productIds, products, panelName }: DiscordEmbedPreviewProps) {
  const { t } = useLanguage();
  const selectedProducts = products.filter(p => productIds.includes(p.id));
  const accentColor = embedConfig.color || '#5865F2';

  return (
    <div style={{
      background: '#313338',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.06)',
      width: 320,
      flexShrink: 0,
    }}>
      <div style={{
        background: '#2b2d31',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#3ba55c',
          boxShadow: '0 0 6px #3ba55c',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#96989d',
          letterSpacing: '0.02em',
        }}>
          # {panelName ? panelName.toLowerCase().replace(/\s/g, '-') : 'canal-de-vendas'}
        </span>
      </div>

      <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #5865F2, #7289da)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}>🤖</div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#5865F2' }}>{t('botsPage.panels.yourBot')}</span>
            <span style={{
              fontSize: 10,
              background: '#5865F2',
              color: '#fff',
              borderRadius: 3,
              padding: '1px 4px',
              marginLeft: 6,
              fontWeight: 700,
              verticalAlign: 'middle',
            }}>BOT</span>
            <div style={{ fontSize: 11, color: '#949898', marginTop: 1 }}>{t('botsPage.panels.now')}</div>
          </div>
        </div>

        <div style={{
          borderLeft: `4px solid ${accentColor}`,
          background: '#2b2d31',
          borderRadius: '0 6px 6px 0',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}>
          {embedConfig.thumbnailUrl && (
            <div style={{ float: 'right', margin: '12px 12px 0 0' }}>
              <img
                src={embedConfig.thumbnailUrl}
                alt="thumbnail"
                style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 6, lineHeight: 1.3 }}>
              {embedConfig.title || <span style={{ color: '#6d6f78', fontStyle: 'italic' }}>{t('botsPage.panels.embedTitlePlaceholder')}</span>}
            </div>
            <div style={{ fontSize: 13, color: '#b5bac1', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {embedConfig.description || <span style={{ color: '#4d4f58', fontStyle: 'italic' }}>{t('botsPage.panels.embedDescPlaceholder')}</span>}
            </div>

            {selectedProducts.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#b5bac1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  {t('botsPage.panels.defaultTitle')}
                </div>
                {selectedProducts.map(p => (
                  <div key={p.id} style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 4,
                    padding: '5px 8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 13, color: '#e0e0e0', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: '#57f287', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                      R$ {Number(p.price).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {embedConfig.imageUrl && (
              <div style={{ marginTop: 12 }}>
                <img
                  src={embedConfig.imageUrl}
                  alt="embed"
                  style={{ width: '100%', borderRadius: 6, objectFit: 'cover', maxHeight: 140 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        </div>

        {selectedProducts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selectedProducts.map(p => (
              <div key={p.id} style={{
                background: '#5865F2',
                borderRadius: 4,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: 'default',
                boxShadow: '0 2px 8px rgba(88,101,242,0.4)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}>
                🛒 {p.name}
              </div>
            ))}
          </div>
        )}

        {selectedProducts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '12px 0 4px',
            fontSize: 12,
            color: '#4d4f58',
            fontStyle: 'italic',
          }}>
            {t('botsPage.panels.noProductsSelected')}
          </div>
        )}
      </div>
    </div>
  );
}
