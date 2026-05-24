import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/app/dashboard');
  };

  const features = [
    {
      icon: '🤖',
      title: 'Bots Inteligentes',
      description: 'Integração completa com Telegram e Discord. Crie fluxos dinâmicos baseados em gatilhos específicos e mensagens personalizadas.',
    },
    {
      icon: '💳',
      title: 'Multi-gateway PIX',
      description: 'Suporte nativo aos gateways Mercado Pago e Efí Bank com PIX automatizado, conciliação em tempo real e retorno instantâneo.',
    },
    {
      icon: '📦',
      title: 'Entrega Automatizada',
      description: 'Envio automático de chaves de ativação, convites para grupos no Telegram e atribuição de cargos em servidores do Discord.',
    },
    {
      icon: '🎫',
      title: 'Cupons de Desconto',
      description: 'Crie campanhas flexíveis com cupons de porcentagem, valor fixo ou bônus de dias grátis na assinatura de serviços.',
    },
    {
      icon: '📊',
      title: 'Dashboard Completo',
      description: 'Métricas precisas de vendas, controle total de usuários, cupons ativos, relatórios financeiros e gestão de inventário de chaves.',
    },
    {
      icon: '🚀',
      title: 'Pronto para Produção',
      description: 'Infraestrutura robusta com Docker Compose, Nginx integrado, autenticação JWT segura, bcrypt e rate limiting de série.',
    },
  ];

  const technologies = [
    { category: 'Frontend', items: ['React', 'TypeScript', 'Vite', 'Tailwind CSS'] },
    { category: 'Backend', items: ['NestJS', 'Go', 'Clean Architecture', 'REST APIs'] },
    { category: 'Database & Cache', items: ['PostgreSQL 15', 'Redis 7', 'SQL queries'] },
    { category: 'DevOps & Infra', items: ['Docker Compose', 'Nginx Proxy', 'Multi-stage builds'] },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a14',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '0 20px',
      overflowX: 'hidden',
    }}>
      {/* Header */}
      <header style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '30px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.05em', background: 'linear-gradient(135deg, #7c3aed, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            VEMATIZE
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 12, backgroundColor: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
            PREVIEW
          </span>
        </div>
        <button
          onClick={handleStart}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ffffff';
            e.currentTarget.style.color = '#0a0a14';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#ffffff';
          }}
        >
          Ver Painel
        </button>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: 900,
        margin: '100px auto 80px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          marginBottom: 24,
          background: 'linear-gradient(to right, #ffffff 40%, rgba(255, 255, 255, 0.7))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Automação Completa para Suas Vendas Digitais
        </h1>
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: '#9ca3af',
          lineHeight: 1.6,
          marginBottom: 40,
          maxWidth: 680,
          marginInline: 'auto',
        }}>
          Gerencie produtos, integre gateways de pagamento via PIX, customize bots do Telegram e Discord e gerencie clientes automaticamente. Uma plataforma de ponta para infoprodutos e assinaturas.
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={handleStart}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '14px 28px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.3)',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Acessar Preview
          </button>
          <a
            href="https://github.com/huneyoliv/vematize"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '14px 28px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
          >
            Código-Fonte
          </a>
        </div>
      </section>

      {/* Preview Container Mockup */}
      <section style={{
        maxWidth: 1100,
        margin: '0 auto 120px',
        position: 'relative',
        borderRadius: 16,
        padding: 4,
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(16, 185, 129, 0.2))',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <div style={{
          backgroundColor: '#0a0a0f',
          borderRadius: 12,
          overflow: 'hidden',
          aspectRatio: '16/9',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Mock Browser Header */}
          <div style={{
            height: 40,
            backgroundColor: '#0e0e18',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 8,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#eab308' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <div style={{
              marginLeft: 24,
              flex: 1,
              maxWidth: 400,
              height: 24,
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              fontSize: 10,
              color: 'rgba(255,255,255,0.3)',
            }}>
              huneyoliv.github.io/vematize/app/dashboard
            </div>
          </div>
          {/* Mock Content */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #111122 0%, #0a0a0f 100%)',
            padding: 40,
            textAlign: 'center',
            cursor: 'pointer',
          }} onClick={handleStart}>
            <div>
              <div style={{
                fontSize: 48,
                marginBottom: 16,
                filter: 'drop-shadow(0 0 10px rgba(124, 58, 237, 0.4))',
              }}>
                ⚡
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Explore a Experiência Interativa</h3>
              <p style={{ fontSize: 13, color: '#9ca3af', maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.5 }}>
                Clique para abrir o painel administrativo. Não é necessário criar conta ou logar. Todos os dados são gerados localmente para testes.
              </p>
              <button style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                Iniciar Demonstração
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        maxWidth: 1200,
        margin: '0 auto 120px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 12 }}>
            Recursos Completos da Plataforma
          </h2>
          <p style={{ color: '#9ca3af', maxWidth: 500, marginInline: 'auto' }}>
            Desenvolvido com o que há de melhor em padrões de mercado para garantir agilidade e estabilidade.
          </p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}>
          {features.map((feat, i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: 12,
                padding: 30,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.25)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 20 }}>{feat.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#ffffff' }}>
                {feat.title}
              </h3>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6 }}>
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section style={{
        maxWidth: 1200,
        margin: '0 auto 120px',
        padding: '60px 40px',
        backgroundColor: '#07070f',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Pilha Tecnológica Robustez & Performance</h2>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Arquitetura moderna separada de forma independente para máxima escalabilidade.</p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 32,
        }}>
          {technologies.map((tech, i) => (
            <div key={i}>
              <h4 style={{ fontSize: 13, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>
                {tech.category}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tech.items.map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#9ca3af' }}>
                    <span style={{ color: '#10b981' }}>✔</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <footer style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '80px 0 40px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Experimente o Vematize Agora</h3>
          <p style={{ color: '#9ca3af', maxWidth: 460, margin: '0 auto 24px', fontSize: 15 }}>
            Acesse a interface completa do produto com dados mockados e conheça cada detalhe operacional.
          </p>
          <button
            onClick={handleStart}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 15px -3px rgba(124, 58, 237, 0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Iniciar Preview
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, fontSize: 13, color: '#6b7280' }}>
          <div>
            © {new Date().getFullYear()} Vematize. Licenciado sob MIT.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="https://github.com/huneyoliv/vematize" target="_blank" rel="noopener noreferrer" style={{ color: '#9ca3af', textDecoration: 'none' }}>GitHub</a>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
            <span style={{ color: '#9ca3af' }}>Projeto Open-Source</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
