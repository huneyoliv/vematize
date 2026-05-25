import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Save, Settings2, Image as ImageIcon } from 'lucide-react';
import GatewayConfigModal from '../settings/GatewayConfigModal';
import GallerySelectorModal from '../settings/GallerySelectorModal';
import PageLoading from '../layout/PageLoading';
import { useLanguage } from '../../hooks/useLanguage';
import mpLogo from './MP_RGB_HANDSHAKE_color_vertical.png';
import efiLogo from './Efi-bank-logo.png';

interface GatewayConfig {
  mode?: string;
  sandbox_access_token?: string;
  sandbox_public_key?: string;
  production_access_token?: string;
  production_public_key?: string;
  webhook_secret?: string;
  sandbox_client_id?: string;
  sandbox_client_secret?: string;
  production_client_id?: string;
  production_client_secret?: string;
  pix_key?: string;
  sandbox_certificate_base64?: string;
  production_certificate_base64?: string;
}

function getGatewayStatus(config: GatewayConfig | null | undefined, type: 'mp' | 'efi', t: any): { label: string; variant: string } {
  if (!config) return { label: t('settings.notConfigured'), variant: 'badge-muted' };
  if (type === 'mp') {
    if (config.production_access_token) return { label: t('settings.production'), variant: 'badge-success' };
  }
  if (type === 'efi') {
    if (config.production_client_id) return { label: t('settings.production'), variant: 'badge-success' };
  }
  return { label: t('settings.notConfigured'), variant: 'badge-muted' };
}

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [form, setForm] = useState({
    logoUrl: '',
    activeGateway: '' as string,
  });
  const [mpConfig, setMpConfig] = useState<GatewayConfig>({ mode: 'production' });
  const [efiConfig, setEfiConfig] = useState<GatewayConfig>({ mode: 'production' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');
  const [modalGateway, setModalGateway] = useState<'mercadopago' | 'efi' | null>(null);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    api.get('/api/settings').then((res) => {
      if (res.data) {
        setForm({
          logoUrl: res.data.logoUrl || '',
          activeGateway: res.data.activeGateway || '',
        });
        if (res.data.mercadopagoConfig) setMpConfig({ mode: 'production', ...res.data.mercadopagoConfig });
        if (res.data.efiConfig) setEfiConfig({ mode: 'production', ...res.data.efiConfig });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showMsg = (msg: string) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/settings', form);
      showMsg(t('settings.success'));
    } catch {
      showMsg(t('settings.error'));
    }
    setSaving(false);
  };

  const handleSelectGateway = async (gw: 'mercadopago' | 'efi') => {
    const status = getGatewayStatus(gw === 'mercadopago' ? mpConfig : efiConfig, gw === 'mercadopago' ? 'mp' : 'efi', t);
    if (status.label === t('settings.notConfigured')) {
      showMsg(gw === 'mercadopago' ? t('settings.mpAlert') : t('settings.efiAlert'));
      return;
    }
    if (form.activeGateway === gw) {
      return;
    }
    const newActive = gw;
    setForm(prev => ({ ...prev, activeGateway: newActive }));
    try {
      await api.put('/api/settings', { activeGateway: newActive });
    } catch {}
  };

  const handleSaveGateway = async (gateway: 'mercadopago' | 'efi', config: Record<string, any>) => {
    try {
      const payload: Record<string, any> = {};
      if (gateway === 'mercadopago') {
        payload.mercadopagoConfig = config;
        setMpConfig(config);
      } else {
        payload.efiConfig = config;
        setEfiConfig(config);
      }
      await api.put('/api/settings', payload);
      showMsg(gateway === 'mercadopago' ? t('settings.mpSuccess') : t('settings.efiSuccess'));
    } catch {
      showMsg(t('settings.saveErrorGateway'));
    }
  };

  if (loading) return <PageLoading />;

  const mpStatus = getGatewayStatus(mpConfig, 'mp', t);
  const efiStatus = getGatewayStatus(efiConfig, 'efi', t);

  return (
    <div>
      <div className="page-header">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
      </div>

      {saveMsg && (
        <div
          className={`alert-banner ${saveMsg.includes('Erro') || saveMsg.includes('Error') ? 'alert-banner--error' : 'alert-banner--success'}`}
          role="status"
        >
          {saveMsg}
        </div>
      )}

      <div className="card settings-section">
        <h3 className="settings-section-title">{t('settings.general')}</h3>
        <p className="settings-section-desc">{t('settings.generalDesc')}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('settings.logoUrl')}</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="input" style={{ flex: 1 }} value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." />
              <button type="button" className="btn btn-outline" onClick={() => setShowGallery(true)} title="Escolher da Galeria">
                <ImageIcon size={18} />
              </button>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>{t('settings.language')}</label>
            <select 
              className="input" 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as 'en' | 'pt')}
              style={{ width: '100%', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <option value="en">English (US)</option>
              <option value="pt">Português (BR)</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={saving}>
            <Save size={16} /> {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">{t('settings.gateway')}</h3>
        <p className="settings-section-desc">
          {t('settings.gatewayDesc')}
        </p>

        <div className="gateway-grid">
          <div
            className={`card gateway-card${form.activeGateway === 'mercadopago' ? ' gateway-card--active-mp' : ''}`}
            onClick={() => handleSelectGateway('mercadopago')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectGateway('mercadopago');
              }
            }}
          >
            <div className="gateway-card-inner">
              <div className="gateway-icon gateway-icon--mp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, padding: 4 }}>
                <img src={mpLogo} alt="Mercado Pago" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div className="gateway-info">
                <h4>Mercado Pago</h4>
              </div>
            </div>
            <div className="gateway-card-footer">
              <span className={`badge ${mpStatus.variant}`}>{mpStatus.label}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setModalGateway('mercadopago'); }}
              >
                <Settings2 size={14} /> {t('settings.configure')}
              </button>
            </div>
            {form.activeGateway === 'mercadopago' && (
              <div className="gateway-active gateway-active--mp">
                <div className="gateway-active-dot gateway-active-dot--mp" aria-hidden />
                {t('settings.active')}
              </div>
            )}
          </div>
 
          <div
            className={`card gateway-card${form.activeGateway === 'efi' ? ' gateway-card--active-efi' : ''}`}
            onClick={() => handleSelectGateway('efi')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectGateway('efi');
              }
            }}
          >
            <div className="gateway-card-inner">
              <div className="gateway-icon gateway-icon--efi" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, padding: 4 }}>
                <img src={efiLogo} alt="Efí Bank" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div className="gateway-info">
                <h4>Efí Bank</h4>
              </div>
            </div>
            <div className="gateway-card-footer">
              <span className={`badge ${efiStatus.variant}`}>{efiStatus.label}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setModalGateway('efi'); }}
              >
                <Settings2 size={14} /> {t('settings.configure')}
              </button>
            </div>
            {form.activeGateway === 'efi' && (
              <div className="gateway-active gateway-active--efi">
                <div className="gateway-active-dot gateway-active-dot--efi" aria-hidden />
                {t('settings.active')}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalGateway && (
        <GatewayConfigModal
          gateway={modalGateway}
          config={modalGateway === 'mercadopago' ? mpConfig : efiConfig}
          onClose={() => setModalGateway(null)}
          onSave={(config) => {
            handleSaveGateway(modalGateway!, config);
            setModalGateway(null);
          }}
        />
      )}

      {showGallery && (
        <GallerySelectorModal
          onClose={() => setShowGallery(false)}
          onSelect={(url) => {
            setForm(prev => ({ ...prev, logoUrl: url }));
            setShowGallery(false);
          }}
        />
      )}
    </div>
  );
}
