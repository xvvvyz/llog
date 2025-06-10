import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envFile = process.argv[2];

if (!envFile) {
  console.error('Please provide an environment file path');
  process.exit(1);
}

Object.assign(
  process.env,
  readFileSync(resolve(process.cwd(), envFile), 'utf-8')
    .split('\n')
    .reduce<Record<string, string>>((acc, line) => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) acc[key.trim()] = value.trim();
      }

      return acc;
    }, {})
);

const command = process.argv.slice(3).join(' ');

if (command) {
  spawn(command, { shell: true, stdio: 'inherit' });
}
