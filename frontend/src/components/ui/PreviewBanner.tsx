import { createPortal } from 'react-dom';

export default function PreviewBanner() {
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        maxWidth: 320,
        pointerEvents: 'none',
        boxShadow: '0 12px 32px rgba(2, 6, 23, 0.45)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>🔍</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(248, 250, 252, 0.9)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>
          Ambiente de Preview
        </div>
        <div style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.9)', lineHeight: 1.5 }}>
          Nenhum dado é salvo. Não insira informações reais.
        </div>
      </div>
    </div>,
    document.body
  );
}

