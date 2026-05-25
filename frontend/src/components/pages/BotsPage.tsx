import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Save, ChevronLeft, Copy, CheckCircle, RefreshCw, ExternalLink, AlertCircle, Shield } from 'lucide-react';
import { TelegramIcon, DiscordIcon } from '../icons/platform-icons';
import FlowBuilder from '../bots/FlowBuilder';
import DiscordPanelsManager from '../bots/DiscordPanelsManager';
import { useLanguage } from '../../hooks/useLanguage';

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
  discordSupportRoleId?: string;
  discordThreadArchiveMinutes?: number;
  discordPanels?: any[];
}

interface ProductOption {
  id: string;
  name: string;
  type: string;
  telegramGroupId?: string;
  discordSubscriptionRoleId?: string;
}

const platformInfo: Record<string, { name: string; icon: typeof TelegramIcon; color: string }> = {
  telegram: { name: 'Telegram', icon: TelegramIcon, color: '#0088cc' },
  discord: { name: 'Discord', icon: DiscordIcon, color: '#5865F2' },
};

function getInteractionsUrl(token?: string) {
  if (!token) return '';
  return `${window.location.origin}/api/discord/interactions/${token}`;
}


export default function BotsPage() {
  const { platform } = useParams<{ platform: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    discordSupportRoleId: '',
    discordThreadArchiveMinutes: 1440,
  });
  const [flows, setFlows] = useState<any[]>([]);
  const [discordPanels, setDiscordPanels] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [copied, setCopied] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const info = platform ? platformInfo[platform] : null;

  const filterProductsByPlatform = (items: ProductOption[], targetPlatform?: string) => {
    if (!targetPlatform) return items;
    return items.filter((product) => {
      if (product.type !== 'subscription') return true;
      const allowsTelegram = !!product.telegramGroupId;
      const allowsDiscord = !!product.discordSubscriptionRoleId;
      if (targetPlatform === 'telegram') return allowsTelegram;
      if (targetPlatform === 'discord') return allowsDiscord;
      return true;
    });
  };

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
          discordSupportRoleId: data.discordSupportRoleId || '',
          discordThreadArchiveMinutes: data.discordThreadArchiveMinutes ?? 1440,
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
      showSaveMsg(t('botPage.savedConnection', 'Conexão salva com sucesso!'));
    } catch {
      showSaveMsg(t('botPage.errorConnection', 'Erro ao salvar conexão.'));
    }
    setSaving(false);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/api/bots/${platform}`, configForm);
      showSaveMsg(t('botPage.savedSettings', 'Configurações salvas com sucesso!'));
    } catch {
      showSaveMsg(t('botPage.errorSettings', 'Erro ao salvar configurações.'));
    }
    setSaving(false);
  };

  const handleSaveFlows = async (updatedFlows: any[]) => {
    setSaving(true);
    try {
      await api.put(`/api/bots/${platform}`, { flows: updatedFlows });
      showSaveMsg(t('botPage.savedFlows', 'Fluxos salvos com sucesso!'));
    } catch {
      showSaveMsg(t('botPage.errorFlows', 'Erro ao salvar fluxos.'));
    }
    setSaving(false);
  };

  const handleSavePanels = async (updatedPanels: any[]) => {
    setSaving(true);
    try {
      await api.put(`/api/bots/${platform}`, { discordPanels: updatedPanels });
      showSaveMsg(t('botPage.savedPanels', 'Painéis salvos com sucesso!'));
    } catch {
      showSaveMsg(t('botPage.errorPanels', 'Erro ao salvar painéis.'));
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
        ? { success: true, message: t('botPage.inter.testOk', '✅ Endpoint funcionando!') }
        : { success: false, message: t('botPage.inter.testError1', '❌ Endpoint respondeu com erro.') }
      );
    } catch {
      setTestResult({ success: false, message: t('botPage.inter.testError2', '❌ Não foi possível conectar ao endpoint.') });
    }
    setTestingEndpoint(false);
  };

  const regenerateInteractionsUrl = async () => {
    if (!confirm(t('botPage.inter.regenConfirm', '⚠️ Isso vai invalidar a URL atual. O Discord precisará ser reconfigurado. Continuar?'))) return;
    setRegenerating(true);
    try {
      const res = await api.put(`/api/bots/${platform}`, { regenerateInteractionsToken: true });
      if (res.data) setConfig(res.data);
      showSaveMsg(t('botPage.inter.regenSuccess', 'URL regenerada com sucesso!'));
    } catch {
      showSaveMsg(t('botPage.inter.regenError', 'Erro ao regenerar URL.'));
    }
    setRegenerating(false);
  };

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>{t('botPage.loadingConfig', 'Carregando configuração do bot...')}</p>;
  }

  if (!info || !platform) {
    return <p style={{ color: 'var(--text-secondary)' }}>{t('botPage.platformNotFound', 'Plataforma não encontrada.')}</p>;
  }

  const Icon = info.icon;
  const interactionsUrl = getInteractionsUrl(config?.interactionsToken);
  const isConnected = !!config?.botToken;

  const tabs = platform === 'discord'
    ? [
        { key: 'connection', label: t('botPage.tabs.connection', 'Conexão') },
        { key: 'settings', label: t('botPage.tabs.settings', 'Configurações') },
        { key: 'panels', label: t('botPage.tabs.panels', 'Painéis de Venda') },
        { key: 'flow', label: t('botPage.tabs.flow', 'Fluxo') },
      ]
    : [
        { key: 'connection', label: t('botPage.tabs.connection', 'Conexão') },
        { key: 'settings', label: t('botPage.tabs.settings', 'Configurações') },
        { key: 'flow', label: t('botPage.tabs.botFlow', 'Fluxo do Bot') },
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
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t('botPage.botTitle', 'Bot')} {info.name}</h1>
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
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('botPage.conn.title', 'Credenciais de Conexão')}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                {t('botPage.conn.desc', 'Configure as credenciais necessárias para conectar o bot.')}
              </p>

              {platform === 'discord' && (
                <div style={{
                  padding: 14, marginBottom: 20, borderRadius: 'var(--radius-sm)',
                  background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <AlertCircle size={18} style={{ color: '#5865F2', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{t('botPage.conn.discordHowToTitle', 'Como configurar:')}</strong><br />
                      1. {t('botPage.conn.discordHowTo1', 'Acesse o')}{' '}
                      <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer"
                        style={{ color: '#5865F2', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        Discord Developer Portal <ExternalLink size={12} />
                      </a><br />
                      2. {t('botPage.conn.discordHowTo2', 'Em "General Information" → copie a PUBLIC KEY')}<br />
                      3. {t('botPage.conn.discordHowTo3', 'Vá em "Bot" → copie o Token')}<br />
                      4. {t('botPage.conn.discordHowTo4', 'Habilite as intents: Server Members e Message Content')}<br />
                      5. {t('botPage.conn.discordHowTo5', 'Cole as credenciais abaixo')}
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
                      <strong style={{ color: 'var(--text-primary)' }}>{t('botPage.conn.telegramHowToTitle', 'Como configurar:')}</strong><br />
                      1. {t('botPage.conn.telegramHowTo1', 'Abra o @BotFather no Telegram')} <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
                        style={{ color: '#0088cc', textDecoration: 'underline' }}>@BotFather</a><br />
                      2. {t('botPage.conn.telegramHowTo2', 'Envie /newbot e siga as instruções')}<br />
                      3. {t('botPage.conn.telegramHowTo3', 'Copie o token gerado e cole abaixo')}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveConnection}>
                <div className="form-group">
                  <label>{t('botPage.conn.botToken', 'Bot Token')}</label>
                  <input className="input" type="password" value={connForm.botToken}
                    onChange={(e) => setConnForm({ ...connForm, botToken: e.target.value })}
                    placeholder={platform === 'telegram' ? t('botPage.conn.botTokenTgPlaceholder', 'Seu token do BotFather...') : t('botPage.conn.botTokenDcPlaceholder', 'Seu token do bot...')} />
                </div>

                {platform === 'discord' && (
                  <>
                    <div className="form-group">
                      <label>{t('botPage.conn.clientId', 'Client ID (Application ID)')}</label>
                      <input className="input" value={connForm.clientId}
                        onChange={(e) => setConnForm({ ...connForm, clientId: e.target.value })}
                        placeholder={t('botPage.conn.clientIdPlaceholder', 'ID da aplicação no Discord')} />
                    </div>
                    <div className="form-group">
                      <label>{t('botPage.conn.publicKey', 'Public Key')}</label>
                      <input className="input" value={connForm.publicKey}
                        onChange={(e) => setConnForm({ ...connForm, publicKey: e.target.value })}
                        placeholder={t('botPage.conn.publicKeyPlaceholder', 'Public key da aplicação')} />
                    </div>
                  </>
                )}

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? t('botPage.conn.saving', 'Salvando...') : t('botPage.conn.save', 'Salvar Conexão')}
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
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t('botPage.inter.title', 'Configuração de Interactions')}</h3>
                    {isConnected && (
                      <span className="badge badge-success" style={{ fontSize: 11 }}>{t('botPage.inter.connected', 'Bot Conectado')}</span>
                    )}
                  </div>
                  <span className="badge" style={{
                    background: isConnected ? 'rgba(88,101,242,0.15)' : 'rgba(245,158,11,0.15)',
                    color: isConnected ? '#5865F2' : '#f59e0b',
                    fontSize: 11,
                  }}>{t('botPage.inter.required', 'Obrigatório')}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  {isConnected
                    ? t('botPage.inter.descConnected', 'Configure esta URL no Discord Developer Portal para ativar os painéis de vendas')
                    : t('botPage.inter.descDisconnected', '⚠️ Conecte o bot primeiro na seção acima, depois configure esta URL')}
                </p>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    {t('botPage.inter.urlLabel', 'Interactions Endpoint URL')}
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                      flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                      fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all',
                      color: interactionsUrl ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                      {interactionsUrl || t('botPage.inter.urlPlaceholder', 'Salve a conexão para gerar a URL')}
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
                    {testingEndpoint ? t('botPage.inter.testingBtn', 'Testando...') : t('botPage.inter.testBtn', '🧪 Testar Endpoint')}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={regenerateInteractionsUrl}
                    disabled={regenerating || !interactionsUrl} style={{ gap: 6 }}>
                    <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
                    {regenerating ? t('botPage.inter.regeneratingBtn', 'Regenerando...') : t('botPage.inter.regenBtn', 'Regenerar URL')}
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
                      <strong>{t('botPage.inter.securityTitle', '🔒 URL Única e Segura:')}</strong> {t('botPage.inter.securityDesc', 'Esta URL é exclusiva para o seu bot e contém um token de segurança. Se comprometida, regenere-a.')}
                    </span>
                  </div>
                </div>

                <div style={{
                  marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('botPage.inter.howToTitle', '📋 Como configurar:')}</p>
                  <ol style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2, paddingLeft: 20 }}>
                    <li>{t('botPage.inter.howTo1', 'Acesse o')}{' '}
                      <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer"
                        style={{ color: '#5865F2', textDecoration: 'underline' }}>
                        Discord Developer Portal <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                      </a>
                    </li>
                    <li>{t('botPage.inter.howTo2', 'Selecione sua aplicação/bot')}</li>
                    <li>{t('botPage.inter.howTo3', 'Vá em General Information')}</li>
                    <li>{t('botPage.inter.howTo4', 'Cole a URL acima no campo Interactions Endpoint URL')}</li>
                    <li>{t('botPage.inter.howTo5', 'Clique em Save Changes')}</li>
                  </ol>
                  <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 8 }}>
                    {t('botPage.inter.successMsg', '✅ Após configurar, os painéis de vendas funcionarão automaticamente!')}
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card" style={{ maxWidth: 600 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              {platform === 'discord' ? t('botPage.settings.titleDiscord', 'Configurações do Discord') : t('botPage.settings.titleBot', 'Mensagens do Bot')}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {platform === 'discord'
                ? t('botPage.settings.descDiscord', 'Configure como o bot entrega produtos e gerencia o servidor.')
                : t('botPage.settings.descBot', 'Configure as mensagens automáticas enviadas pelo bot.')}
            </p>
            <form onSubmit={handleSaveConfig}>
              <div className="form-group">
                <label>{t('botPage.settings.delivMsg', 'Mensagem de Entrega')}</label>
                <textarea className="input" rows={4} value={configForm.deliveryMessage}
                  onChange={(e) => setConfigForm({ ...configForm, deliveryMessage: e.target.value })}
                  placeholder={t('botPage.settings.delivMsgPlaceholder', 'Mensagem enviada após a compra ser aprovada')}
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label>{t('botPage.settings.inactiveMsg', 'Mensagem de Assinatura Inativa')}</label>
                <textarea className="input" rows={3} value={configForm.inactiveSubscriptionMessage}
                  onChange={(e) => setConfigForm({ ...configForm, inactiveSubscriptionMessage: e.target.value })}
                  placeholder={t('botPage.settings.inactiveMsgPlaceholder', 'Mensagem enviada quando a assinatura expira')}
                  style={{ resize: 'vertical' }} />
              </div>

              {platform === 'discord' && (
                <>
                  <div className="form-group">
                    <label>{t('botPage.settings.delivType', 'Tipo de Entrega')}</label>
                    <select className="input" value={configForm.discordDeliveryType}
                      onChange={(e) => setConfigForm({ ...configForm, discordDeliveryType: e.target.value })}>
                      <option value="automatic">{t('botPage.settings.delivTypeAuto', 'Automática (Bot entrega no carrinho)')}</option>
                      <option value="manual_role">{t('botPage.settings.delivTypeManual', 'Manual com Staff (Adiciona membros do cargo ao carrinho)')}</option>
                      <option value="manual_notify">{t('botPage.settings.delivTypeNotify', 'Manual com Notificação (Apenas menciona o cargo)')}</option>
                    </select>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      {t('botPage.settings.delivTypeHint', 'Automática: Para produtos digitais. Manual: Para produtos que precisam de ação humana.')}
                    </span>
                  </div>

                  {configForm.discordDeliveryType === 'manual_role' && (
                    <div className="form-group">
                      <label>{t('botPage.settings.staffRole', 'ID do Cargo de Staff')}</label>
                      <input className="input" value={configForm.discordDeliveryRoleId}
                        onChange={(e) => setConfigForm({ ...configForm, discordDeliveryRoleId: e.target.value })}
                        placeholder={t('botPage.settings.staffRolePlaceholder', 'Membros com este cargo serão adicionados ao carrinho')} />
                    </div>
                  )}

                  {configForm.discordDeliveryType === 'manual_notify' && (
                    <div className="form-group">
                      <label>{t('botPage.settings.sellerRole', 'ID do Cargo de Vendedor')}</label>
                      <input className="input" value={configForm.discordNotifyRoleId}
                        onChange={(e) => setConfigForm({ ...configForm, discordNotifyRoleId: e.target.value })}
                        placeholder={t('botPage.settings.sellerRolePlaceholder', 'Este cargo será mencionado sobre novas vendas')} />
                    </div>
                  )}

                  <div className="form-group">
                    <label>{t('botPage.settings.cartCat', 'ID da Categoria de Carrinho')}</label>
                    <input className="input" value={configForm.discordCartCategoryId}
                      onChange={(e) => setConfigForm({ ...configForm, discordCartCategoryId: e.target.value })}
                      placeholder={t('botPage.settings.cartCatPlaceholder', 'Categoria onde os threads de carrinho serão criados')} />
                  </div>
                  <div className="form-group">
                    <label>{t('botPage.settings.salesLog', 'ID do Canal de Log de Vendas')}</label>
                    <input className="input" value={configForm.discordSalesLogChannelId}
                      onChange={(e) => setConfigForm({ ...configForm, discordSalesLogChannelId: e.target.value })}
                      placeholder={t('botPage.settings.salesLogPlaceholder', 'Canal onde serão enviados logs de vendas')} />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="couponsEnabled"
                      checked={configForm.discordCouponsEnabled}
                      onChange={(e) => setConfigForm({ ...configForm, discordCouponsEnabled: e.target.checked })}
                      style={{ width: 'auto' }} />
                    <label htmlFor="couponsEnabled" style={{ margin: 0 }}>{t('botPage.settings.enableCoupons', 'Habilitar cupons no bot')}</label>
                  </div>
                  <div className="form-group">
                    <label>{t('botPage.settings.supportRole', 'ID do Cargo de Suporte/Entrega Manual')}</label>
                    <input className="input" value={configForm.discordSupportRoleId}
                      onChange={(e) => setConfigForm({ ...configForm, discordSupportRoleId: e.target.value })}
                      placeholder={t('botPage.settings.supportRolePlaceholder', 'Membros que farão atendimento em tickets/carrinhos')} />
                  </div>
                  <div className="form-group">
                    <label>{t('botPage.settings.archiveTime', 'Tempo de exclusão da Thread/Carrinho (minutos)')}</label>
                    <input className="input" type="number" value={configForm.discordThreadArchiveMinutes}
                      onChange={(e) => setConfigForm({ ...configForm, discordThreadArchiveMinutes: Number(e.target.value) })}
                      placeholder={t('botPage.settings.archiveTimePlaceholder', 'Padrão: 1440 (24h)')} />
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? t('botPage.settings.saving', 'Salvando...') : t('botPage.settings.save', 'Salvar Configurações')}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'flow' && (
          <FlowBuilder
            flows={flows}
            onChange={setFlows}
            onSave={handleSaveFlows}
            products={filterProductsByPlatform(products, platform)}
            saving={saving}
          />
        )}

        {activeTab === 'panels' && platform === 'discord' && (
          <DiscordPanelsManager
            panels={discordPanels}
            onChange={setDiscordPanels}
            onSave={handleSavePanels}
            saving={saving}
            platform={platform}
          />
        )}
      </div>
    </div>
  );
}
