import { useTranslation } from 'react-i18next';
import type { User } from '../types/user';

interface UserTableProps {
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onRestore: (user: User) => void;
}

export function roleBadge(role: User['role']) {
  return <span className={`badge ${role === 'ADMIN' ? 'admin' : 'empleado'}`}>{role}</span>;
}

export function UserTable({ users, loading, onEdit, onDelete, onRestore }: UserTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="card" role="status" aria-label={t('table.loading')}>
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton short" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="card empty">
        <p className="empty-title">{t('table.emptyTitle')}</p>
        <p className="muted">{t('table.emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="card table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>{t('table.name')}</th>
            <th>{t('table.email')}</th>
            <th>{t('table.role')}</th>
            <th>{t('table.status')}</th>
            <th className="actions-col">{t('table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const deleted = Boolean(user.deletedAt);
            return (
              <tr key={user.id} className={deleted ? 'deleted' : undefined}>
                <td className="strong">{user.name}</td>
                <td className="muted">{user.email}</td>
                <td>{roleBadge(user.role)}</td>
                <td>
                  {deleted ? (
                    <span className="badge danger">{t('table.inactive')}</span>
                  ) : (
                    <span className="badge ok">{t('table.active')}</span>
                  )}
                </td>
                <td className="actions">
                  {!deleted ? (
                    <>
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => onEdit(user)}
                        aria-label={`${t('table.edit')} ${user.name}`}
                      >
                        {t('table.edit')}
                      </button>
                      <button
                        type="button"
                        className="btn small danger-outline"
                        onClick={() => onDelete(user)}
                        aria-label={`${t('table.delete')} ${user.name}`}
                      >
                        {t('table.delete')}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn small primary"
                      onClick={() => onRestore(user)}
                      aria-label={`${t('table.restore')} ${user.name}`}
                    >
                      {t('table.restore')}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
