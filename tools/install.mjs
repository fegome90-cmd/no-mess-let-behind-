import path from 'node:path';
import { parseArgs } from 'node:util';
import { errorCode } from './lib/files.mjs';
import { install, remove } from './lib/install.mjs';

try {
  const { values } = parseArgs({
    options: {
      vault: { type: 'string' },
      package: { type: 'string' },
      'config-dir': { type: 'string' },
      apply: { type: 'boolean', default: false },
      remove: { type: 'boolean', default: false },
      expect: { type: 'string' },
      'app-closed': { type: 'boolean', default: false },
    },
  });
  if (!values.vault || (!values.remove && !values.package) || (values.remove && values.package))
    throw new Error('arguments');
  const options = {
    vault: path.resolve(values.vault),
    packageDir: values.package ? path.resolve(values.package) : undefined,
    configDir: values['config-dir'],
    apply: values.apply,
    expectedPlan: values.expect,
    appClosed: values['app-closed'],
  };
  console.log(JSON.stringify(await (values.remove ? remove(options) : install(options)), null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: 'ERROR', code: errorCode(error) }));
  process.exitCode = 2;
}
