import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const SOURCE_EXTENSIONS = new Set([
  '.cjs',
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',
]);

type LineEdit = {
  end: number;
  replacement: string[];
  start: number;
};

type Options = {
  targets: string[];
};

const repoRoot = process.cwd();

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(
      [
        'Usage: bun scripts/format-whitespace.ts [path ...]',
        '',
        'Adds one blank line between adjacent statements when either statement',
        'wraps across multiple lines. Existing spacing between adjacent',
        'single-line statements is left alone.',
      ].join('\n')
    );

    process.exit(0);
  }

  return { targets: args };
}

function gitFiles(args: string[]) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
}

function normalizeRelativePath(filePath: string) {
  return filePath.split(path.sep).join('/');
}

function isInsideRepo(filePath: string) {
  const relative = path.relative(repoRoot, filePath);

  return (
    relative.length === 0 ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

function isSourceFile(filePath: string) {
  return SOURCE_EXTENSIONS.has(path.extname(filePath));
}

function collectTargetFiles(targets: string[]) {
  const args = ['ls-files', '--cached', '--others', '--exclude-standard'];

  if (targets.length === 0) {
    return gitFiles(args);
  }

  const pathspecs = targets.map((target) => {
    const absoluteTarget = path.resolve(repoRoot, target);

    if (!isInsideRepo(absoluteTarget)) {
      throw new Error(`Target is outside the repository: ${target}`);
    }

    return (
      normalizeRelativePath(path.relative(repoRoot, absoluteTarget)) || '.'
    );
  });

  return gitFiles([...args, '--', ...pathspecs]);
}

function scriptKind(filePath: string) {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;

  if (
    filePath.endsWith('.cjs') ||
    filePath.endsWith('.js') ||
    filePath.endsWith('.mjs')
  ) {
    return ts.ScriptKind.JS;
  }

  return ts.ScriptKind.TS;
}

function formatSource(filePath: string, text: string) {
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const hadFinalNewline = text.endsWith('\n');
  const lines = text.split(/\r?\n/);

  if (hadFinalNewline) {
    lines.pop();
  }

  const source = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(filePath)
  );

  const edits: LineEdit[] = [];

  const lineAt = (position: number) =>
    source.getLineAndCharacterOfPosition(position).line;

  const spansMultipleLines = (node: ts.Node) =>
    lineAt(node.getStart(source, false)) !== lineAt(node.getEnd());

  const isBlankLine = (line: string | undefined) => /^\s*$/.test(line ?? '');

  function firstLeadingLineAfterPrevious(
    previousEnd: number,
    nextStart: number
  ) {
    const previousEndLine = lineAt(previousEnd);

    for (let position = previousEnd; position < nextStart; position += 1) {
      if (!/\s/.test(text[position])) {
        const line = lineAt(position);

        if (line > previousEndLine) {
          return line;
        }
      }
    }

    return lineAt(nextStart);
  }

  function processStatements(statements: ts.NodeArray<ts.Statement>) {
    for (let index = 0; index < statements.length - 1; index += 1) {
      const previous = statements[index];
      const next = statements[index + 1];

      const needsSeparator =
        spansMultipleLines(previous) || spansMultipleLines(next);

      if (!needsSeparator) {
        continue;
      }

      const previousEndLine = lineAt(previous.getEnd());

      const nextStartLine = firstLeadingLineAfterPrevious(
        previous.getEnd(),
        next.getStart(source, false)
      );

      if (nextStartLine <= previousEndLine) {
        continue;
      }

      const start = previousEndLine + 1;
      const end = nextStartLine;
      const current = lines.slice(start, end);

      if (!current.some(isBlankLine)) {
        edits.push({ end: start, replacement: [''], start });
      }
    }
  }

  function visit(node: ts.Node) {
    if (ts.isSourceFile(node)) {
      processStatements(node.statements);
    } else if (ts.isBlock(node)) {
      processStatements(node.statements);
    } else if (ts.isModuleBlock(node)) {
      processStatements(node.statements);
    } else if (ts.isCaseClause(node) || ts.isDefaultClause(node)) {
      processStatements(node.statements);
    }

    ts.forEachChild(node, visit);
  }

  visit(source);

  if (edits.length === 0) {
    return text;
  }

  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    lines.splice(edit.start, edit.end - edit.start, ...edit.replacement);
  }

  return lines.join(newline) + (hadFinalNewline ? newline : '');
}

function formatFile(filePath: string) {
  if (!isSourceFile(filePath)) {
    return false;
  }

  const absolutePath = path.join(repoRoot, filePath);

  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return false;
  }

  const text = fs.readFileSync(absolutePath, 'utf8');
  const nextText = formatSource(filePath, text);

  if (nextText === text) {
    return false;
  }

  fs.writeFileSync(absolutePath, nextText);
  return true;
}

const options = parseOptions();

try {
  const files = [...new Set(collectTargetFiles(options.targets))]
    .filter(isSourceFile)
    .sort();

  const changedFiles = files.filter(formatFile);

  if (changedFiles.length === 0) {
    console.log('Whitespace is already formatted.');
    process.exit(0);
  }

  for (const filePath of changedFiles) {
    console.log(filePath);
  }

  console.log(`Formatted whitespace in ${changedFiles.length} file(s).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
