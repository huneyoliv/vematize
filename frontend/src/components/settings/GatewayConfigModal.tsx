import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Save, Eye, EyeOff, Upload, CheckCircle, RotateCw,
  X, CreditCard, Wallet, Copy, ExternalLink, AlertTriangle, Check,
} from 'lucide-react';

interface GatewayConfigModalProps {
  gateway: 'mercadopago' | 'efi';
  config: Record<string, any>;
  onClose: () => void;
  onSave: (config: Record<string, any>) => void;
}

function PasswordField({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: 'var(--text-muted)', padding: 0,
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function CopyableUrl({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ marginTop: 4 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-input)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', padding: '8px 12px',
      }}>
        <code style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
          {url}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'none', border: 'none', padding: 4, cursor: 'pointer',
            color: copied ? 'var(--success)' : 'var(--text-muted)',
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange, labels }: { mode: string; onChange: (m: string) => void; labels: { off: string; on: string } }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--bg-input)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '10px 16px',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Modo de Operação
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Alterne entre ambiente de teste e produção
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 13, fontWeight: mode !== 'production' ? 700 : 400,
          color: mode !== 'production' ? 'var(--warning)' : 'var(--text-muted)',
        }}>
          {labels.off}
        </span>
        <button
          type="button"
          onClick={() => onChange(mode === 'production' ? 'sandbox' : 'production')}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: mode === 'production' ? 'var(--success)' : 'var(--text-muted)',
            position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: '50%', background: 'white',
            position: 'absolute', top: 3,
            left: mode === 'production' ? 23 : 3,
            transition: 'left 0.2s',
          }} />
        </button>
        <span style={{
          fontSize: 13, fontWeight: mode === 'production' ? 700 : 400,
          color: mode === 'production' ? 'var(--success)' : 'var(--text-muted)',
        }}>
          {labels.on}
        </span>
      </div>
    </div>
  );
}

