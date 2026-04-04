import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { TelegramIcon, DiscordIcon } from '../icons/platform-icons';

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
    return <p style={{ color: 'var(--text-secondary)' }}>Carregando...</p>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Meus Bots</h1>
        <p>Gerencie as conexões e configurações dos seus bots</p>
      </div>

      <div className="grid grid-2" style={{ maxWidth: 800 }}>
        {platforms.map((p) => {
          const status = getStatus(p.key);
          const Icon = p.icon;
          return (
            <div
              key={p.key}
              className="card bot-card"
              onClick={() => navigate(`/bots/${p.key}`)}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-sm)',
                    background: `${p.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon width={22} height={22} style={{ color: p.color }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {p.key === 'telegram' ? 'Bot pessoal' : 'Bot de servidor'}
                    </span>
                  </div>
                </div>
                <span className={`badge ${status === 'connected' ? 'badge-success' : 'badge-danger'}`}>
                  {status === 'connected' ? 'Conectado' : 'Desconectado'}
                </span>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                {p.description}
              </p>

              <button className="btn btn-primary" style={{ width: '100%' }}>
                {status === 'connected' ? 'Ver Configuração' : 'Configurar Conexão'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
