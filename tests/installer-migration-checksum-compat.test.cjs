'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  computeInstallerMigrationChecksum,
  discoverInstallerMigrations,
  planInstallerMigrations,
} = require('../gsd-core/bin/lib/installer-migrations.cjs');
const { cleanup } = require('./helpers.cjs');

const FIXTURE = require('./fixtures/installer-migrations/published-checksums.json');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'gsd-core', 'bin', 'lib', 'installer-migrations');

function createConfigDir() {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-migration-checksum-compat-'));
  fs.writeFileSync(
    path.join(configDir, 'gsd-file-manifest.json'),
    JSON.stringify({ version: 'compat-fixture', timestamp: '2026-06-04T00:00:00.000Z', mode: 'full', files: {} }, null, 2),
    'utf8'
  );
  return configDir;
}

function writeAppliedState(configDir, migration, checksum, version) {
  fs.writeFileSync(
    path.join(configDir, 'gsd-install-state.json'),
    JSON.stringify({
      schemaVersion: 1,
      appliedMigrations: [
        {
          id: migration.id,
          checksum,
          appliedAt: '2026-06-04T00:00:00.000Z',
          packageVersion: version,
          journal: 'gsd-migration-journal/published-compat-fixture.json',
        },
      ],
    }, null, 2),
    'utf8'
  );
}

function planContextFor(migration) {
  return {
    runtime: Array.isArray(migration.runtimes) && migration.runtimes.length > 0 ? migration.runtimes[0] : 'claude',
    scope: Array.isArray(migration.scopes) && migration.scopes.length > 0 ? migration.scopes[0] : 'global',
  };
}

test('shipped installer migration checksums remain accepted for upgrade compatibility', () => {
  const migrations = discoverInstallerMigrations({ migrationsDir: MIGRATIONS_DIR });
  const byId = new Map(migrations.map((migration) => [migration.id, migration]));
  const fixtureIds = new Set(Object.keys(FIXTURE.migrations));

  for (const migration of migrations) {
    assert.ok(
      fixtureIds.has(migration.id),
      `current migration must be pinned in published-checksums.json: ${migration.id}`
    );
  }

  for (const [migrationId, fixture] of Object.entries(FIXTURE.migrations)) {
    const migration = byId.get(migrationId);
    assert.ok(migration, `published migration fixture no longer exists: ${migrationId}`);

    const currentChecksum = computeInstallerMigrationChecksum(migration);
    assert.ok(
      fixture.published.some((entry) => entry.checksum === currentChecksum),
      `${migrationId} current checksum ${currentChecksum} is not pinned in published-checksums.json`
    );

    for (const { version, checksum } of fixture.published) {
      const configDir = createConfigDir();
      try {
        writeAppliedState(configDir, migration, checksum, version);
        assert.doesNotThrow(
          () => planInstallerMigrations({
            configDir,
            migrations: [migration],
            ...planContextFor(migration),
          }),
          `${migrationId} must accept checksum ${checksum} from ${version}`
        );
      } finally {
        cleanup(configDir);
      }
    }
  }
});
