import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { useState, type JSX } from 'react';
import {
  Building2,
  FileText,
  HardHat,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  Users as UsersIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { BrandingProvider, useBranding } from './branding/BrandingContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { UsersPage } from './pages/UsersPage';
import { LoginPage } from './pages/LoginPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { ClientsImportPage } from './pages/ClientsImportPage';
import { ClientContractorsImportPage } from './pages/ClientContractorsImportPage';
import { ContractorsPage } from './pages/ContractorsPage';
import { DocumentTypesPage } from './pages/DocumentTypesPage';
import { SettingsPage } from './pages/SettingsPage';

function ClientDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <ClientDetailPage clientId={Number(id)} />;
}

function ClientContractorsImportRoute() {
  const { id } = useParams<{ id: string }>();
  return <ClientContractorsImportPage clientId={Number(id)} />;
}

function Protected({ adminOnly, children }: { adminOnly?: boolean; children: JSX.Element }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export function Shell() {
  const { t } = useTranslation();
  const { branding } = useBranding();
  const { user, isAdmin, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('oc-sidebar') === 'collapsed');
  // Evita que el flyout se abra solo justo al recoger (el mouse sigue encima)
  const [flyoutLock, setFlyoutLock] = useState(false);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('oc-sidebar', next ? 'collapsed' : 'expanded');
    if (next) setFlyoutLock(true);
  }

  const links = [
    { to: '/clients', label: t('nav.clients'), icon: <Building2 size={20} /> },
    { to: '/contractors', label: t('nav.contractors'), icon: <HardHat size={20} /> },
    { to: '/document-types', label: t('nav.docTypes'), icon: <FileText size={20} /> },
    ...(isAdmin
      ? [{ to: '/users', label: t('nav.users'), icon: <UsersIcon size={20} /> }]
      : []),
    { to: '/settings', label: t('nav.settings'), icon: <SettingsIcon size={20} /> },
  ];

  return (
    <div className={`layout${collapsed ? ' rail' : ''}${flyoutLock ? ' no-flyout' : ''}`}>
      <aside className="sidebar" onMouseLeave={() => setFlyoutLock(false)}>
        <div className="side-top">
          <button
            type="button"
            className="side-toggle"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            title={collapsed ? t('nav.expand') : t('nav.collapse')}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <Link to="/" className="brand">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="brand-logo" />
            ) : (
              <span className="brand-mark">OC</span>
            )}
            {(branding.companyName || branding.tagline) && (
              <span className="brand-text">
                {branding.companyName}
                {branding.tagline ? ` · ${branding.tagline}` : ''}
              </span>
            )}
          </Link>
        </div>
        <nav className="side-nav" aria-label="Principal">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              title={link.label}
              className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}
            >
              <span className="side-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span className="side-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          {user && (
            <span className="user-chip" title={user.email}>
              {user.name} · {user.role}
            </span>
          )}
          {user && (
            <button type="button" className="btn small side-btn" onClick={logout} title={t('auth.logout')}>
              <span className="side-icon" aria-hidden="true">
                <LogOut size={16} />
              </span>
              <span className="side-label">{t('auth.logout')}</span>
            </button>
          )}
          <LanguageSwitcher />
        </div>
      </aside>
      <div className="main">
        <main className="container wide">
          <Routes>
          <Route path="/" element={<Protected><ClientsPage /></Protected>} />
          <Route path="/clients" element={<Protected><ClientsPage /></Protected>} />
          <Route path="/clients/import" element={<Protected><ClientsImportPage /></Protected>} />
          <Route path="/clients/:id" element={<Protected><ClientDetailRoute /></Protected>} />
          <Route
            path="/clients/:id/contractors/import"
            element={<Protected><ClientContractorsImportRoute /></Protected>}
          />
          <Route path="/contractors" element={<Protected><ContractorsPage /></Protected>} />
          <Route path="/document-types" element={<Protected><DocumentTypesPage /></Protected>} />
          <Route path="/users" element={<Protected adminOnly><UsersPage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
          <Route
            path="*"
            element={
              <div className="card empty">
                <p className="empty-title">{t('users.notFoundTitle')}</p>
                <Link to="/" className="btn primary">
                  {t('users.backToUsers')}
                </Link>
              </div>
            }
          />
        </Routes>
        </main>
        {(branding.email || branding.phone || branding.address) && (
          <footer className="footer">
            <span className="muted">
              {[branding.companyName, branding.email, branding.phone, branding.address]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </footer>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BrandingProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<Shell />} />
          </Routes>
        </AuthProvider>
      </BrandingProvider>
    </BrowserRouter>
  );
}
