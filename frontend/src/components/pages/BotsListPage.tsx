import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { TelegramIcon, DiscordIcon } from '../icons/platform-icons';
import PageLoading from '../layout/PageLoading';

interface BotStatus {
  platform: string;
  botToken?: string;
  clientId?: string;
  publicKey?: string;
}

const platforms = [
  {
    key: 'telegram',
    name: 'Telegram',
    description: 'Crie um bot personalizado para interagir com seus usuários via Telegram.',
    icon: TelegramIcon,
    color: '#0088cc',
    connectionKey: 'botToken',
  },
  {
    key: 'discord',
    name: 'Discord',
    description: 'Crie um bot do Discord para gerenciar sua comunidade e automatizar vendas.',
    icon: DiscordIcon,
    color: '#5865F2',
    connectionKey: 'botToken',
  },
];

export default function BotsListPage() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<BotStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/bots')
      .then((res) => setConfigs(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatus = (platformKey: string) => {
    const cfg = configs.find((c) => c.platform === platformKey);
    return cfg?.botToken ? 'connected' : 'disconnected';
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Meus Bots</h1>
        <p>Gerencie as conexões e configurações dos seus bots</p>
      </div>

      <div className="grid grid-2 bots-grid">
        {platforms.map((p) => {
          const status = getStatus(p.key);
          const Icon = p.icon;
          return (
            <div
              key={p.key}
              className="card bot-card"
              onClick={() => navigate(`/bots/${p.key}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/bots/${p.key}`);
                }
              }}
            >
              <div className="bot-card-header">
                <div className="bot-card-title">
                  <div
                    className="bot-card-icon"
                    style={{ background: `${p.color}20` }}
                  >
                    <Icon width={22} height={22} style={{ color: p.color }} />
                  </div>
                  <div>
                    <h3 className="bot-card-name">{p.name}</h3>
                    <span className="bot-card-type">
                      {p.key === 'telegram' ? 'Bot pessoal' : 'Bot de servidor'}
                    </span>
                  </div>
                </div>
                <span className={`badge ${status === 'connected' ? 'badge-success' : 'badge-danger'}`}>
                  {status === 'connected' ? 'Conectado' : 'Desconectado'}
                </span>
              </div>

              <p className="bot-card-desc">{p.description}</p>

              <button type="button" className="btn btn-primary bot-card-action">
                {status === 'connected' ? 'Ver configuração' : 'Configurar conexão'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
