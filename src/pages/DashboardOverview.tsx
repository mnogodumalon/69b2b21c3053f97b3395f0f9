import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichPersonen } from '@/lib/enrich';
import type { EnrichedPersonen } from '@/types/enriched';
import type { Kategorien } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Plus, Pencil, Trash2, Search, User, Mail, Phone, MapPin, CheckCircle, XCircle, ShieldAlert, Tag, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { PersonenDialog } from '@/components/dialogs/PersonenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type StatusKey = 'aktiv' | 'inaktiv' | 'gesperrt' | 'alle';

export default function DashboardOverview() {
  const {
    kategorien, personen,
    kategorienMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedPersonen = enrichPersonen(personen, { kategorienMap });

  // All hooks before early returns
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('alle');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedPersonen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedPersonen | null>(null);
  const [selectedKategorieId, setSelectedKategorieId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enrichedPersonen.filter(p => {
      const matchesSearch = !q || [
        p.fields.vorname, p.fields.nachname, p.fields.email,
        p.fields.telefon, p.kategorieName, String(p.fields.mitarbeiter_nummer ?? '')
      ].some(v => v?.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'alle' || p.fields.status?.key === statusFilter;
      const matchesKategorie = !selectedKategorieId || (
        selectedKategorieId === '__none__'
          ? !p.fields.kategorie
          : p.kategorieName === kategorien.find(k => k.record_id === selectedKategorieId)?.fields.kategoriename
      );
      return matchesSearch && matchesStatus && matchesKategorie;
    });
  }, [enrichedPersonen, search, statusFilter, selectedKategorieId, kategorien]);

  const grouped = useMemo(() => {
    const groups: Record<string, EnrichedPersonen[]> = {};
    filtered.forEach(p => {
      const key = p.kategorieName || '__Ohne Kategorie__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === '__Ohne Kategorie__') return 1;
      if (b === '__Ohne Kategorie__') return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const stats = useMemo(() => ({
    total: personen.length,
    aktiv: personen.filter(p => p.fields.status?.key === 'aktiv').length,
    inaktiv: personen.filter(p => p.fields.status?.key === 'inaktiv').length,
    gesperrt: personen.filter(p => p.fields.status?.key === 'gesperrt').length,
  }), [personen]);

  const toggleCategory = useCallback((key: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleCreate = async (fields: Kategorien['fields'] | any) => {
    await LivingAppsService.createPersonenEntry(fields);
    fetchAll();
  };

  const handleEdit = async (fields: any) => {
    if (!editRecord) return;
    await LivingAppsService.updatePersonenEntry(editRecord.record_id, fields);
    fetchAll();
    setEditRecord(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deletePersonenEntry(deleteTarget.record_id);
    fetchAll();
    setDeleteTarget(null);
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Personen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{personen.length} Einträge · {kategorien.length} Kategorien</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 w-full sm:w-auto">
          <Plus size={16} className="mr-2 shrink-0" />
          Person hinzufügen
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(stats.total)}
          description="Alle Personen"
          icon={<Users size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aktiv"
          value={String(stats.aktiv)}
          description="Status: Aktiv"
          icon={<CheckCircle size={18} className="text-emerald-500" />}
        />
        <StatCard
          title="Inaktiv"
          value={String(stats.inaktiv)}
          description="Status: Inaktiv"
          icon={<XCircle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesperrt"
          value={String(stats.gesperrt)}
          description="Status: Gesperrt"
          icon={<ShieldAlert size={18} className="text-destructive" />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <Input
            placeholder="Name, E-Mail, Telefon suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['alle', 'aktiv', 'inaktiv', 'gesperrt'] as StatusKey[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {s === 'alle' ? 'Alle' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter pills */}
      {kategorien.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedKategorieId(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              !selectedKategorieId
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            Alle Kategorien
          </button>
          {kategorien.map(k => (
            <button
              key={k.record_id}
              onClick={() => setSelectedKategorieId(k.record_id === selectedKategorieId ? null : k.record_id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                selectedKategorieId === k.record_id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {k.fields.kategoriename ?? k.record_id}
            </button>
          ))}
          <button
            onClick={() => setSelectedKategorieId('__none__')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              selectedKategorieId === '__none__'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            Ohne Kategorie
          </button>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Users size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Keine Personen gefunden</p>
            <p className="text-sm text-muted-foreground mt-1">Passen Sie die Suche an oder fügen Sie eine neue Person hinzu.</p>
          </div>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus size={16} className="mr-2" /> Person hinzufügen
          </Button>
        </div>
      )}

      {/* Grouped person cards */}
      {grouped.map(([categoryName, people]) => {
        const displayName = categoryName === '__Ohne Kategorie__' ? 'Ohne Kategorie' : categoryName;
        const isCollapsed = collapsedCategories.has(categoryName);
        return (
          <section key={categoryName} className="space-y-3">
            <button
              onClick={() => toggleCategory(categoryName)}
              className="flex items-center gap-2 w-full text-left group"
            >
              {isCollapsed
                ? <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                : <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
              }
              <Tag size={14} className="shrink-0 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{displayName}</span>
              <Badge variant="secondary" className="ml-1 text-xs">{people.length}</Badge>
            </button>

            {!isCollapsed && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {people.map(person => (
                  <PersonCard
                    key={person.record_id}
                    person={person}
                    onEdit={() => setEditRecord(person)}
                    onDelete={() => setDeleteTarget(person)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Dialogs */}
      <PersonenDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (fields) => { await handleCreate(fields); }}
        kategorienList={kategorien}
        enablePhotoScan={AI_PHOTO_SCAN['Personen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Personen']}
      />

      {editRecord && (
        <PersonenDialog
          open={!!editRecord}
          onClose={() => setEditRecord(null)}
          onSubmit={handleEdit}
          defaultValues={editRecord.fields}
          kategorienList={kategorien}
          enablePhotoScan={AI_PHOTO_SCAN['Personen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Personen']}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Person löschen"
        description={`Soll "${deleteTarget?.fields.vorname ?? ''} ${deleteTarget?.fields.nachname ?? ''}".trim() wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function PersonCard({
  person,
  onEdit,
  onDelete,
}: {
  person: EnrichedPersonen;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusKey = person.fields.status?.key;
  const statusLabel = person.fields.status?.label;
  const fullName = [person.fields.vorname, person.fields.nachname].filter(Boolean).join(' ') || '—';

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    aktiv: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    inaktiv: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
    gesperrt: { bg: 'bg-destructive/10', text: 'text-destructive', dot: 'bg-destructive' },
  };
  const sc = statusConfig[statusKey ?? ''] ?? { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' };

  return (
    <div className="rounded-[20px] bg-card border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="p-4 space-y-3">
        {/* Avatar + name + status */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="relative shrink-0">
            {person.fields.profilbild ? (
              <img
                src={person.fields.profilbild}
                alt={fullName}
                className="w-12 h-12 rounded-full object-cover bg-muted"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={22} className="text-primary" />
              </div>
            )}
            {person.fields.ist_aktiv === true && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" title="Aktiv" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate">{fullName}</p>
            {person.fields.mitarbeiter_nummer != null && (
              <p className="text-xs text-muted-foreground">Nr. {person.fields.mitarbeiter_nummer}</p>
            )}
            {statusLabel && (
              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-1.5">
          {person.fields.email && (
            <div className="flex items-center gap-2 min-w-0">
              <Mail size={13} className="shrink-0 text-muted-foreground" />
              <a
                href={`mailto:${person.fields.email}`}
                onClick={e => e.stopPropagation()}
                className="text-xs text-muted-foreground truncate hover:text-primary transition-colors"
              >
                {person.fields.email}
              </a>
            </div>
          )}
          {person.fields.telefon && (
            <div className="flex items-center gap-2 min-w-0">
              <Phone size={13} className="shrink-0 text-muted-foreground" />
              <a
                href={`tel:${person.fields.telefon}`}
                onClick={e => e.stopPropagation()}
                className="text-xs text-muted-foreground truncate hover:text-primary transition-colors"
              >
                {person.fields.telefon}
              </a>
            </div>
          )}
          {person.fields.standort?.info && (
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={13} className="shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">{person.fields.standort.info}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onEdit}
        >
          <Pencil size={13} className="mr-1 shrink-0" />
          Bearbeiten
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 size={13} className="mr-1 shrink-0" />
          Löschen
        </Button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
