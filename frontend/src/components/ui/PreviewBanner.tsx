export default function PreviewBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        background: 'rgba(10, 10, 20, 0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: 320,
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>🔍</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>
          Ambiente de Preview
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          Nenhum dado é salvo. Não insira informações reais.
        </div>
      </div>
    </div>
  );
}
