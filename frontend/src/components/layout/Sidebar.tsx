import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Bot,
  Tag,
  Settings,
  LogOut,
  Megaphone,
  Image as ImageIcon,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';

const IS_PREVIEW = import.meta.env.VITE_PREVIEW_MODE === 'true';
const APP_PREFIX = IS_PREVIEW ? '/app' : '';

const navItems = [
  { to: '/dashboard', labelKey: 'navigation.dashboard', icon: LayoutDashboard },
  { to: '/products', labelKey: 'navigation.products', icon: Package },
  { to: '/users', labelKey: 'navigation.users', icon: Users },
  { to: '/sales', labelKey: 'navigation.sales', icon: ShoppingCart },
  { to: '/bots', labelKey: 'navigation.bots', icon: Bot },
  { to: '/coupons', labelKey: 'navigation.coupons', icon: Tag },
  { to: '/campanhas', labelKey: 'navigation.campaigns', icon: Megaphone },
  { to: '/gallery', labelKey: 'navigation.gallery', icon: ImageIcon },
  { to: '/settings', labelKey: 'navigation.settings', icon: Settings },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate(`${APP_PREFIX}/login`);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
        <img src={logoImg} alt="Vematize" style={{ height: '100px', width: '100%', maxWidth: '220px', objectFit: 'contain' }} />
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={`${APP_PREFIX}${item.to}`}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <item.icon size={18} />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">{user?.username}</div>
        <button type="button" className="sidebar-link sidebar-logout" onClick={handleLogout}>
          <LogOut size={18} />
          {t('navigation.logout')}
        </button>
      </div>
    </aside>
  );
}
