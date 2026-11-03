import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'nmlb-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
export async function put(root, name, content) {
  const target = path.join(root, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
  return target;
}
