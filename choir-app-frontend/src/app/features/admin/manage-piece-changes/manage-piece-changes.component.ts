import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '@modules/material.module';
import { ApiService } from '@core/services/api.service';
import { PieceChange } from '@core/models/piece-change';
import { NotificationService } from '@core/services/notification.service';

/** Maps piece data field keys to German labels */
const FIELD_LABELS: Record<string, string> = {
    title: 'Titel',
    subtitle: 'Untertitel',
    voicing: 'Besetzung',
    categoryId: 'Rubrik',
    composerId: 'Komponist',
    origin: 'Ursprung',
    durationSec: 'Dauer (Sek.)',
    license: 'Lizenz',
    key: 'Tonart',
    timeSignature: 'Taktart',
    opus: 'Opus',
    composerCollection: 'Sammlung des Komponisten',
    authorId: 'Dichter',
    lyricsSource: 'Sonstige Quelle',
    lyrics: 'Text',
    links: 'Links',
};

/** Fields that map to a named association on the piece */
const FK_ASSOCIATION_MAP: Record<string, string> = {
    composerId: 'composer',
    categoryId: 'category',
    authorId: 'author',
};

/** Fields to skip entirely (internal or meaningless for display) */
const HIDDEN_FIELDS = new Set(['imageIdentifier', 'duration']);

export interface FieldChange {
    field: string;
    label: string;
    currentValue: string;
    proposedValue: string;
    type: 'scalar' | 'links';
    currentLinks?: LinkDisplay[];
    proposedLinks?: LinkDisplay[];
}

export interface LinkDisplay {
    description: string;
    url: string;
    type: string;
}

@Component({
    selector: 'app-manage-piece-changes',
    standalone: true,
    imports: [CommonModule, MaterialModule],
    templateUrl: './manage-piece-changes.component.html',
    styleUrls: ['./manage-piece-changes.component.scss']
})
export class ManagePieceChangesComponent implements OnInit {
    changes: PieceChange[] = [];
    loading = false;
    expandedId: number | null = null;
    /** Cache computed field changes per change id to avoid recalculation in template */
    private fieldChangeCache = new Map<number, FieldChange[]>();

    constructor(private api: ApiService, private notification: NotificationService) {}

    ngOnInit(): void {
        this.loadChanges();
    }

    loadChanges(): void {
        this.loading = true;
        this.fieldChangeCache.clear();
        this.api.getPieceChangeRequests().subscribe({
            next: data => {
                this.changes = data;
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    toggleExpand(change: PieceChange): void {
        this.expandedId = this.expandedId === change.id ? null : change.id;
    }

    getChangedFields(change: PieceChange): FieldChange[] {
        if (this.fieldChangeCache.has(change.id)) {
            return this.fieldChangeCache.get(change.id)!;
        }
        const result = this.computeChangedFields(change);
        this.fieldChangeCache.set(change.id, result);
        return result;
    }

    private computeChangedFields(change: PieceChange): FieldChange[] {
        if (!change.data) return [];
        const piece = change.piece as any;
        const fields: FieldChange[] = [];

        for (const key of Object.keys(change.data)) {
            if (HIDDEN_FIELDS.has(key)) continue;
            if (!FIELD_LABELS[key]) continue;

            const proposedRaw = change.data[key];

            // Handle links array specially
            if (key === 'links') {
                const currentLinks = this.toLinksDisplay(piece?.links);
                const proposedLinks = this.toLinksDisplay(proposedRaw);
                if (this.linksEqual(currentLinks, proposedLinks)) continue;
                fields.push({
                    field: key,
                    label: FIELD_LABELS[key],
                    currentValue: '',
                    proposedValue: '',
                    type: 'links',
                    currentLinks,
                    proposedLinks
                });
                continue;
            }

            // Resolve FK fields to human-readable names
            const assocKey = FK_ASSOCIATION_MAP[key];
            let currentDisplay: string;
            let proposedDisplay: string;

            if (assocKey && piece) {
                // Current: resolve from nested association (e.g., piece.composer.name)
                const currentAssoc = piece[assocKey];
                currentDisplay = currentAssoc?.name || '—';
                // Check if unchanged
                const currentId = currentAssoc?.id;
                if (this.valuesEqual(proposedRaw, currentId)) continue;
                // Proposed: use backend-resolved name if available
                const resolvedName = change.resolvedNames?.[key];
                if (proposedRaw === null || proposedRaw === undefined || proposedRaw === '') {
                    proposedDisplay = '—';
                } else if (resolvedName) {
                    proposedDisplay = resolvedName;
                } else {
                    proposedDisplay = `ID: ${proposedRaw}`;
                }
            } else {
                // Scalar field: compare directly
                const currentRaw = piece ? piece[key] : undefined;
                if (this.valuesEqual(currentRaw, proposedRaw)) continue;
                currentDisplay = this.formatScalar(currentRaw, key);
                proposedDisplay = this.formatScalar(proposedRaw, key);
            }

            fields.push({
                field: key,
                label: FIELD_LABELS[key],
                currentValue: currentDisplay,
                proposedValue: proposedDisplay,
                type: 'scalar'
            });
        }

        return fields;
    }

    private valuesEqual(a: any, b: any): boolean {
        // Normalize empty values
        const normA = (a === null || a === undefined || a === '') ? null : a;
        const normB = (b === null || b === undefined || b === '') ? null : b;
        // eslint-disable-next-line eqeqeq
        return normA == normB;
    }

    private formatScalar(value: any, key: string): string {
        if (value === null || value === undefined || value === '') return '—';
        if (key === 'durationSec' && typeof value === 'number') {
            const min = Math.floor(value / 60);
            const sec = value % 60;
            return `${min}:${sec.toString().padStart(2, '0')}`;
        }
        return String(value);
    }

    private toLinksDisplay(raw: any): LinkDisplay[] {
        if (!Array.isArray(raw)) return [];
        return raw.map((l: any) => ({
            description: l.description || '',
            url: l.url || '',
            type: l.type || 'EXTERNAL'
        }));
    }

    private linksEqual(a: LinkDisplay[], b: LinkDisplay[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((link, i) =>
            link.url === b[i].url &&
            link.description === b[i].description &&
            link.type === b[i].type
        );
    }

    getProposerName(change: PieceChange): string {
        const p = change.proposer;
        if (!p) return 'Unbekannt';
        if (p.name) return p.name;
        if (p.firstName) return p.firstName;
        return p.email || 'Unbekannt';
    }

    approve(change: PieceChange): void {
        this.api.approvePieceChange(change.id).subscribe({
            next: () => {
                this.notification.success('Änderung übernommen', 3000);
                this.loadChanges();
            },
            error: () => this.notification.error('Fehler beim Übernehmen', 3000)
        });
    }

    decline(change: PieceChange): void {
        this.api.deletePieceChange(change.id).subscribe({
            next: () => {
                this.notification.success('Änderung abgelehnt', 3000);
                this.loadChanges();
            },
            error: () => this.notification.error('Fehler beim Ablehnen', 3000)
        });
    }
}
