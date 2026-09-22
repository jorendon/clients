import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Building2, Settings, Search } from 'lucide-react';
import { fetchClients } from '../api/clients';
import type { Party } from '../types/party';
import { useActiveClient } from '../context/ActiveClientContext';
import { useNavigate } from 'react-router-dom';

export function ClientSelector() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeClientId, setActiveClientId } = useActiveClient();
  const [clients, setClients] = useState<Party[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const list = await fetchClients('', 'ALL');
        setClients(list);
      } catch (err) {
        // Ignorar errores silenciosamente para el selector
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); // Clear search on close
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeClient = clients.find(c => c.id === activeClientId);
  const filteredClients = clients.filter(c => c.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="client-selector" ref={containerRef}>
      <button 
        type="button" 
        className="client-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="client-selector-name">
          {activeClient ? activeClient.fullName : t('clients.selectClient', 'Seleccionar Cliente')}
        </span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="client-selector-dropdown">
          <div className="client-selector-search-wrapper">
            <Search size={14} className="client-selector-search-icon" />
            <input
              type="text"
              className="client-selector-search-input"
              placeholder={t('common.search', 'Buscar...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="client-selector-list">
            {loading ? (
              <div className="client-selector-item muted">{t('table.loading', 'Cargando...')}</div>
            ) : filteredClients.length === 0 ? (
              <div className="client-selector-item muted">{t('clients.emptyTitle', 'No hay clientes')}</div>
            ) : (
              filteredClients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  className={`client-selector-item ${client.id === activeClientId ? 'active' : ''}`}
                  onClick={() => {
                    setActiveClientId(client.id);
                    setIsOpen(false);
                    setSearchTerm('');
                    // Opcional: navegar al dashboard o mantener en la página actual
                  }}
                >
                  <Building2 size={16} className="client-selector-icon" />
                  <span className="client-selector-item-name">{client.fullName}</span>
                </button>
              ))
            )}
          </div>
          <div className="client-selector-footer">
            <button 
              type="button" 
              className="client-selector-action"
              onClick={() => {
                setIsOpen(false);
                navigate('/clients');
              }}
            >
              <Settings size={16} className="client-selector-icon" />
              <span>{t('clients.manageClients', 'Administrar Clientes')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
