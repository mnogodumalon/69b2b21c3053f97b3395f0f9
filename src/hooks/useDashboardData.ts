import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Kategorien, Personen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [kategorien, setKategorien] = useState<Kategorien[]>([]);
  const [personen, setPersonen] = useState<Personen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [kategorienData, personenData] = await Promise.all([
        LivingAppsService.getKategorien(),
        LivingAppsService.getPersonen(),
      ]);
      setKategorien(kategorienData);
      setPersonen(personenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const kategorienMap = useMemo(() => {
    const m = new Map<string, Kategorien>();
    kategorien.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kategorien]);

  return { kategorien, setKategorien, personen, setPersonen, loading, error, fetchAll, kategorienMap };
}