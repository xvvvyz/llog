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

const PRINT_WIDTH = 80;

const PROP_PRIORITY = new Map([
  ['key', 0],
  ['ref', 1],
]);

const CLASS_GROUPS = [
  /^container$/,
  /^(static|fixed|absolute|relative|sticky)$/,
  /^(inset|top|right|bottom|left|z)-/,
  /^(order|col|row|grid|flex|block|inline|hidden|table|flow|contents|list)-?/,
  /^(float|clear|isolate|isolation|object|overflow|overscroll|visible|invisible|collapse|box)-/,
  /^(m|mx|my|mt|mr|mb|ml|space)-/,
  /^(w|min-w|max-w|h|min-h|max-h|size|aspect)-/,
  /^(p|px|py|pt|pr|pb|pl)-/,
  /^(border|rounded|divide|outline|ring)-/,
  /^(bg|from|via|to)-/,
  /^(fill|stroke)-/,
  /^(text|font|leading|tracking|line-clamp|list|placeholder|decoration|underline|uppercase|lowercase|capitalize|normal-case|truncate|whitespace|break)-/,
  /^(shadow|opacity|mix-blend|bg-blend)-/,
  /^(blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia|filter|backdrop)-/,
  /^(transition|duration|ease|delay|animate|transform|scale|rotate|translate|skew|origin)-/,
  /^(cursor|select|resize|touch|pointer-events|appearance|accent|caret|scroll|snap)-/,
];

type LineEdit = { end: number; replacement: string[]; start: number };
type TextEdit = { end: number; replacement: string; start: number };
type Options = { targets: string[] };

type ParsedSource = {
  lineAt: (position: number) => number;
  source: ts.SourceFile;
};

const repoRoot = process.cwd();

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(
      [
        'Usage: bun scripts/format.ts [path ...]',
        '',
        'Runs Prettier, moves multiline imports to the end of import lists,',
        'adds blank lines around multiline statements, compacts short if blocks,',
        'sorts JSX props, and sorts literal JSX className/class strings.',
      ].join('\n')
    );

    process.exit(0);
  }

  return { targets: args };
}

function gitFiles(args: string[]) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
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
  if (targets.length === 0) return gitFiles(args);

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

function collectPrettierTargets(targets: string[]) {
  if (targets.length === 0) return ['.'];

  return targets.map((target) => {
    const absoluteTarget = path.resolve(repoRoot, target);

    if (!isInsideRepo(absoluteTarget)) {
      throw new Error(`Target is outside the repository: ${target}`);
    }

    return (
      normalizeRelativePath(path.relative(repoRoot, absoluteTarget)) || '.'
    );
  });
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

function parseSource(filePath: string, text: string): ParsedSource {
  const source = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(filePath)
  );

  return {
    lineAt: (position: number) =>
      source.getLineAndCharacterOfPosition(position).line,
    source,
  };
}

