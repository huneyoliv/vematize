import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Save, ChevronLeft, Copy, CheckCircle, RefreshCw, ExternalLink, AlertCircle, Shield } from 'lucide-react';
import { TelegramIcon, DiscordIcon } from '../icons/platform-icons';
import FlowBuilder from '../bots/FlowBuilder';
import DiscordPanelsManager from '../bots/DiscordPanelsManager';

interface BotConfig {
  id?: string;
  platform?: string;
  botToken?: string;
  clientId?: string;
  publicKey?: string;
  interactionsToken?: string;
  flows: any[];
  deliveryMessage?: string;
  inactiveSubscriptionMessage?: string;
  discordDeliveryType?: string;
  discordDeliveryRoleId?: string;
  discordNotifyRoleId?: string;
  discordCartCategoryId?: string;
  discordSalesLogChannelId?: string;
  discordCouponsEnabled?: boolean;
  discordPanels?: any[];
}

const platformInfo: Record<string, { name: string; icon: typeof TelegramIcon; color: string }> = {
  telegram: { name: 'Telegram', icon: TelegramIcon, color: '#0088cc' },
  discord: { name: 'Discord', icon: DiscordIcon, color: '#5865F2' },
};

function getInteractionsUrl(token?: string) {
  if (!token) return '';
  const domain = import.meta.env.VITE_DOMAIN || 'localhost';
  const base = domain === 'localhost' ? '' : `https://api.${domain}`;
  return `${base}/api/discord/interactions/${token}`;
}

function getTelegramWebhookUrl() {
  const domain = import.meta.env.VITE_DOMAIN || 'localhost';
  if (domain === 'localhost') return 'http://localhost:3001/api/telegram/webhook';
  return `https://api.${domain}/api/telegram/webhook`;
}

