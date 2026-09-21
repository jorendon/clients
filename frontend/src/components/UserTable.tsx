import { useTranslation } from 'react-i18next';
import type { User } from '../types/user';
import { Pencil, Trash2, RotateCcw } from 'lucide-react';
import { useSortableTable } from '../hooks/useSortableTable';

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
  const { items: sortedUsers, requestSort, getSortIndicator } = useSortableTable(users, { key: 'name', direction: 'asc' }, (item, key) => {
    if (key === 'status') return Boolean(item.deletedAt) ? 1 : 0; // 0 = active, 1 = inactive
    return item[key as keyof User];
  });

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
            <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('name')}>
              {t('table.name')}{getSortIndicator('name')}
            </th>
            <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('email')}>
              {t('table.email')}{getSortIndicator('email')}
            </th>
            <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('role')}>
              {t('table.role')}{getSortIndicator('role')}
            </th>
            <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('status')}>
              {t('table.status')}{getSortIndicator('status')}
            </th>
            <th className="actions-col">{t('table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user) => {
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
                        className="btn small icon-only"
                        onClick={() => onEdit(user)}
                        title={t('table.edit')}
                        aria-label={`${t('table.edit')} ${user.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn small danger-outline icon-only"
                        onClick={() => onDelete(user)}
                        title={t('table.delete')}
                        aria-label={`${t('table.delete')} ${user.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn small primary icon-only"
                      onClick={() => onRestore(user)}
                      title={t('table.restore')}
                      aria-label={`${t('table.restore')} ${user.name}`}
                    >
                      <RotateCcw size={16} />
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