function runPrettier(filePaths: string[]) {
  if (filePaths.length === 0) return;
  const prettierBin = path.join(repoRoot, 'node_modules', '.bin', 'prettier');

  if (!fs.existsSync(prettierBin)) {
    throw new Error('Could not find local Prettier binary.');
  }

  execFileSync(prettierBin, ['--write', ...filePaths], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

function sortClassName(className: string) {
  const classes = className.trim().split(/\s+/).filter(Boolean);
  if (classes.length < 2) return className;

  return classes
    .sort((left, right) => {
      const leftParts = splitClassName(left);
      const rightParts = splitClassName(right);

      return (
        leftParts.variant.localeCompare(rightParts.variant) ||
        leftParts.group - rightParts.group ||
        leftParts.base.localeCompare(rightParts.base) ||
        left.localeCompare(right)
      );
    })
    .join(' ');
}

function splitClassName(className: string) {
  const important = className.startsWith('!');
  const normalized = important ? className.slice(1) : className;
  const parts = normalized.split(':');
  const base = parts.pop() ?? normalized;
  const variant = parts.join(':');
  return { base, group: classGroup(base), variant };
}

function classGroup(className: string) {
  const negativeNormalized = className.startsWith('-')
    ? className.slice(1)
    : className;

  for (let index = 0; index < CLASS_GROUPS.length; index += 1) {
    if (CLASS_GROUPS[index].test(negativeNormalized)) return index;
  }

  return CLASS_GROUPS.length;
}

function propName(attribute: ts.JsxAttribute) {
  return attribute.name.getText();
}

function propSortKey(source: ParsedSource, attribute: ts.JsxAttribute) {
  const name = propName(attribute);

  const isMultiline =
    source.lineAt(attribute.getStart(source.source)) !==
    source.lineAt(attribute.getEnd());

  return { isMultiline, name, priority: PROP_PRIORITY.get(name) ?? 100 };
}

function compareProps(
  source: ParsedSource,
  left: ts.JsxAttribute,
  right: ts.JsxAttribute
) {
  const leftKey = propSortKey(source, left);
  const rightKey = propSortKey(source, right);

  return (
    leftKey.priority - rightKey.priority ||
    Number(leftKey.isMultiline) - Number(rightKey.isMultiline) ||
    leftKey.name.localeCompare(rightKey.name)
  );
}

function sortClassNameInAttribute(source: ts.SourceFile, attribute: ts.Node) {
  if (!ts.isJsxAttribute(attribute)) return attribute.getText(source);
  const name = propName(attribute);

  if (name !== 'className' && name !== 'class') {
    return attribute.getText(source);
  }

  const initializer = attribute.initializer;

  if (!initializer || !ts.isStringLiteral(initializer)) {
    return attribute.getText(source);
  }

  const currentClassName = initializer.text;
  const nextClassName = sortClassName(currentClassName);
  if (nextClassName === currentClassName) return attribute.getText(source);
  return `${name}=${JSON.stringify(nextClassName)}`;
}

function sortedAttributeText(
  parsed: ParsedSource,
  attributes: ts.JsxAttributeLike[]
) {
  return attributes
    .slice()
    .sort((left, right) => {
      if (!ts.isJsxAttribute(left) || !ts.isJsxAttribute(right)) return 0;
      return compareProps(parsed, left, right);
    })
    .map((attribute) => sortClassNameInAttribute(parsed.source, attribute));
}

function formatJsx(filePath: string, text: string) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return text;
  const parsed = parseSource(filePath, text);
  const { source } = parsed;
  const edits: TextEdit[] = [];

  function processAttributes(attributes: ts.NodeArray<ts.JsxAttributeLike>) {
    let segmentStart = 0;

    for (let index = 0; index <= attributes.length; index += 1) {
      const attribute = attributes[index];

      const atBoundary =
        index === attributes.length || ts.isJsxSpreadAttribute(attribute);

      if (!atBoundary) continue;
      const segment = attributes.slice(segmentStart, index);

      if (segment.length > 1) {
        const separators = segment
          .slice(0, -1)
          .map((item, itemIndex) =>
            text.slice(item.getEnd(), segment[itemIndex + 1].getStart(source))
          );

        const current = segment
          .map((item) => item.getText(source))
          .reduce((output, item, itemIndex) => {
            const separator = separators[itemIndex - 1] ?? '';
            return itemIndex === 0 ? item : `${output}${separator}${item}`;
          }, '');

        const next = sortedAttributeText(parsed, segment).reduce(
          (output, item, itemIndex) => {
            const separator = separators[itemIndex - 1] ?? '';
            return itemIndex === 0 ? item : `${output}${separator}${item}`;
          },
          ''
        );

        if (next !== current) {
          edits.push({
            end: segment[segment.length - 1].getEnd(),
            replacement: next,
            start: segment[0].getStart(source),
          });
        }
      } else if (segment.length === 1) {
        const attributeText = sortClassNameInAttribute(source, segment[0]);

        if (attributeText !== segment[0].getText(source)) {
          edits.push({
            end: segment[0].getEnd(),
            replacement: attributeText,
            start: segment[0].getStart(source),
          });
        }
      }

      segmentStart = index + 1;
    }
  }

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      processAttributes(node.attributes.properties);
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return applyTextEdits(text, edits);
}

function formatIfStatements(filePath: string, text: string) {
  const { source } = parseSource(filePath, text);
  const edits: TextEdit[] = [];

  function visit(node: ts.Node) {
    if (ts.isIfStatement(node)) {
      const replacement = compactIfStatement(source, text, node);

      if (replacement) {
        edits.push({
          end: node.getEnd(),
          replacement,
          start: node.getStart(source),
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return applyTextEdits(text, edits);
}

function compactIfStatement(
  source: ts.SourceFile,
  text: string,
  node: ts.IfStatement
) {
  if (node.elseStatement || !ts.isBlock(node.thenStatement)) return null;
  const block = node.thenStatement;
  if (hasComment(block.getFullText(source))) return null;
  const expression = node.expression.getText(source);
  if (expression.includes('\n')) return null;

  const body =
    block.statements.length === 1 && canRemoveIfBlock(block.statements[0])
      ? block.statements[0].getText(source)
      : null;

  if (body === null || body.includes('\n') || hasComment(body)) return null;
  const replacement = `if (${expression}) ${body}`;
  const lineStart = text.lastIndexOf('\n', node.getStart(source) - 1) + 1;
  const indentWidth = node.getStart(source) - lineStart;
  if (indentWidth + replacement.length > PRINT_WIDTH) return null;
  return replacement;
}

function canRemoveIfBlock(statement: ts.Statement) {
  return (
    !ts.isVariableStatement(statement) &&
    !ts.isFunctionDeclaration(statement) &&
    !ts.isClassDeclaration(statement)
  );
}

function hasComment(text: string) {
  return /\/[/*]/.test(text);
}

function formatImports(filePath: string, text: string) {
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const hadFinalNewline = text.endsWith('\n');
  const lines = text.split(/\r?\n/);
  if (hadFinalNewline) lines.pop();
  const { lineAt, source } = parseSource(filePath, text);
  let statementIndex = 0;

  while (
    statementIndex < source.statements.length &&
    ts.isExpressionStatement(source.statements[statementIndex]) &&
    ts.isStringLiteralLike(source.statements[statementIndex].expression)
  ) {
    statementIndex += 1;
  }

  const imports: ts.ImportDeclaration[] = [];

  while (
    statementIndex < source.statements.length &&
    ts.isImportDeclaration(source.statements[statementIndex])
  ) {
    imports.push(source.statements[statementIndex]);
    statementIndex += 1;
  }

  if (imports.length < 2) return text;

  const importBlocks = imports.map((node) => {
    const startLine = lineAt(node.getStart(source, false));
    const endLine = lineAt(node.getEnd());
    const block = lines.slice(startLine, endLine + 1);
    return { block, endLine, isMultiline: startLine !== endLine, startLine };
  });

  for (let index = 0; index < importBlocks.length - 1; index += 1) {
    const previous = importBlocks[index];
    const next = importBlocks[index + 1];
    const between = lines.slice(previous.endLine + 1, next.startLine);
    if (between.some((line) => line.trim() !== '')) return text;
  }

  const singleLineBlocks = importBlocks
    .filter((block) => !block.isMultiline)
    .map((block) => block.block);

  const multilineBlocks = importBlocks
    .filter((block) => block.isMultiline)
    .map((block) => block.block);

  if (singleLineBlocks.length === 0 || multilineBlocks.length === 0) {
    return text;
  }

  const nextImportLines = [
    ...singleLineBlocks.flat(),
    '',
    ...multilineBlocks.flat(),
  ];

  const start = lineAt(imports[0].getStart(source, false));
  const end = lineAt(imports[imports.length - 1].getEnd()) + 1;
  const currentImportLines = lines.slice(start, end);
  if (currentImportLines.join('\n') === nextImportLines.join('\n')) return text;
  lines.splice(start, end - start, ...nextImportLines);
  return lines.join(newline) + (hadFinalNewline ? newline : '');
}

function formatStatementWhitespace(filePath: string, text: string) {
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const hadFinalNewline = text.endsWith('\n');
  const lines = text.split(/\r?\n/);
  if (hadFinalNewline) lines.pop();
  const { lineAt, source } = parseSource(filePath, text);
  const edits: LineEdit[] = [];

  const spansMultipleLines = (node: ts.Node) =>
    lineAt(node.getStart(source, false)) !== lineAt(node.getEnd());

  const isBlankLine = (line: string | undefined) => /^\s*$/.test(line ?? '');

  const isExportStatement = (node: ts.Statement) =>
    ts.isExportDeclaration(node) ||
    ts.isExportAssignment(node) ||
    ts
      .getModifiers(node)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

  function firstLeadingLineAfterPrevious(
    previousEnd: number,
    nextStart: number
  ) {
    const previousEndLine = lineAt(previousEnd);

    for (let position = previousEnd; position < nextStart; position += 1) {
      if (!/\s/.test(text[position])) {
        const line = lineAt(position);
        if (line > previousEndLine) return line;
      }
    }

    return lineAt(nextStart);
  }

  function processStatements(statements: ts.NodeArray<ts.Statement>) {
    for (let index = 0; index < statements.length - 1; index += 1) {
      const previous = statements[index];
      const next = statements[index + 1];

      const needsSeparator =
        spansMultipleLines(previous) ||
        spansMultipleLines(next) ||
        (ts.isImportDeclaration(previous) && !ts.isImportDeclaration(next)) ||
        (isExportStatement(next) && !isExportStatement(previous));

      const previousEndLine = lineAt(previous.getEnd());

      const nextStartLine = firstLeadingLineAfterPrevious(
        previous.getEnd(),
        next.getStart(source, false)
      );

      if (nextStartLine <= previousEndLine) continue;
      const start = previousEndLine + 1;
      const end = nextStartLine;
      const current = lines.slice(start, end);

      if (needsSeparator) {
        if (!current.some(isBlankLine)) {
          edits.push({ end: start, replacement: [''], start });
        }

        continue;
      }

      if (current.some(isBlankLine)) {
        edits.push({
          end,
          replacement: current.filter((line) => !isBlankLine(line)),
          start,
        });
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
  if (edits.length === 0) return text;

  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    lines.splice(edit.start, edit.end - edit.start, ...edit.replacement);
  }

  return lines.join(newline) + (hadFinalNewline ? newline : '');
}

function applyTextEdits(text: string, edits: TextEdit[]) {
  if (edits.length === 0) return text;
  let nextText = text;

  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    nextText =
      nextText.slice(0, edit.start) +
      edit.replacement +
      nextText.slice(edit.end);
  }

  return nextText;
}

function formatSource(filePath: string, text: string) {
  return formatStatementWhitespace(
    filePath,
    formatImports(
      filePath,
      formatIfStatements(filePath, formatJsx(filePath, text))
    )
  );
}

function formatFile(filePath: string) {
  if (!isSourceFile(filePath)) return false;
  const absolutePath = path.join(repoRoot, filePath);

  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return false;
  }

  const text = fs.readFileSync(absolutePath, 'utf8');
  const nextText = formatSource(filePath, text);
  if (nextText === text) return false;
  fs.writeFileSync(absolutePath, nextText);
  return true;
}

const options = parseOptions();

try {
  runPrettier(collectPrettierTargets(options.targets));

  const files = [...new Set(collectTargetFiles(options.targets))]
    .filter(isSourceFile)
    .sort();

  const changedFiles = files.filter(formatFile);

  if (changedFiles.length === 0) {
    console.log('Custom formatting is already applied.');
    process.exit(0);
  }

  for (const filePath of changedFiles) {
    console.log(filePath);
  }

  console.log(`Custom formatted ${changedFiles.length} file(s).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
