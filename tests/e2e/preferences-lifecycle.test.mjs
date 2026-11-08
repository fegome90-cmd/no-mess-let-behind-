import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { startWdioSession } from 'wdio-obsidian-service';
import {
  install,
  packageBuild,
  planInstall,
  planRemove,
  remove,
} from '../../tools/lib/install.mjs';

const id = 'no-mess-left-behind';
const version = process.env.NMLB_OBSIDIAN_VERSION ?? '1.14.5';
const hash = (value) => createHash('sha256').update(value).digest('hex');

// In-place is allowed ONLY for this newly generated, disposable vault. It is never user supplied.
test(
  'B0: real saveData survives removal and reinstall from distributed assets',
  { timeout: 300_000 },
  async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'nmlb-preferences-'));
    const vault = path.join(root, 'synthetic-vault');
    const packageDir = path.join(root, 'package');
    const target = path.join(vault, '.obsidian/plugins', id);
    const checks = [];
    const options = { vault, packageDir, apply: true, appClosed: true };
    let browser;
    let actualVersion;
    const record = (name) => checks.push({ name, status: 'PASS' });
    const launch = async () => {
      const session = await startWdioSession({
        logLevel: 'error',
        connectionRetryCount: 0,
        connectionRetryTimeout: 120_000,
        cacheDir: path.resolve('.obsidian-cache'),
        capabilities: {
          browserName: 'obsidian',
          browserVersion: version,
          'wdio:obsidianOptions': {
            appVersion: version,
            installerVersion: version,
            vault,
            copy: false,
            plugins: [],
          },
        },
      });
      actualVersion = session.getObsidianVersion();
      assert.equal(actualVersion, version);
      return session;
    };
    const enableOnDisk = async () => {
      const file = path.join(vault, '.obsidian/community-plugins.json');
      const current = JSON.parse(await readFile(file, 'utf8'));
      await writeFile(file, JSON.stringify([...new Set([...current, id])]));
    };
    try {
      await mkdir(path.join(vault, '.obsidian'), { recursive: true });
      await writeFile(path.join(vault, '.obsidian/community-plugins.json'), '[]');
      await writeFile(path.join(vault, 'Keep.md'), '# SYNTHETIC_UNCHANGED\n');
      // The launcher may hardlink source assets into its cache; snapshot only the
      // three reviewed build assets so packaging still rejects hardlinked inputs.
      const build = path.join(root, 'build');
      await mkdir(build);
      for (const name of ['main.js', 'manifest.json', 'styles.css'])
        await writeFile(path.join(build, name), await readFile(name));
      await packageBuild(build, packageDir);
      await install({ ...options, expectedPlan: (await planInstall(options)).planId });
      assert.deepEqual((await readdir(packageDir)).sort(), [
        'SHA256SUMS',
        'main.js',
        'manifest.json',
        'styles.css',
      ]);
      await enableOnDisk();
      browser = await launch();
      const expected = {
        schemaVersion: 1,
        selectedProfileId: 'fixture-editorial',
        expandedSections: [],
        lastSelectedTab: 'overview',
      };
      const result = await browser.executeObsidian(
        async ({ app }, pluginId, data) => {
          const plugin = app.plugins.getPlugin(pluginId);
          if (!plugin) throw new Error('NMLB_E2E_PLUGIN_MISSING');
          await plugin.saveData(data);
          return await plugin.loadData();
        },
        id,
        expected,
      );
      assert.deepEqual(result, expected);
      const savedBytes = await readFile(path.join(target, 'data.json'));
      record('real Plugin.saveData writes only the plugin preference fixture');
      await browser.executeObsidianCommand(`${id}:show-boundaries`);
      assert((await browser.$('.nmlb-catalog-summary').getText()).includes('4 perfiles'));
      await browser.keys('Escape');
      record('metadata catalog available without repository or profiles directory');
      await browser.executeObsidian(async ({ app }, pluginId) => {
        await app.plugins.disablePluginAndSave(pluginId);
      }, id);
      // Obsidian persists plugin activation asynchronously; observe the on-disk
      // state instead of treating the API return as durable deactivation.
      await browser.waitUntil(
        async () => {
          const enabled = JSON.parse(
            await readFile(path.join(vault, '.obsidian/community-plugins.json'), 'utf8'),
          );
          return !enabled.includes(id);
        },
        { timeout: 10_000, timeoutMsg: 'NMLB_E2E_DISABLE_NOT_PERSISTED' },
      );
      await browser.deleteSession();
      browser = null;
      const noop = await planInstall(options);
      assert.equal(noop.action, 'NOOP');
      await install({ ...options, expectedPlan: noop.planId });
      const removal = await planRemove(options);
      assert.equal(
        (await remove({ ...options, expectedPlan: removal.planId })).status,
        'REMOVED_WITH_DATA_RETAINED',
      );
      assert.deepEqual(await readFile(path.join(target, 'data.json')), savedBytes);
      const reinstall = await planInstall(options);
      assert.equal(reinstall.action, 'REINSTALL');
      await install({ ...options, expectedPlan: reinstall.planId });
      assert.deepEqual(await readFile(path.join(target, 'data.json')), savedBytes);
      record('NOOP, conservative removal and same-package reinstall preserve exact bytes');
      await enableOnDisk();
      browser = await launch();
      const restored = await browser.executeObsidian(
        async ({ app }, pluginId) => await app.plugins.getPlugin(pluginId).loadData(),
        id,
      );
      assert.deepEqual(restored, expected);
      assert.equal(await readFile(path.join(vault, 'Keep.md'), 'utf8'), '# SYNTHETIC_UNCHANGED\n');
      record('second real application session restores preferences and untouched note');
    } finally {
      try {
        if (browser) await browser.deleteSession();
      } finally {
        await mkdir('artifacts/e2e', { recursive: true });
        await writeFile(
          `artifacts/e2e/receipt-preferences-${version}.json`,
          `${JSON.stringify(
            {
              schema: 'nmlb-preferences-e2e/1',
              sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
              sourceDirty:
                execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length >
                0,
              platform: process.platform,
              requestedVersion: version,
              actualVersion,
              bundleSha256: hash(await readFile('main.js')),
              checks,
              status: checks.length === 4 ? 'PASS' : 'FAIL',
            },
            null,
            2,
          )}\n`,
        );
        await rm(root, { recursive: true, force: true });
      }
    }
  },
);
