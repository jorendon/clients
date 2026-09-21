import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Building2, HardHat, Settings, Users, Upload } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();

  return (
    <div className="page dashboard-page">
      <header className="dashboard-header">
        <h1>{t('dashboard.greeting', { name: user?.name.split(' ')[0] || 'User' })}</h1>
        <p className="muted">{t('dashboard.subtitle')}</p>
      </header>

      <div className="dashboard-grid">
        <Link to="/clients" className="quick-action-card">
          <div className="icon-wrapper primary">
            <Building2 size={28} />
          </div>
          <h3>{t('dashboard.clients')}</h3>
          <p className="muted">{t('dashboard.clientsDesc')}</p>
        </Link>

        <Link to="/contractors" className="quick-action-card">
          <div className="icon-wrapper secondary">
            <HardHat size={28} />
          </div>
          <h3>{t('dashboard.contractors')}</h3>
          <p className="muted">{t('dashboard.contractorsDesc')}</p>
        </Link>

        <Link to="/clients/import" className="quick-action-card">
          <div className="icon-wrapper info">
            <Upload size={28} />
          </div>
          <h3>{t('dashboard.import')}</h3>
          <p className="muted">{t('dashboard.importDesc')}</p>
        </Link>

        {isAdmin && (
          <Link to="/users" className="quick-action-card">
            <div className="icon-wrapper warning">
              <Users size={28} />
            </div>
            <h3>{t('dashboard.users')}</h3>
            <p className="muted">{t('dashboard.usersDesc')}</p>
          </Link>
        )}

        <Link to="/settings" className="quick-action-card">
          <div className="icon-wrapper neutral">
            <Settings size={28} />
          </div>
          <h3>{t('dashboard.settings')}</h3>
          <p className="muted">{t('dashboard.settingsDesc')}</p>
        </Link>
      </div>
    </div>
  );
}
