import { useEffect, useState, useRef } from 'react';
import { Upload, Trash2, Copy, Check, ExternalLink, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api';
import PageLoading from '../layout/PageLoading';
import { useLanguage } from '../../hooks/useLanguage';

interface GalleryImage {
  id: string;
  url: string;
  name?: string;
  createdAt: string;
}

export default function GalleryPage() {
  const { t } = useLanguage();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = async () => {
    try {
      const res = await api.get('/api/gallery');
      setImages(res.data);
    } catch (error) {
      console.error(t('galleryPage.errorFetch'), error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/api/gallery/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchImages();
    } catch (error) {
      alert(t('galleryPage.errorUpload'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('galleryPage.deleteConfirm'))) return;
    try {
      await api.delete(`/api/gallery/${id}`);
      setImages(prev => prev.filter(img => img.id !== id));
    } catch (error) {
      alert(t('galleryPage.errorDelete'));
    }
  };

  const copyToClipboard = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <PageLoading />;

  return (
    <div className="gallery-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{t('galleryPage.title')}</h1>
          <p>{t('galleryPage.subtitle')}</p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="app-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                {t('galleryPage.uploading')}
              </span>
            ) : (
              <>
                <Upload size={18} />
                {t('galleryPage.newImage')}
              </>
            )}
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ImageIcon size={48} />
          </div>
          <h3>{t('galleryPage.emptyTitle')}</h3>
          <p>{t('galleryPage.emptyDesc')}</p>
        </div>
      ) : (
        <div className="gallery-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginTop: '2rem'
        }}>
          {images.map(image => (
            <div key={image.id} className="card gallery-card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
              <div
                className="gallery-image-wrapper"
                style={{
                  width: '100%',
                  height: '150px',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}
              >
                <img
                  src={image.url}
                  alt={image.name || t('galleryPage.imgAlt')}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {image.name || t('galleryPage.unnamedImg')}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => copyToClipboard(image.id, image.url)}
                    title={t('galleryPage.copyUrl')}
                  >
                    {copiedId === image.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    <span style={{ fontSize: '0.75rem' }}>{copiedId === image.id ? t('galleryPage.copied') : t('galleryPage.copy')}</span>
                  </button>
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    title={t('galleryPage.openImg')}
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    className="btn btn-ghost btn-sm text-error"
                    onClick={() => handleDelete(image.id)}
                    title={t('galleryPage.delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
