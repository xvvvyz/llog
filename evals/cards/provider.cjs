const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);
const ENV_FILE_NAMES = ['.dev.vars', '.dev.vars.production'];

const readTextVar = (value, pathValue) => {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof pathValue !== 'string' || !pathValue.trim()) return undefined;
  return fs.readFileSync(path.resolve(process.cwd(), pathValue), 'utf8');
};

const parseEnvFile = (filePath) =>
  Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=');
        if (index === -1) return [line, ''];
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );

const evalEnv = () => {
  const env = {};

  for (const fileName of ENV_FILE_NAMES) {
    const filePath = path.join(process.cwd(), fileName);
    if (fs.existsSync(filePath)) Object.assign(env, parseEnvFile(filePath));
  }

  return { ...env, ...process.env };
};

class LlogCardProvider {
  id() {
    return 'llog-card-generator';
  }

  async callApi(prompt, context) {
    const fixturePath = context.vars?.fixturePath;

    if (typeof fixturePath !== 'string' || !fixturePath.trim()) {
      return { error: 'fixturePath var is required' };
    }

    const scriptPath = path.join(
      process.cwd(),
      'evals/cards/run-card-generation.ts'
    );

    const resolvedPrompt =
      readTextVar(context.vars?.prompt, context.vars?.promptPath) ?? prompt;

    const input = Buffer.from(
      JSON.stringify({
        fixturePath,
        mode: context.vars?.mode,
        prompt: resolvedPrompt,
        tweakPrompt: readTextVar(
          context.vars?.tweakPrompt,
          context.vars?.tweakPromptPath
        ),
      }),
      'utf8'
    ).toString('base64');

    try {
      const { stdout, stderr } = await execFileAsync(
        'bun',
        [scriptPath, input],
        { cwd: process.cwd(), env: evalEnv(), maxBuffer: 1024 * 1024 * 10 }
      );

      const output = stdout.trim();
      const trimmedStderr = stderr.trim();

      return {
        output,
        ...(trimmedStderr && { metadata: { stderr: trimmedStderr } }),
      };
    } catch (error) {
      return {
        error:
          error.stderr?.trim() ||
          error.stdout?.trim() ||
          error.message ||
          'Card eval provider failed',
      };
    }
  }
}

module.exports = LlogCardProvider;
