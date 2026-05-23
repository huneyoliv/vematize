import { useState, useRef } from 'react';
import DOMPurify from 'dompurify';
import api from '../../services/api';
import { Send, Users, Image, MessageSquare, CheckCircle2, XCircle, AlertCircle, Bold, Italic, Underline, Strikethrough, Code, Link as LinkIcon, EyeOff } from 'lucide-react';

interface CampaignResult {
  total: number;
  sent: number;
  failed: number;
  errors: { userId: string; reason: string }[];
}

export default function CampaignPage() {
  const [form, setForm] = useState({ message: '', imageUrl: '' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = (prefix: string, suffix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = form.message;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    
    setForm({ ...form, message: before + prefix + selected + suffix + after });
    
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setSending(true);
    setResult(null);
    setError('');
    try {
      const res = await api.post('/api/campaigns/send', {
        message: form.message,
        imageUrl: form.imageUrl || undefined,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao enviar campanha.');
    }
    setSending(false);
  };


  return (
    <div>
      <div className="page-header">
        <h1>Campanhas</h1>
        <p>Envie mensagens e promoções diretamente para os seus usuários via Telegram</p>
      </div>

      <div className="campaign-layout">
        <div className="campaign-form-col">
          <div className="card">
            <h3 className="settings-section-title" style={{ marginBottom: 4 }}>Nova Campanha</h3>
            <p className="settings-section-desc">A mensagem será enviada para todos os usuários que já interagiram com o bot.</p>

            {error && (
              <div className="alert-banner alert-banner--error" style={{ marginBottom: 20 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={14} /> Mensagem
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => insertFormat('*', '*')} title="Negrito"><Bold size={16} /></button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => insertFormat('_', '_')} title="Itálico"><Italic size={16} /></button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => insertFormat('~', '~')} title="Tachado"><Strikethrough size={16} /></button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => insertFormat('`', '`')} title="Monoespaçado"><Code size={16} /></button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => insertFormat('||', '||')} title="Spoiler"><EyeOff size={16} /></button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => insertFormat('[texto](', ')')} title="Link"><LinkIcon size={16} /></button>
                </div>
                <textarea
                  ref={textareaRef}
                  className="input campaign-textarea"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Digite sua mensagem usando a formatação do Telegram (*negrito*, _itálico_, ~tachado~)..."
                  required
                  rows={8}
                />
                <span className="settings-hint">Utilize a barra acima para aplicar a formatação nativa do Telegram.</span>
              </div>

              <div className="form-group">
                <label>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Image size={14} /> URL da Imagem (opcional)
                  </span>
                </label>
                <input
                  className="input"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
                <span className="settings-hint">Se informada, a imagem será enviada junto com a mensagem como legenda.</span>
              </div>

              <button type="submit" className="btn btn-primary" disabled={sending || !form.message.trim()} style={{ width: '100%' }}>
                <Send size={16} />
                {sending ? 'Enviando...' : 'Enviar Campanha'}
              </button>
            </form>
          </div>
        </div>

        <div className="campaign-preview-col">
          <div className="card campaign-preview-card">
            <h3 className="settings-section-title" style={{ marginBottom: 16 }}>Preview da Mensagem</h3>
            <div className="telegram-preview">
              <div className="telegram-preview-bubble">
                {form.imageUrl && (
                  <div className="telegram-preview-image">
                    <img src={form.imageUrl} alt="Preview" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
                {form.message ? (
                  <div
                    className="telegram-preview-text"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(
                        form.message
                          .replace(/\n/g, '<br/>')
                          .replace(/\*(.*?)\*/g, '<b>$1</b>')
                          .replace(/_(.*?)_/g, '<i>$1</i>')
                          .replace(/~(.*?)~/g, '<s>$1</s>')
                          .replace(/\|\|(.*?)\|\|/g, '<span class="tg-spoiler">$1</span>')
                          .replace(/`(.*?)`/g, '<code>$1</code>')
                          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>'),
                        { 
                          ALLOWED_TAGS: ['b', 'i', 'u', 's', 'code', 'pre', 'a', 'span', 'br'], 
                          ALLOWED_ATTR: ['href', 'class'] 
                        }
                      ) 
                    }}
                  />
                ) : (
                  <span className="telegram-preview-placeholder">Sua mensagem aparecerá aqui...</span>
                )}
              </div>
            </div>
          </div>

          {result && (
            <div className="card campaign-result-card">
              <h3 className="settings-section-title" style={{ marginBottom: 16 }}>Resultado do Envio</h3>
              <div className="campaign-stats">
                <div className="campaign-stat">
                  <Users size={20} className="campaign-stat-icon campaign-stat-icon--total" />
                  <div>
                    <span className="campaign-stat-value">{result.total}</span>
                    <span className="campaign-stat-label">Total</span>
                  </div>
                </div>
                <div className="campaign-stat">
                  <CheckCircle2 size={20} className="campaign-stat-icon campaign-stat-icon--sent" />
                  <div>
                    <span className="campaign-stat-value campaign-stat-value--success">{result.sent}</span>
                    <span className="campaign-stat-label">Enviados</span>
                  </div>
                </div>
                <div className="campaign-stat">
                  <XCircle size={20} className="campaign-stat-icon campaign-stat-icon--failed" />
                  <div>
                    <span className="campaign-stat-value campaign-stat-value--danger">{result.failed}</span>
                    <span className="campaign-stat-label">Falhas</span>
                  </div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="campaign-errors">
                  <p className="campaign-errors-title">Usuários com falha:</p>
                  {result.errors.slice(0, 5).map((e, i) => (
                    <div key={i} className="campaign-error-item">
                      <code className="cell-mono" style={{ fontSize: 11 }}>{e.userId.slice(0, 8)}...</code>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.reason}</span>
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                      + {result.errors.length - 5} outras falhas
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