export default function GatewayConfigModal({ gateway, config, onClose, onSave }: GatewayConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({ ...config });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(true);
  const [domainValue, setDomainValue] = useState('localhost');
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isMp = gateway === 'mercadopago';
  console.log('[Debug] Modo forcado para production no gateway', { gateway });
  const mode = 'production';

  useEffect(() => {
    api.get('/api/settings/domain').then((res) => {
      setIsLocalhost(res.data.isLocalhost);
      setDomainValue(res.data.domain);
    }).catch(() => {});
  }, []);

  const update = (field: string, value: any) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      onSave(localConfig);
      showMsg('Salvo com sucesso!', 'success');
    } catch {
      showMsg('Erro ao salvar.', 'error');
    }
    setSaving(false);
  };

  const handleUploadCert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.p12')) {
      showMsg('Selecione um arquivo .p12', 'error');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('environment', mode);
      const res = await api.post('/api/settings/upload-certificate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        const certField = mode === 'production' ? 'production_certificate_base64' : 'sandbox_certificate_base64';
        update(certField, 'uploaded');
        showMsg(res.data.message, 'success');
      }
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Erro ao enviar certificado.', 'error');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleWebhook = async () => {
    setWebhookLoading(true);
    try {
      const webhookUrl = `https://api.${domainValue}/api/efi/webhook`;
      const res = await api.post('/api/settings/efi-webhook', { webhookUrl });
      showMsg(res.data.message, 'success');
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Erro ao configurar webhook.', 'error');
    }
    setWebhookLoading(false);
  };

  const certField = mode === 'production' ? 'production_certificate_base64' : 'sandbox_certificate_base64';
  const hasCert = !!localConfig[certField];

  const title = isMp ? 'Mercado Pago' : 'Efí Bank';
  const modeLabel = isMp
    ? 'Produção'
    : (mode === 'production' ? 'Produção' : 'Homologação');

  const mpWebhookUrl = !isLocalhost ? `https://api.${domainValue}/api/mercadopago/webhook` : '';
  const efiWebhookUrl = !isLocalhost ? `https://api.${domainValue}/api/efi/webhook` : '';

  return (
    <div className="dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-sm)',
              background: isMp ? 'rgba(0,158,227,0.15)' : 'rgba(16,185,129,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isMp
                ? <CreditCard size={20} style={{ color: '#009ee3' }} />
                : <Wallet size={20} style={{ color: 'var(--success)' }} />
              }
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {isMp ? 'PIX e cartão de crédito' : 'PIX e boleto'}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {msg && (
          <div style={{
            padding: '8px 14px', marginBottom: 16, borderRadius: 'var(--radius-sm)',
            background: msg.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            color: msg.type === 'error' ? 'var(--danger)' : 'var(--success)',
            fontSize: 13, fontWeight: 600,
          }}>
            {msg.text}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
            Credenciais de Produção
          </h3>

          {isMp ? (
            <>
              <div className="form-group">
                <label>Access Token</label>
                <PasswordField
                  value={localConfig.production_access_token || ''}
                  onChange={(v) => update('production_access_token', v)}
                  placeholder="APP_USR-..."
                />
              </div>
              <div className="form-group">
                <label>Public Key</label>
                <PasswordField
                  value={localConfig.production_public_key || ''}
                  onChange={(v) => update('production_public_key', v)}
                  placeholder="APP_USR-..."
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <div className="form-group">
                  <label>Secret Signature (Ambos os modos)</label>
                  <PasswordField
                    value={localConfig.webhook_secret || ''}
                    onChange={(v) => update('webhook_secret', v)}
                    placeholder="Seu secret signature..."
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Utilizado para validar webhooks.
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Webhook
                </h3>
                {isLocalhost ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                  }}>
                    <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                    <span style={{ fontSize: 13, color: 'var(--warning)' }}>
                      Configure um domínio válido (não localhost) para visualizar a URL do webhook.
                    </span>
                  </div>
                ) : (
                  <>
                    <CopyableUrl url={mpWebhookUrl} label="URL do Webhook (copie e cole no Mercado Pago)" />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                      Configure essa URL nas notificações do seu aplicativo no painel do Mercado Pago.
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Client ID (Produção)</label>
                <PasswordField
                  value={localConfig.production_client_id || ''}
                  onChange={(v) => {
                    console.log('[Debug] Atualizando production_client_id');
                    update('production_client_id', v);
                  }}
                  placeholder="Client_Id_..."
                />
              </div>
              <div className="form-group">
                <label>Client Secret (Produção)</label>
                <PasswordField
                  value={localConfig.production_client_secret || ''}
                  onChange={(v) => {
                    console.log('[Debug] Atualizando production_client_secret');
                    update('production_client_secret', v);
                  }}
                  placeholder="Client_Secret_..."
                />
              </div>
              <div className="form-group">
                <label>Chave PIX</label>
                <input
                  className="input"
                  value={localConfig.pix_key || ''}
                  onChange={(e) => update('pix_key', e.target.value)}
                  placeholder="Sua chave PIX cadastrada na Efí"
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                  Certificado .p12 (Produção)
                </h3>

                {hasCert ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>
                        Certificado de Produção enviado
                      </span>
                    </div>
                    <label htmlFor="cert-reupload-production" style={{ cursor: 'pointer' }}>
                      <div className="btn btn-ghost btn-sm" style={{ gap: 6, pointerEvents: 'none' }}>
                        <RotateCw size={14} /> Reenviar
                      </div>
                      <input
                        type="file"
                        id="cert-reupload-production"
                        accept=".p12"
                        onChange={handleUploadCert}
                        style={{ display: 'none' }}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                ) : (
                  <label htmlFor="cert-upload-production" style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{
                      border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                      padding: '24px', textAlign: 'center',
                      transition: 'border-color 0.2s',
                    }}>
                      <Upload size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {uploading ? 'Enviando...' : 'Clique para enviar o certificado .p12'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        Certificado de produção da Efí
                      </div>
                    </div>
                    <input
                      type="file"
                      id="cert-upload-production"
                      accept=".p12"
                      onChange={handleUploadCert}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Webhook
                </h3>
                {isLocalhost ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                  }}>
                    <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                    <span style={{ fontSize: 13, color: 'var(--warning)' }}>
                      Configure um domínio válido (não localhost) para registrar o webhook.
                    </span>
                  </div>
                ) : (
                  <>
                    <CopyableUrl url={efiWebhookUrl} label="URL do Webhook" />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      A Efí adiciona <code>/pix</code> automaticamente ao final da URL ao enviar notificações.
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={webhookLoading || !hasCert}
                      onClick={handleWebhook}
                      style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                    >
                      <ExternalLink size={16} />
                      {webhookLoading ? 'Registrando...' : 'Registrar Webhook na Efí'}
                    </button>
                    {!hasCert && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                        Envie o certificado de produção antes de registrar o webhook.
                      </span>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
