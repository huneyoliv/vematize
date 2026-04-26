interface BotButton {
  id: string;
  text: string;
  action: {
    type: string;
    payload?: string;
  };
}

interface BotStep {
  id: string;
  name: string;
  message: string;
  buttons: BotButton[];
}

interface TelegramPreviewProps {
  step: BotStep;
}

function renderTelegramMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.12);padding:2px 6px;border-radius:3px;font-size:12px;font-family:monospace">$1</code>')
    .replace(/\{userName\}/g, '<span style="color:#64b5f6">João</span>')
    .replace(/\{userEmail\}/g, '<span style="color:#64b5f6">joao@email.com</span>')
    .replace(/\n/g, '<br/>');
}

export default function TelegramPreview({ step }: TelegramPreviewProps) {
  const html = renderTelegramMarkdown(step.message || '');

  return (
    <div style={{
      width: 300,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a2980, #26d0ce)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          flexShrink: 0,
          marginTop: 2,
        }}>🤖</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64b5f6', marginBottom: 4 }}>Seu Bot</div>
          <div style={{
            background: '#1e3a5f',
            borderRadius: '4px 16px 16px 16px',
            padding: '10px 14px',
            border: '1px solid rgba(100,181,246,0.15)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}>
            <div
              style={{
                color: '#e8eaf6',
                fontSize: 13.5,
                lineHeight: 1.55,
                wordBreak: 'break-word',
              }}
              dangerouslySetInnerHTML={{
                __html: html || '<span style="color:rgba(232,234,246,0.3);font-style:italic">Mensagem vazia...</span>',
              }}
            />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'right', marginTop: 5 }}>
              agora ✓✓
            </div>
          </div>

          {step.buttons.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
              {step.buttons.map((btn) => (
                <div key={btn.id} style={{
                  background: 'rgba(30,90,160,0.5)',
                  border: '1px solid rgba(100,181,246,0.25)',
                  borderRadius: 10,
                  padding: '8px 14px',
                  textAlign: 'center',
                  fontSize: 13,
                  color: '#90caf9',
                  fontWeight: 600,
                }}>
                  {btn.text || 'Botão'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
