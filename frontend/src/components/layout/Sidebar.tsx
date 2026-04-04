import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Bot,
  Tag,
  Settings,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Produtos', icon: Package },
  { to: '/users', label: 'Usuários', icon: Users },
  { to: '/sales', label: 'Vendas', icon: ShoppingCart },
  { to: '/bots', label: 'Bots', icon: Bot },
  { to: '/coupons', label: 'Cupons', icon: Tag },
  { to: '/settings', label: 'Configurações', icon: Settings },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>⚡ Vematize</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          {user?.username}
        </div>
        <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}>
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
