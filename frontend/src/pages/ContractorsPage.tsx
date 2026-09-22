import { useActiveClient } from '../context/ActiveClientContext';
import { ClientContractorsSection } from '../components/ClientContractorsSection';
import { useTranslation } from 'react-i18next';
export function ContractorsPage() {
  const { activeClientId } = useActiveClient();
  const { t } = useTranslation();

  if (!activeClientId) {
    return (
      <div className="page">
        <div className="card empty" style={{ marginTop: '2rem' }}>
          <p className="empty-title">{t('clients.selectClientToViewContractors', 'Seleccione un cliente')}</p>
          <p className="muted">{t('clients.selectClientHint', 'Por favor, seleccione un cliente en el menú superior para ver sus contratistas.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <ClientContractorsSection clientId={activeClientId} />
    </div>
  );
}
