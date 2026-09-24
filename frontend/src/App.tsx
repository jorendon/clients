import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { useState, useRef, type JSX } from 'react';
import {
  FileText,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  Users as UsersIcon,
  Folder,
  ChevronDown,
  ChevronRight,
  Home,
  User,
  HardHat,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { BrandingProvider, useBranding } from './branding/BrandingContext';
import { ActiveClientProvider, useActiveClient } from './context/ActiveClientContext';
import { ClientSelector } from './components/ClientSelector';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { UsersPage } from './pages/UsersPage';
import { LoginPage } from './pages/LoginPage';
import { ClientsPage } from './pages/ClientsPage';
import { ContractorsPage } from './pages/ContractorsPage';
import { ClientSettingsPage } from './pages/ClientSettingsPage';

import { ClientsImportPage } from './pages/ClientsImportPage';
import { ClientContractorsImportPage } from './pages/ClientContractorsImportPage';
import { DocumentTypesPage } from './pages/DocumentTypesPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';


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
  const { activeClientId } = useActiveClient();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('oc-sidebar') === 'collapsed');
  // Evita que el flyout se abra solo justo al recoger (el mouse sigue encima)
  const [flyoutLock, setFlyoutLock] = useState(false);
  // Timer para evitar que el hover trigger abra el panel si se pasa muy rápido (o justo después de colapsar)
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  // Control de submenús abiertos por defecto
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('oc-sidebar', next ? 'collapsed' : 'expanded');
    setFlyoutLock(false);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  type NavItem = {
    key: string;
    to?: string;
    label: string;
    icon: React.ReactNode;
    children?: NavItem[];
  };

  const navGroups: NavItem[] = [
    { key: 'dashboard', to: '/', label: t('nav.home') || 'Home', icon: <Home size={20} /> },
    {
      key: 'directory',
      label: t('nav.directory'),
      icon: <Folder size={20} />,
      children: [
        { key: 'contractors', to: '/contractors', label: t('nav.contractors', 'Contratistas'), icon: <HardHat size={20} /> },
      ],
    },
    ...(isAdmin
      ? [
          {
            key: 'admin',
            label: t('nav.admin'),
            icon: <Folder size={20} />,
            children: [
              { key: 'doctypes', to: '/document-types', label: t('nav.docTypes'), icon: <FileText size={20} /> },
              { key: 'users', to: '/users', label: t('nav.users'), icon: <UsersIcon size={20} /> },
            ],
          },
          { key: 'settings', to: '/settings', label: t('nav.settings'), icon: <SettingsIcon size={20} /> },
        ]
      : []),
  ];

  return (
    <div className={`app-wrapper${collapsed ? ' rail' : ''}${flyoutLock ? ' no-flyout' : ''}`}>
      <header className="global-header">
        <div className="header-left">
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
          <ClientSelector />
        </div>
        <div className="header-right">
          {activeClientId && (
            <Link to="/client-settings" className="btn small ghost icon-only" title={t('common.settings', 'Configuración')}>
              <SettingsIcon size={16} />
            </Link>
          )}
          {user && (
            <Link to="/profile" className="user-chip" title={user.email}>
              <User size={16} />
              {user.name} · {user.role}
            </Link>
          )}
          {user && (
            <button type="button" className="btn small ghost" onClick={logout} title={t('auth.logout')}>
              <span className="side-icon" aria-hidden="true">
                <LogOut size={16} />
              </span>
            </button>
          )}
          <LanguageSwitcher />
        </div>
      </header>
      <div className="layout">
        {/* Zona invisible de hover para desplegar el overlay cuando está colapsado */}
        {collapsed && (
          <div 
            className="sidebar-hover-trigger" 
            onMouseEnter={() => {
              hoverTimer.current = setTimeout(() => {
                setFlyoutLock(true);
              }, 300); // 300ms de retraso intencional
            }}
            onMouseLeave={() => {
              if (hoverTimer.current) clearTimeout(hoverTimer.current);
            }}
          />
        )}
        
        {/* Overlay background when flyout is open to capture clicks outside */}
        {collapsed && flyoutLock && (
          <div className="sidebar-backdrop" onClick={() => setFlyoutLock(false)} />
        )}

        <aside 
          className={`sidebar${flyoutLock ? ' flyout-open' : ''}`} 
          onMouseLeave={() => setFlyoutLock(false)}
        >
          <nav className="side-nav" aria-label="Principal">
            {navGroups.map((group) => {
              if (group.children) {
                const isOpen = openGroups[group.key];
                return (
                  <div key={group.key} className="nav-group">
                    <button 
                      className="side-link group-toggle" 
                      onClick={() => toggleGroup(group.key)}
                      aria-expanded={isOpen}
                    >
                      <span className="side-icon" aria-hidden="true">{group.icon}</span>
                      <span className="side-label">{group.label}</span>
                      <span className="side-chevron">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="group-children">
                        {group.children.map((child) => (
                          <NavLink
                            key={child.key}
                            to={child.to!}
                            title={child.label}
                            className={({ isActive }) => `side-link sub-link${isActive ? ' active' : ''}`}
                            onClick={() => {
                              if (collapsed) setFlyoutLock(false);
                            }}
                          >
                            <span className="side-icon" aria-hidden="true">{child.icon}</span>
                            <span className="side-label">{child.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <NavLink
                  key={group.key}
                  to={group.to!}
                  title={group.label}
                  className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}
                  onClick={() => {
                    if (collapsed) setFlyoutLock(false);
                  }}
                >
                  <span className="side-icon" aria-hidden="true">{group.icon}</span>
                  <span className="side-label">{group.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>
        <div className="main">
        <main className="container wide">
          <Routes>
          <Route path="/" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/clients" element={<Protected><ClientsPage /></Protected>} />
          <Route path="/contractors" element={<Protected><ContractorsPage /></Protected>} />
          <Route path="/client-settings" element={<Protected><ClientSettingsPage /></Protected>} />
          <Route path="/clients/import" element={<Protected><ClientsImportPage /></Protected>} />

          <Route
            path="/clients/:id/contractors/import"
            element={<Protected><ClientContractorsImportRoute /></Protected>}
          />
          <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
          <Route path="/document-types" element={<Protected adminOnly><DocumentTypesPage /></Protected>} />
          <Route path="/users" element={<Protected adminOnly><UsersPage /></Protected>} />
          <Route path="/settings" element={<Protected adminOnly><SettingsPage /></Protected>} />
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
        {(() => {
          const primaryEmail = branding.emails?.find((e) => e.isPrimary)?.value ?? branding.emails?.[0]?.value;
          const primaryPhone = branding.phones?.find((e) => e.isPrimary)?.value ?? branding.phones?.[0]?.value;
          const primaryAddress = branding.addresses?.find((e) => e.isPrimary)?.value ?? branding.addresses?.[0]?.value;

          if (!primaryEmail && !primaryPhone && !primaryAddress) return null;

          return (
            <footer className="footer">
              <span className="muted">
                {[branding.companyName, primaryEmail, primaryPhone, primaryAddress]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </footer>
          );
        })()}
      </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <BrandingProvider>
        <AuthProvider>
          <ActiveClientProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={<Shell />} />
            </Routes>
          </ActiveClientProvider>
        </AuthProvider>
      </BrandingProvider>
    </BrowserRouter>
  );
}