export default function BotsPage() {
  const { platform } = useParams<{ platform: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('connection');
  const [saveMsg, setSaveMsg] = useState('');

  const [connForm, setConnForm] = useState({ botToken: '', clientId: '', publicKey: '' });
  const [configForm, setConfigForm] = useState({
    deliveryMessage: '',
    inactiveSubscriptionMessage: '',
    discordDeliveryType: 'automatic',
    discordDeliveryRoleId: '',
    discordNotifyRoleId: '',
    discordCartCategoryId: '',
    discordSalesLogChannelId: '',
    discordCouponsEnabled: true,
  });
  const [flows, setFlows] = useState<any[]>([]);
  const [discordPanels, setDiscordPanels] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [copied, setCopied] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const info = platform ? platformInfo[platform] : null;

  useEffect(() => {
    if (!platform) return;

    Promise.all([
      api.get(`/api/bots/${platform}`),
      api.get('/api/products').catch(() => ({ data: [] })),
    ]).then(([botRes, prodRes]) => {
      const data = botRes.data;
      setConfig(data);
      setProducts(prodRes.data || []);
      if (data) {
        setConnForm({
          botToken: data.botToken || '',
          clientId: data.clientId || '',
          publicKey: data.publicKey || '',
        });
        setConfigForm({
          deliveryMessage: data.deliveryMessage || '',
          inactiveSubscriptionMessage: data.inactiveSubscriptionMessage || '',
          discordDeliveryType: data.discordDeliveryType || 'automatic',
          discordDeliveryRoleId: data.discordDeliveryRoleId || '',
          discordNotifyRoleId: data.discordNotifyRoleId || '',
          discordCartCategoryId: data.discordCartCategoryId || '',
          discordSalesLogChannelId: data.discordSalesLogChannelId || '',
          discordCouponsEnabled: data.discordCouponsEnabled ?? true,
        });
        setFlows(data.flows || []);
        setDiscordPanels(data.discordPanels || []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [platform]);

  const showSaveMsg = (msg: string) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/api/bots/${platform}`, connForm);
      setConfig(res.data);
      showSaveMsg('Conexão salva com sucesso!');
    } catch {
      showSaveMsg('Erro ao salvar conexão.');
    }
    setSaving(false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/api/bots/${platform}`, configForm);
      showSaveMsg('Configurações salvas com sucesso!');
    } catch {
      showSaveMsg('Erro ao salvar configurações.');
    }
    setSaving(false);
  };

  const handleSaveFlows = async (updatedFlows: any[]) => {
    setSaving(true);
    try {
      await api.put(`/api/bots/${platform}`, { flows: updatedFlows });
      showSaveMsg('Fluxos salvos com sucesso!');
    } catch {
      showSaveMsg('Erro ao salvar fluxos.');
    }
    setSaving(false);
  };

  const handleSavePanels = async (updatedPanels: any[]) => {
    setSaving(true);
    try {
      await api.put(`/api/bots/${platform}`, { discordPanels: updatedPanels });
      showSaveMsg('Painéis salvos com sucesso!');
    } catch {
      showSaveMsg('Erro ao salvar painéis.');
    }
    setSaving(false);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testInteractionsEndpoint = async () => {
    const url = getInteractionsUrl(config?.interactionsToken);
    if (!url) return;
    setTestingEndpoint(true);
    setTestResult(null);
    try {
      const res = await fetch(url);
      const data = await res.json();
      setTestResult(data.status === 'ok'
        ? { success: true, message: '✅ Endpoint funcionando!' }
        : { success: false, message: '❌ Endpoint respondeu com erro.' }
      );
    } catch {
      setTestResult({ success: false, message: '❌ Não foi possível conectar ao endpoint.' });
    }
    setTestingEndpoint(false);
  };

  const regenerateInteractionsUrl = async () => {
    if (!confirm('⚠️ Isso vai invalidar a URL atual. O Discord precisará ser reconfigurado. Continuar?')) return;
    setRegenerating(true);
    try {
      const res = await api.put(`/api/bots/${platform}`, { regenerateInteractionsToken: true });
      if (res.data) setConfig(res.data);
      showSaveMsg('URL regenerada com sucesso!');
    } catch {
      showSaveMsg('Erro ao regenerar URL.');
    }
    setRegenerating(false);
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Carregando configuração do bot...</p>;
  }

  if (!info || !platform) {
    return <p style={{ color: 'var(--text-secondary)' }}>Plataforma não encontrada.</p>;
  }

  const Icon = info.icon;
  const interactionsUrl = getInteractionsUrl(config?.interactionsToken);
  const telegramWebhookUrl = getTelegramWebhookUrl();
  const isConnected = !!config?.botToken;

  const tabs = platform === 'discord'
    ? [
        { key: 'connection', label: 'Conexão' },
        { key: 'settings', label: 'Configurações' },
        { key: 'panels', label: 'Painéis de Venda' },
        { key: 'flow', label: 'Fluxo' },
      ]
    : [
        { key: 'connection', label: 'Conexão' },
        { key: 'settings', label: 'Configurações' },
        { key: 'flow', label: 'Fluxo do Bot' },
      ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/bots')} style={{ padding: '6px 10px' }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            background: `${info.color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon width={18} height={18} style={{ color: info.color }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Bot {info.name}</h1>
        </div>
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

      <div className="tabs-bar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {activeTab === 'connection' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ maxWidth: 700 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Credenciais de Conexão</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Configure as credenciais necessárias para conectar o bot.
              </p>

              {platform === 'discord' && (
                <div style={{
                  padding: 14, marginBottom: 20, borderRadius: 'var(--radius-sm)',
                  background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <AlertCircle size={18} style={{ color: '#5865F2', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Como configurar:</strong><br />
                      1. Acesse o{' '}
                      <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer"
                        style={{ color: '#5865F2', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        Discord Developer Portal <ExternalLink size={12} />
                      </a><br />
                      2. Em <strong>"General Information"</strong> → copie a <strong style={{ color: '#f59e0b' }}>PUBLIC KEY</strong><br />
                      3. Vá em <strong>"Bot"</strong> → copie o Token<br />
                      4. Habilite as intents: <strong>Server Members</strong> e <strong>Message Content</strong><br />
                      5. Cole as credenciais abaixo
                    </div>
                  </div>
                </div>
              )}

              {platform === 'telegram' && (
                <div style={{
                  padding: 14, marginBottom: 20, borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,136,204,0.08)', border: '1px solid rgba(0,136,204,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <AlertCircle size={18} style={{ color: '#0088cc', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Como configurar:</strong><br />
                      1. Abra o <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
                        style={{ color: '#0088cc', textDecoration: 'underline' }}>@BotFather</a> no Telegram<br />
                      2. Envie <code>/newbot</code> e siga as instruções<br />
                      3. Copie o token gerado e cole abaixo
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveConnection}>
                <div className="form-group">
                  <label>Bot Token</label>
                  <input className="input" type="password" value={connForm.botToken}
                    onChange={(e) => setConnForm({ ...connForm, botToken: e.target.value })}
                    placeholder={platform === 'telegram' ? 'Seu token do BotFather...' : 'Seu token do bot...'} />
                </div>

                {platform === 'discord' && (
                  <>
                    <div className="form-group">
                      <label>Client ID (Application ID)</label>
                      <input className="input" value={connForm.clientId}
                        onChange={(e) => setConnForm({ ...connForm, clientId: e.target.value })}
                        placeholder="ID da aplicação no Discord" />
                    </div>
                    <div className="form-group">
                      <label>Public Key</label>
                      <input className="input" value={connForm.publicKey}
                        onChange={(e) => setConnForm({ ...connForm, publicKey: e.target.value })}
                        placeholder="Public key da aplicação" />
                    </div>
                  </>
                )}

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Conexão'}
                </button>
              </form>
            </div>

            {platform === 'discord' && (
              <div className="card" style={{
                maxWidth: 700,
                borderColor: isConnected ? 'rgba(88,101,242,0.3)' : 'rgba(245,158,11,0.3)',
                background: isConnected ? 'rgba(88,101,242,0.03)' : 'rgba(245,158,11,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={18} style={{ color: isConnected ? '#5865F2' : '#f59e0b' }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Configuração de Interactions</h3>
                    {isConnected && (
                      <span className="badge badge-success" style={{ fontSize: 11 }}>Bot Conectado</span>
                    )}
                  </div>
                  <span className="badge" style={{
                    background: isConnected ? 'rgba(88,101,242,0.15)' : 'rgba(245,158,11,0.15)',
                    color: isConnected ? '#5865F2' : '#f59e0b',
                    fontSize: 11,
                  }}>Obrigatório</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  {isConnected
                    ? 'Configure esta URL no Discord Developer Portal para ativar os painéis de vendas'
                    : '⚠️ Conecte o bot primeiro na seção acima, depois configure esta URL'}
                </p>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Interactions Endpoint URL
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                      flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                      fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all',
                      color: interactionsUrl ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                      {interactionsUrl || 'Salve a conexão para gerar a URL'}
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => copyUrl(interactionsUrl)}
                      disabled={!interactionsUrl} style={{ padding: '8px 10px' }}>
                      {copied ? <CheckCircle size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <button className="btn btn-ghost btn-sm" onClick={testInteractionsEndpoint}
                    disabled={testingEndpoint || !interactionsUrl}>
                    {testingEndpoint ? 'Testando...' : '🧪 Testar Endpoint'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={regenerateInteractionsUrl}
                    disabled={regenerating || !interactionsUrl} style={{ gap: 6 }}>
                    <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                    {regenerating ? 'Regenerando...' : 'Regenerar URL'}
                  </button>
                  {testResult && (
                    <span style={{ fontSize: 13, color: testResult.success ? 'var(--success)' : 'var(--danger)', alignSelf: 'center' }}>
                      {testResult.message}
                    </span>
                  )}
                </div>

                <div style={{
                  padding: 12, borderRadius: 'var(--radius-sm)',
                  background: 'rgba(88,101,242,0.06)', border: '1px solid rgba(88,101,242,0.15)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Shield size={16} style={{ color: '#5865F2', marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <strong>🔒 URL Única e Segura:</strong> Esta URL é exclusiva para o seu bot e contém um token de segurança.
                      Se comprometida, regenere-a.
                    </span>
                  </div>
                </div>

                <div style={{
                  marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📋 Como configurar:</p>
                  <ol style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: 20 }}>
                    <li>Acesse o{' '}
                      <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer"
                        style={{ color: '#5865F2', textDecoration: 'underline' }}>
                        Discord Developer Portal <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                      </a>
                    </li>
                    <li>Selecione sua aplicação/bot</li>
                    <li>Vá em <strong>General Information</strong></li>
                    <li>Cole a URL acima no campo <strong>Interactions Endpoint URL</strong></li>
                    <li>Clique em <strong>Save Changes</strong></li>
                  </ol>
                  <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 8 }}>
                    ✅ Após configurar, os painéis de vendas funcionarão automaticamente!
                  </p>
                </div>
              </div>
            )}

            {platform === 'telegram' && isConnected && (
              <div className="card" style={{
                maxWidth: 700,
                borderColor: 'rgba(0,136,204,0.3)',
                background: 'rgba(0,136,204,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Shield size={18} style={{ color: '#0088cc' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>URL do Webhook</h3>
                  <span className="badge badge-success" style={{ fontSize: 11 }}>Configurado Automaticamente</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Em produção, o bot usa webhook. Em desenvolvimento, usa polling automaticamente.
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all',
                  }}>
                    {telegramWebhookUrl}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => copyUrl(telegramWebhookUrl)}
                    style={{ padding: '8px 10px' }}>
                    {copied ? <CheckCircle size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card" style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              {platform === 'discord' ? 'Configurações do Discord' : 'Mensagens do Bot'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {platform === 'discord'
                ? 'Configure como o bot entrega produtos e gerencia o servidor.'
                : 'Configure as mensagens automáticas enviadas pelo bot.'}
            </p>
            <form onSubmit={handleSaveConfig}>
              <div className="form-group">
                <label>Mensagem de Entrega</label>
                <textarea className="input" rows={4} value={configForm.deliveryMessage}
                  onChange={(e) => setConfigForm({ ...configForm, deliveryMessage: e.target.value })}
                  placeholder="Mensagem enviada após a compra ser aprovada"
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label>Mensagem de Assinatura Inativa</label>
                <textarea className="input" rows={3} value={configForm.inactiveSubscriptionMessage}
                  onChange={(e) => setConfigForm({ ...configForm, inactiveSubscriptionMessage: e.target.value })}
                  placeholder="Mensagem enviada quando a assinatura expira"
                  style={{ resize: 'vertical' }} />
              </div>

              {platform === 'discord' && (
                <>
                  <div className="form-group">
                    <label>Tipo de Entrega</label>
                    <select className="input" value={configForm.discordDeliveryType}
                      onChange={(e) => setConfigForm({ ...configForm, discordDeliveryType: e.target.value })}>
                      <option value="automatic">Automática (Bot entrega no carrinho)</option>
                      <option value="manual_role">Manual com Staff (Adiciona membros do cargo ao carrinho)</option>
                      <option value="manual_notify">Manual com Notificação (Apenas menciona o cargo)</option>
                    </select>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Automática: Para produtos digitais. Manual: Para produtos que precisam de ação humana.
                    </span>
                  </div>

                  {configForm.discordDeliveryType === 'manual_role' && (
                    <div className="form-group">
                      <label>ID do Cargo de Staff</label>
                      <input className="input" value={configForm.discordDeliveryRoleId}
                        onChange={(e) => setConfigForm({ ...configForm, discordDeliveryRoleId: e.target.value })}
                        placeholder="Membros com este cargo serão adicionados ao carrinho" />
                    </div>
                  )}

                  {configForm.discordDeliveryType === 'manual_notify' && (
                    <div className="form-group">
                      <label>ID do Cargo de Vendedor</label>
                      <input className="input" value={configForm.discordNotifyRoleId}
                        onChange={(e) => setConfigForm({ ...configForm, discordNotifyRoleId: e.target.value })}
                        placeholder="Este cargo será mencionado sobre novas vendas" />
                    </div>
                  )}

                  <div className="form-group">
                    <label>ID da Categoria de Carrinho</label>
                    <input className="input" value={configForm.discordCartCategoryId}
                      onChange={(e) => setConfigForm({ ...configForm, discordCartCategoryId: e.target.value })}
                      placeholder="Categoria onde os threads de carrinho serão criados" />
                  </div>
                  <div className="form-group">
                    <label>ID do Canal de Log de Vendas</label>
                    <input className="input" value={configForm.discordSalesLogChannelId}
                      onChange={(e) => setConfigForm({ ...configForm, discordSalesLogChannelId: e.target.value })}
                      placeholder="Canal onde serão enviados logs de vendas" />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="couponsEnabled"
                      checked={configForm.discordCouponsEnabled}
                      onChange={(e) => setConfigForm({ ...configForm, discordCouponsEnabled: e.target.checked })}
                      style={{ width: 'auto' }} />
                    <label htmlFor="couponsEnabled" style={{ margin: 0 }}>Habilitar cupons no bot</label>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'flow' && (
          <FlowBuilder
            flows={flows}
            onChange={setFlows}
            onSave={handleSaveFlows}
            products={products}
            saving={saving}
          />
        )}

        {activeTab === 'panels' && platform === 'discord' && (
          <DiscordPanelsManager
            panels={discordPanels}
            onChange={setDiscordPanels}
            onSave={handleSavePanels}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
