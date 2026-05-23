import { useEffect, useState } from 'react';
import { X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

interface GalleryImage {
  id: string;
  url: string;
  name?: string;
}

interface GallerySelectorModalProps {
  onClose: () => void;
  onSelect: (url: string) => void;
}

export default function GallerySelectorModal({ onClose, onSelect }: GallerySelectorModalProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/gallery')
      .then((res: any) => setImages(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <h2>Selecione uma Imagem</h2>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Carregando imagens...
            </div>
          ) : images.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <ImageIcon size={48} style={{ color: 'var(--text-muted)' }} />
              <h3>Nenhuma imagem encontrada</h3>
              <p>Vá até a aba "Galeria" para fazer upload de imagens.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '1rem',
              maxHeight: '60vh',
              overflowY: 'auto',
              padding: '0.5rem'
            }}>
              {images.map(img => (
                <div
                  key={img.id}
                  onClick={() => onSelect(img.url)}
                  className="gallery-select-item"
                  style={{
                    cursor: 'pointer',
                    borderRadius: '0.5rem',
                    border: '2px solid transparent',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-secondary)',
                    transition: 'border-color 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={img.url} alt="Galeria" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s'
                  }}
                  className="gallery-select-overlay"
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                  >
                    <CheckCircle2 size={32} color="white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
