import { Eye, EyeOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { fetchUnmaskedDocumentNumber } from '../api/parties';

interface MaskedDocumentProps {
  partyId: number;
  initialMasked?: string | null;
  className?: string;
  fallback?: string;
}

export function MaskedDocument({ partyId, initialMasked, className = '', fallback = '—' }: MaskedDocumentProps) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (revealed) {
      timeout = setTimeout(() => {
        setRevealed(null);
      }, 60000); // 1 minute
    }
    return () => clearTimeout(timeout);
  }, [revealed]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (revealed) {
      setRevealed(null);
      return;
    }
    setLoading(true);
    try {
      const { documentNumber } = await fetchUnmaskedDocumentNumber(partyId);
      setRevealed(documentNumber || null);
    } catch (err) {
      console.error('Error fetching unmasked document number', err);
    } finally {
      setLoading(false);
    }
  };

  const displayText = revealed ?? initialMasked ?? fallback;
  const isMasked = !revealed && initialMasked && initialMasked.includes('*');

  if (!initialMasked) {
    return <span className={className}>{fallback}</span>;
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }} className={className}>
      <span>{displayText}</span>
      {isMasked && (
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className="btn small ghost icon-only"
          title="Revelar identificación"
          style={{ padding: '0.2rem' }}
        >
          {loading ? (
            <span className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%' }} />
          ) : (
            <Eye size={16} />
          )}
        </button>
      )}
      {revealed && (
        <button
          type="button"
          onClick={handleToggle}
          className="btn small ghost icon-only"
          title="Ocultar identificación"
          style={{ padding: '0.2rem' }}
        >
          <EyeOff size={16} />
        </button>
      )}
    </span>
  );
}
