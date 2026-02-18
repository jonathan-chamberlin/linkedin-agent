#!/usr/bin/env node
import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'node_modules/'));
const tsx = require.resolve('tsx/cli');

const child = fork(tsx, ['src/index.ts', 'post', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
});
child.on('exit', code => process.exit(code ?? 1));
