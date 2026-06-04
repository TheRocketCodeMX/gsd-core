/**
 * Installer migration: remove manifest-managed legacy orphan hook files
 * (ADR-457 build-at-publish: the hand-written
 * bin/lib/installer-migrations/001-legacy-orphan-files.cjs collapsed to a
 * TypeScript source of truth). Behaviour is preserved byte-for-behaviour from
 * the prior hand-written .cjs; only types are added.
 */

type ArtifactClassification = string;

interface ClassifiedArtifact {
  classification: ArtifactClassification;
  [key: string]: unknown;
}

type ActionType = 'remove-managed' | 'backup-and-remove';

interface MigrationAction {
  type: ActionType;
  relPath: string;
  reason: string;
  ownershipEvidence: string;
}

interface MigrationPlanContext {
  classifyArtifact(relPath: string): ClassifiedArtifact;
}

interface InstallerMigration {
  id: string;
  title: string;
  description: string;
  introducedIn: string;
  checksum: string;
  legacyChecksums?: string[];
  scopes: string[];
  destructive: boolean;
  plan: (ctx: MigrationPlanContext) => MigrationAction[];
}

const LEGACY_ORPHAN_FILES: ReadonlyArray<string> = [
  'hooks/gsd-notify.sh',
  'hooks/statusline.js',
];

const migration: InstallerMigration = {
  id: '2026-05-11-legacy-orphan-files',
  title: 'Remove manifest-managed legacy orphan hook files',
  description: 'Remove legacy orphan hook files that are still manifest-managed.',
  introducedIn: '1.50.0',
  checksum: 'sha256:e492698748a2436a12a55f0940f539b9bf651d8ffcac6f60cd856a6dabd6788c',
  legacyChecksums: [
    'sha256:4488e38c127a5225b31016918bcbc85ba3fd3139291ad407b94e76c03c0b89d3',
  ],
  scopes: ['global', 'local'],
  destructive: true,
  // Retired generated hook files are removed only with manifest-managed
  // evidence. This follows docs/installer-migrations.md#ownership and avoids
  // relying on whether a runtime currently registers host hook config in the
  // runtime contract registry.
  plan: (ctx: MigrationPlanContext): MigrationAction[] => {
    const actions: MigrationAction[] = [];
    for (const relPath of LEGACY_ORPHAN_FILES) {
      const artifact = ctx.classifyArtifact(relPath);
      if (artifact.classification === 'managed-pristine') {
        actions.push({
          type: 'remove-managed',
          relPath,
          reason: 'legacy orphan hook file retired by installer migration',
          ownershipEvidence: 'legacy hook path is manifest-managed in gsd-file-manifest.json',
        });
      } else if (artifact.classification === 'managed-modified') {
        actions.push({
          type: 'backup-and-remove',
          relPath,
          reason: 'legacy orphan hook file retired by installer migration',
          ownershipEvidence: 'legacy hook path is manifest-managed in gsd-file-manifest.json',
        });
      }
    }
    return actions;
  },
};

export = migration;
