import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { startWdioSession } from 'wdio-obsidian-service';

const id = 'no-mess-left-behind';
const root = process.cwd();
const version = process.env.NMLB_OBSIDIAN_VERSION ?? '1.14.5';
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const fixtureFiles = {
  'AGENTS.md': '# Synthetic authority\nPreserve this fixture.\n',
  'notes/Keep.md': '# Keep\nSYNTHETIC_NOTE_DO_NOT_DISPLAY\n',
  '.vale.ini': 'StylesPath = .vale/styles\n',
  '.rulesync/hooks.json': '{"hooks":{}}\n',
  '.rulesync/hooks.jsonc': '{"hooks":{}}\n',
  '.claude/settings.json': '{"fixture":"SYNTHETIC_PRIVATE_SETTING"}\n',
};

// Only a generated fixture is accepted. The launcher copies it and isolates
// the user profile; never point this harness at a user's real vault.
test('compiled plugin in real, isolated Obsidian', { timeout: 300_000 }, async (t) => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'nmlb-e2e-source-'));
  const checks = [];
  const record = async (name, fn) => {
    await t.test(name, async () => {
      try {
        await fn();
        checks.push({ name, status: 'PASS' });
      } catch (error) {
        checks.push({ name, status: 'FAIL', error: String(error.message) });
        throw error;
      }
    });
  };
  for (const [name, content] of Object.entries(fixtureFiles)) {
    await mkdir(path.dirname(path.join(fixture, name)), { recursive: true });
    await writeFile(path.join(fixture, name), content);
  }
  let browser;
  let actualVersion;
  let installerVersion;
  try {
    browser = await startWdioSession({
      logLevel: 'error',
      connectionRetryCount: 0,
      connectionRetryTimeout: 120_000,
      cacheDir: path.resolve('.obsidian-cache'),
      capabilities: {
        browserName: 'obsidian',
        browserVersion: version,
        'wdio:obsidianOptions': {
          appVersion: version,
          installerVersion: process.env.NMLB_INSTALLER_VERSION ?? version,
          plugins: [root],
          vault: fixture,
          copy: true,
        },
      },
    });
    actualVersion = browser.getObsidianVersion();
    installerVersion = browser.getObsidianInstallerVersion();
    await record('real host loads compiled bundle and registers commands', async () => {
      assert.equal(actualVersion, version);
      const info = await browser.executeObsidian(
        ({ app }, pluginId) => ({
          loaded: Boolean(app.plugins.getPlugin(pluginId)),
          commands: Object.keys(app.commands.commands).filter((key) =>
            key.startsWith(`${pluginId}:`),
          ),
        }),
        id,
      );
      assert.equal(info.loaded, true);
      assert(info.commands.includes(`${id}:inspect-vault`));
      assert(info.commands.includes(`${id}:show-boundaries`));
    });
    await record('user command opens inventory with honest evidence states', async () => {
      await browser.executeObsidianCommand(`${id}:inspect-vault`);
      const report = await browser.$('.nmlb-report');
      await report.waitForDisplayed({ timeout: 10_000 });
      const text = await report.getText();
      assert(text.includes('PRESENT'));
      assert(text.includes('ABSENT'));
      assert(text.includes('NOT_RUN'));
      assert(text.includes('NMLB_SOURCE_AMBIGUOUS'));
      assert(!text.includes('SYNTHETIC_NOTE_DO_NOT_DISPLAY'));
      assert(!text.includes('SYNTHETIC_PRIVATE_SETTING'));
      await mkdir('artifacts/e2e', { recursive: true });
      await browser.saveScreenshot(`artifacts/e2e/inventory-${version}.png`);
    });
    await record('disable removes the open report and commands', async () => {
      await browser.executeObsidian(async ({ app }, pluginId) => {
        await app.plugins.disablePlugin(pluginId);
      }, id);
      const result = await browser.executeObsidian(
        ({ app }, pluginId) => ({
          reportCount: document.querySelectorAll('.nmlb-report').length,
          commandCount: Object.keys(app.commands.commands).filter((key) =>
            key.startsWith(`${pluginId}:`),
          ).length,
        }),
        id,
      );
      assert.equal(result.reportCount, 0);
      assert.equal(result.commandCount, 0);
    });
    await record('reenable works without duplicate commands or UI', async () => {
      await browser.executeObsidian(async ({ app }, pluginId) => {
        await app.plugins.enablePlugin(pluginId);
      }, id);
      await browser.executeObsidianCommand(`${id}:show-boundaries`);
      const report = await browser.$('.nmlb-report');
      await report.waitForDisplayed({ timeout: 10_000 });
      assert((await report.getText()).includes('No instala'));
      assert.equal(
        await browser.execute(() => document.querySelectorAll('.nmlb-report').length),
        1,
      );
      await browser.keys('Escape');
    });
    await record('notes and unrelated configuration stay byte-identical', async () => {
      const values = await browser.executeObsidian(async ({ app }, names) => {
        const data = {};
        for (const name of names) data[name] = await app.vault.adapter.read(name);
        return data;
      }, Object.keys(fixtureFiles));
      assert.deepEqual(values, fixtureFiles);
    });
    await record('host restart reloads the same compiled plugin', async () => {
      await browser.reloadObsidian();
      await browser.executeObsidianCommand(`${id}:inspect-vault`);
      const report = await browser.$('.nmlb-report');
      await report.waitForDisplayed({ timeout: 10_000 });
      assert((await report.getText()).includes('NOT_RUN'));
      await browser.keys('Escape');
    });
  } finally {
    if (browser) await browser.deleteSession();
    await rm(fixture, { recursive: true, force: true });
    await mkdir('artifacts/e2e', { recursive: true });
    await writeFile(
      `artifacts/e2e/receipt-${version}.json`,
      `${JSON.stringify(
        {
          schema: 'nmlb-e2e/1',
          sourceSha: sha,
          sourceDirty:
            execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0,
          platform: process.platform,
          node: process.version,
          requestedVersion: version,
          actualVersion,
          installerVersion,
          bundleSha256: createHash('sha256')
            .update(await readFile('main.js'))
            .digest('hex'),
          checks,
          status: checks.length === 6 && checks.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL',
        },
        null,
        2,
      )}\n`,
    );
  }
});
