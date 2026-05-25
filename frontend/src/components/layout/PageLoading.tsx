import { useLanguage } from '../../hooks/useLanguage';

interface PageLoadingProps {
  showTitle?: boolean;
  stats?: boolean;
  table?: boolean;
}

export default function PageLoading({ showTitle = true, stats = false, table = false }: PageLoadingProps) {
  const { t } = useLanguage();
  return (
    <div className="page-loading" aria-busy="true" aria-label={t('pageLoading.loading')}>
      {showTitle && (
        <div className="page-header">
          <div className="skeleton skeleton-line skeleton-line--title" />
          <div className="skeleton skeleton-line skeleton-line--sub" />
        </div>
      )}
      {stats && (
        <div className="skeleton-grid skeleton-grid-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-stat" />
          ))}
        </div>
      )}
      {table && <div className="skeleton skeleton-table" />}
      {!stats && !table && <div className="skeleton skeleton-line" style={{ width: '120px' }} />}
    </div>
  );
}
