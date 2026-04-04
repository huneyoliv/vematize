import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Save, CreditCard, Wallet, Settings2 } from 'lucide-react';
import GatewayConfigModal from '../settings/GatewayConfigModal';

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

function getGatewayStatus(config: GatewayConfig | null | undefined, type: 'mp' | 'efi'): { label: string; variant: string } {
  if (!config) return { label: 'Não configurado', variant: 'badge-muted' };
  if (type === 'mp') {
    if (config.mode === 'production' && config.production_access_token) return { label: 'Produção', variant: 'badge-success' };
    if (config.sandbox_access_token) return { label: 'Sandbox', variant: 'badge-warning' };
  }
  if (type === 'efi') {
    if (config.mode === 'production' && config.production_client_id) return { label: 'Produção', variant: 'badge-success' };
    if (config.sandbox_client_id) return { label: 'Homologação', variant: 'badge-warning' };
  }
  return { label: 'Não configurado', variant: 'badge-muted' };
}

export default function SettingsPage() {
  const [form, setForm] = useState({
    logoUrl: '',
    activeGateway: '' as string,
    preferredPixGateway: '' as string,
  });
  const [mpConfig, setMpConfig] = useState<GatewayConfig>({ mode: 'sandbox' });
  const [efiConfig, setEfiConfig] = useState<GatewayConfig>({ mode: 'sandbox' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');
  const [modalGateway, setModalGateway] = useState<'mercadopago' | 'efi' | null>(null);

  useEffect(() => {
    api.get('/api/settings').then((res) => {
      if (res.data) {
        setForm({
          logoUrl: res.data.logoUrl || '',
          activeGateway: res.data.activeGateway || '',
          preferredPixGateway: res.data.preferredPixGateway || '',
        });
        if (res.data.mercadopagoConfig) setMpConfig({ mode: 'sandbox', ...res.data.mercadopagoConfig });
        if (res.data.efiConfig) setEfiConfig({ mode: 'sandbox', ...res.data.efiConfig });
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
      showMsg('Configurações salvas!');
    } catch {
      showMsg('Erro ao salvar.');
    }
    setSaving(false);
  };

  const handleSelectGateway = async (gw: 'mercadopago' | 'efi') => {
    const newActive = form.activeGateway === gw ? '' : gw;
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
      showMsg(`${gateway === 'mercadopago' ? 'Mercado Pago' : 'Efí'} salvo com sucesso!`);
    } catch {
      showMsg('Erro ao salvar gateway.');
    }
  };

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Carregando...</p>;

  const mpStatus = getGatewayStatus(mpConfig, 'mp');
  const efiStatus = getGatewayStatus(efiConfig, 'efi');

  return (
    <div>
      <div className="page-header">
        <h1>Configurações</h1>
        <p>Configurações gerais e integrações de pagamento</p>
      </div>

      {saveMsg && (
        <div style={{
          padding: '10px 16px', marginBottom: 16, borderRadius: 'var(--radius-sm)',
          background: saveMsg.includes('Erro') ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
          color: saveMsg.includes('Erro') ? 'var(--danger)' : 'var(--success)',
          fontSize: 13, fontWeight: 600,
        }}>
          {saveMsg}
        </div>
      )}

      <div className="card" style={{ maxWidth: 700, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Geral</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Configurações gerais do sistema.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>URL do Logo</label>
            <input className="input" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Gateway Pix Preferido</label>
            <select className="input" value={form.preferredPixGateway} onChange={(e) => setForm({ ...form, preferredPixGateway: e.target.value })}>
              <option value="">Automático (usa gateway ativo)</option>
              <option value="mercadopago">Mercado Pago</option>
              <option value="efi">Efí Bank</option>
            </select>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Qual gateway será usado para gerar cobranças Pix no checkout.
            </span>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>

      <div style={{ maxWidth: 700 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Gateway de Pagamento</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Selecione e configure o gateway ativo para processar pagamentos.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div
            className="card gateway-card"
            style={{
              cursor: 'pointer',
              borderColor: form.activeGateway === 'mercadopago' ? 'var(--accent)' : undefined,
              boxShadow: form.activeGateway === 'mercadopago' ? '0 0 20px var(--accent-glow)' : undefined,
            }}
            onClick={() => handleSelectGateway('mercadopago')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,158,227,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CreditCard size={22} style={{ color: '#009ee3' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Mercado Pago</h4>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PIX e cartão de crédito</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`badge ${mpStatus.variant}`}>{mpStatus.label}</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setModalGateway('mercadopago'); }}
                style={{ gap: 6 }}
              >
                <Settings2 size={14} /> Configurar
              </button>
            </div>
            {form.activeGateway === 'mercadopago' && (
              <div style={{
                marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, color: 'var(--accent)',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
                  boxShadow: '0 0 8px var(--accent-glow)',
                }} />
                Gateway Ativo
              </div>
            )}
          </div>

          <div
            className="card gateway-card"
            style={{
              cursor: 'pointer',
              borderColor: form.activeGateway === 'efi' ? 'var(--success)' : undefined,
              boxShadow: form.activeGateway === 'efi' ? '0 0 20px rgba(16,185,129,0.3)' : undefined,
            }}
            onClick={() => handleSelectGateway('efi')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                background: 'rgba(16,185,129,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Wallet size={22} style={{ color: 'var(--success)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Efí Bank</h4>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PIX e boleto</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`badge ${efiStatus.variant}`}>{efiStatus.label}</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setModalGateway('efi'); }}
                style={{ gap: 6 }}
              >
                <Settings2 size={14} /> Configurar
              </button>
            </div>
            {form.activeGateway === 'efi' && (
              <div style={{
                marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, color: 'var(--success)',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: 'var(--success)',
                  boxShadow: '0 0 8px rgba(16,185,129,0.3)',
                }} />
                Gateway Ativo
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
    </div>
  );
}
