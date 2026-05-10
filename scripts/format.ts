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
const FORMAT_IGNORED_DIRECTORIES = new Set(['public']);

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

type NamespaceImportConversion = {
  alias: string;
  exportedNames: Map<string, string>;
  importDeclaration: ts.ImportDeclaration;
  isTypeOnly: boolean;
};

type ParsedSource = {
  lineAt: (position: number) => number;
  source: ts.SourceFile;
};

const repoRoot = process.cwd();

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log('Usage: bun scripts/format.ts [path ...]');
    process.exit(0);
  }

  return { targets: args };
}

function gitFiles(args: string[]) {
  return execFileSync('git', ['-c', `safe.directory=${repoRoot}`, ...args], {
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

function isFormatIgnoredPath(filePath: string) {
  const [directory] = normalizeRelativePath(filePath).split('/');
  return FORMAT_IGNORED_DIRECTORIES.has(directory);
}

function collectTargetFiles(targets: string[]) {
  const args = ['ls-files', '--cached', '--others', '--exclude-standard'];

  if (targets.length === 0) {
    return gitFiles(args).filter((filePath) => !isFormatIgnoredPath(filePath));
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

  return gitFiles([...args, '--', ...pathspecs]).filter(
    (filePath) => !isFormatIgnoredPath(filePath)
  );
}

function collectOxfmtTargets(targets: string[]) {
  if (targets.length === 0) return ['.'];

  return targets
    .map((target) => {
      const absoluteTarget = path.resolve(repoRoot, target);

      if (!isInsideRepo(absoluteTarget)) {
        throw new Error(`Target is outside the repository: ${target}`);
      }

      return (
        normalizeRelativePath(path.relative(repoRoot, absoluteTarget)) || '.'
      );
    })
    .filter((filePath) => !isFormatIgnoredPath(filePath));
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

function runOxfmt(filePaths: string[]) {
  if (filePaths.length === 0) return;
  const oxfmtBin = path.join(repoRoot, 'node_modules', '.bin', 'oxfmt');

  if (!fs.existsSync(oxfmtBin)) {
    throw new Error('Could not find local Oxfmt binary.');
  }

  execFileSync(oxfmtBin, ['--write', ...filePaths], {
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
  return wrapMultilineIfStatements(filePath, applyTextEdits(text, edits));
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

function wrapMultilineIfStatements(filePath: string, text: string) {
  let nextText = text;

  while (true) {
    const formattedText = wrapMultilineIfStatementsOnce(filePath, nextText);
    if (formattedText === nextText) return nextText;
    nextText = formattedText;
  }
}

function wrapMultilineIfStatementsOnce(filePath: string, text: string) {
  const { lineAt, source } = parseSource(filePath, text);
  const edits: TextEdit[] = [];

  function visit(node: ts.Node) {
    if (!ts.isIfStatement(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const wrappedThenStatement = maybeWrapStatement(
      source,
      text,
      node,
      node.thenStatement
    );

    if (wrappedThenStatement) {
      edits.push(wrappedThenStatement);
    } else {
      visit(node.thenStatement);
    }

    if (!node.elseStatement) return;

    const wrappedElseStatement = ts.isIfStatement(node.elseStatement)
      ? null
      : maybeWrapStatement(source, text, node, node.elseStatement);

    if (wrappedElseStatement) {
      edits.push(wrappedElseStatement);
    } else {
      visit(node.elseStatement);
    }
  }

  function maybeWrapStatement(
    source: ts.SourceFile,
    text: string,
    owner: ts.IfStatement,
    statement: ts.Statement
  ) {
    if (ts.isBlock(statement)) return null;
    const statementStartLine = lineAt(statement.getStart(source));
    const statementFullStartLine = lineAt(statement.getFullStart());
    if (statementStartLine <= statementFullStartLine) return null;
    const start = statement.getFullStart();
    const end = statementEndWithTrailingComment(text, statement.getEnd());
    const indent = indentationAtPosition(text, owner.getStart(source));
    const newline = text.includes('\r\n') ? '\r\n' : '\n';

    return {
      end,
      replacement: ` {${text.slice(start, end)}${newline}${indent}}`,
      start,
    };
  }

  visit(source);
  return applyTextEdits(text, edits);
}

function formatSwitchCases(filePath: string, text: string) {
  let nextText = text;

  while (true) {
    const formattedText = formatSwitchCasesOnce(filePath, nextText);
    if (formattedText === nextText) return nextText;
    nextText = formattedText;
  }
}

function formatSwitchCasesOnce(filePath: string, text: string) {
  const { source } = parseSource(filePath, text);
  const edits: TextEdit[] = [];

  function visit(node: ts.Node) {
    if (!ts.isSwitchStatement(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    for (const clause of node.caseBlock.clauses) {
      const wrappedClause = maybeWrapCaseClause(source, text, clause);

      if (wrappedClause) {
        edits.push(wrappedClause);
        continue;
      }

      for (const statement of clause.statements) visit(statement);
    }
  }

  visit(source);
  return applyTextEdits(text, edits);
}

function maybeWrapCaseClause(
  source: ts.SourceFile,
  text: string,
  clause: ts.CaseOrDefaultClause
) {
  if (clause.statements.length === 0) return null;

  if (clause.statements.length === 1 && ts.isBlock(clause.statements[0])) {
    return null;
  }

  const colonIndex = caseClauseColonIndex(source, text, clause);
  const lastStatement = clause.statements[clause.statements.length - 1];
  const end = statementEndWithTrailingComment(text, lastStatement.getEnd());
  const body = text.slice(colonIndex + 1, end);
  if (body.trim().length === 0) return null;
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const indent = indentationAtPosition(text, clause.getStart(source));

  const bodyText =
    body.startsWith('\n') || body.startsWith('\r')
      ? body
      : `${newline}${indent}  ${body.trimStart()}`;

  return {
    end,
    replacement: ` {${bodyText}${newline}${indent}}`,
    start: colonIndex + 1,
  };
}

function caseClauseColonIndex(
  source: ts.SourceFile,
  text: string,
  clause: ts.CaseOrDefaultClause
) {
  const start = ts.isCaseClause(clause)
    ? clause.expression.getEnd()
    : clause.getStart(source) + 'default'.length;

  const colonIndex = text.indexOf(':', start);

  if (colonIndex === -1 || colonIndex > clause.getEnd()) {
    throw new Error(`Could not find switch clause colon in ${source.fileName}`);
  }

  return colonIndex;
}

function statementEndWithTrailingComment(text: string, end: number) {
  const lineEndIndex = text.indexOf('\n', end);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const trailingText = text.slice(end, lineEnd);

  const trailingComment = trailingText.match(
    /^[ \t]*(\/\/.*|\/\*.*\*\/)[ \t]*$/
  );

  return trailingComment ? lineEnd : end;
}

function indentationAtPosition(text: string, position: number) {
  const lineStart = text.lastIndexOf('\n', position - 1) + 1;
  return text.slice(lineStart, position).match(/^[ \t]*/)?.[0] ?? '';
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

  while (statementIndex < source.statements.length) {
    const statement = source.statements[statementIndex];
    if (!ts.isExpressionStatement(statement)) break;
    if (!ts.isStringLiteralLike(statement.expression)) break;
    statementIndex += 1;
  }

  const imports: ts.ImportDeclaration[] = [];

  while (statementIndex < source.statements.length) {
    const statement = source.statements[statementIndex];
    if (!ts.isImportDeclaration(statement)) break;
    imports.push(statement);
    statementIndex += 1;
  }

  if (imports.length < 2) return text;

  const importBlocks = imports.map((node) => {
    const startLine = lineAt(node.getStart(source, false));
    const endLine = lineAt(node.getEnd());
    const block = lines.slice(startLine, endLine + 1);

    return {
      block,
      endLine,
      isMultiline: startLine !== endLine,
      node,
      startLine,
    };
  });

  for (let index = 0; index < importBlocks.length - 1; index += 1) {
    const previous = importBlocks[index];
    const next = importBlocks[index + 1];
    const between = lines.slice(previous.endLine + 1, next.startLine);
    if (between.some((line) => line.trim() !== '')) return text;
  }

  const singleLineBlocks = importBlocks.filter((block) => !block.isMultiline);
  const multilineBlocks = importBlocks.filter((block) => block.isMultiline);

  const orderedBlocks =
    singleLineBlocks.length > 0 && multilineBlocks.length > 0
      ? [...singleLineBlocks, ...multilineBlocks]
      : importBlocks;

  const nextImportLines = orderedBlocks.flatMap((block, index) =>
    index > 0 && isMultilineExternalImport(block.node)
      ? ['', ...block.block]
      : block.block
  );

  const start = lineAt(imports[0].getStart(source, false));
  const end = lineAt(imports[imports.length - 1].getEnd()) + 1;
  const currentImportLines = lines.slice(start, end);
  if (currentImportLines.join('\n') === nextImportLines.join('\n')) return text;
  lines.splice(start, end - start, ...nextImportLines);
  return lines.join(newline) + (hadFinalNewline ? newline : '');
}

function isMultilineExternalImport(node: ts.ImportDeclaration) {
  if (!ts.isStringLiteralLike(node.moduleSpecifier)) return false;
  if (isLocalModuleSpecifier(node.moduleSpecifier.text)) return false;
  const source = node.getSourceFile();

  return (
    source.getLineAndCharacterOfPosition(node.getStart(source, false)).line !==
    source.getLineAndCharacterOfPosition(node.getEnd()).line
  );
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
    (ts.canHaveModifiers(node) &&
      ts
        .getModifiers(node)
        ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));

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
      const previousIsExport = isExportStatement(previous);
      const nextIsExport = isExportStatement(next);

      const bothImports =
        ts.isImportDeclaration(previous) && ts.isImportDeclaration(next);

      const needsPostExportSeparator = previousIsExport;

      const needsImportSeparator =
        bothImports && isMultilineExternalImport(next);

      const needsSeparator =
        needsImportSeparator ||
        (!bothImports &&
          (needsPostExportSeparator ||
            spansMultipleLines(previous) ||
            spansMultipleLines(next) ||
            (ts.isImportDeclaration(previous) &&
              !ts.isImportDeclaration(next)) ||
            (nextIsExport && !previousIsExport)));

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
        if (needsPostExportSeparator) {
          if (current.length !== 1 || !isBlankLine(current[0])) {
            edits.push({ end, replacement: [''], start });
          }

          continue;
        }

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

function formatSwitchCaseSpacing(filePath: string, text: string) {
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const hadFinalNewline = text.endsWith('\n');
  const lines = text.split(/\r?\n/);
  if (hadFinalNewline) lines.pop();
  const { lineAt, source } = parseSource(filePath, text);
  const edits: LineEdit[] = [];
  const isBlankLine = (line: string | undefined) => /^\s*$/.test(line ?? '');

  function visit(node: ts.Node) {
    if (ts.isSwitchStatement(node)) {
      const clauses = node.caseBlock.clauses;

      for (let index = 0; index < clauses.length - 1; index += 1) {
        const previous = clauses[index];
        const next = clauses[index + 1];
        const previousEnd = caseClauseEndWithTrailingComment(text, previous);
        const previousEndLine = lineAt(previousEnd);
        const nextStartLine = lineAt(next.getStart(source, false));
        if (nextStartLine <= previousEndLine) continue;
        const start = previousEndLine + 1;
        const end = nextStartLine;
        const current = lines.slice(start, end);
        if (current.length === 1 && isBlankLine(current[0])) continue;
        if (current.some((line) => !isBlankLine(line))) continue;
        edits.push({ end, replacement: [''], start });
      }
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

function caseClauseEndWithTrailingComment(
  text: string,
  clause: ts.CaseOrDefaultClause
) {
  if (clause.statements.length === 0) return clause.getEnd();
  const lastStatement = clause.statements[clause.statements.length - 1];
  return statementEndWithTrailingComment(text, lastStatement.getEnd());
}

function formatLocalNamespaceImports(filePath: string, text: string) {
  const parsed = parseSource(filePath, text);
  const { source } = parsed;

  const conversions = namespaceImportConversions(parsed).filter(
    (conversion) =>
      !hasUnsupportedNamespaceImportReferences(
        filePath,
        text,
        source,
        conversion
      )
  );

  if (conversions.length === 0) return text;
  const edits: TextEdit[] = [];

  const usedNames = collectIdentifierNames(
    source,
    new Set(
      importedIdentifierReferences(filePath, text, conversions).map(
        (reference) => reference.start
      )
    )
  );

  for (const conversion of conversions) {
    conversion.alias = uniqueIdentifier(conversion.alias, usedNames);
    usedNames.add(conversion.alias);

    edits.push({
      end: conversion.importDeclaration.getEnd(),
      replacement: namespaceImportText(source, conversion),
      start: conversion.importDeclaration.getStart(source, false),
    });
  }

  edits.push(
    ...namespaceImportReferenceEdits(filePath, text, source, conversions)
  );

  return applyTextEdits(text, edits);
}

function namespaceImportConversions(parsed: ParsedSource) {
  const { source } = parsed;
  const conversions: NamespaceImportConversion[] = [];

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const importClause = statement.importClause;
    if (!importClause || importClause.name) continue;
    if (!ts.isStringLiteralLike(statement.moduleSpecifier)) continue;
    if (!isLocalModuleSpecifier(statement.moduleSpecifier.text)) continue;
    const namedBindings = importClause.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;
    if (namedBindings.elements.length === 0) continue;
    if (!namedImportsWrapMultipleLines(parsed, namedBindings)) continue;
    if (hasComment(statement.getFullText(source))) continue;
    const exportedNames = new Map<string, string>();

    for (const element of namedBindings.elements) {
      const localName = element.name.text;
      const exportedName = element.propertyName?.text ?? localName;
      exportedNames.set(localName, exportedName);
    }

    conversions.push({
      alias: namespaceImportAlias(statement.moduleSpecifier.text),
      exportedNames,
      importDeclaration: statement,
      isTypeOnly:
        importClause.isTypeOnly ||
        namedBindings.elements.every((element) => element.isTypeOnly),
    });
  }

  return conversions;
}

function namedImportsWrapMultipleLines(
  parsed: ParsedSource,
  namedBindings: ts.NamedImports
) {
  const { lineAt, source } = parsed;

  return (
    lineAt(namedBindings.getStart(source, false)) !==
    lineAt(namedBindings.getEnd())
  );
}

function hasUnsupportedNamespaceImportReferences(
  filePath: string,
  text: string,
  source: ts.SourceFile,
  conversion: NamespaceImportConversion
) {
  const references = importedIdentifierReferences(filePath, text, [conversion]);

  for (const reference of references) {
    if (isInsideNode(reference.start, conversion.importDeclaration)) continue;
    const node = identifierAtPosition(source, reference.start);
    if (!node) continue;
    if (isUnsupportedNamespaceImportReference(node)) return true;
  }

  return false;
}

function isUnsupportedNamespaceImportReference(node: ts.Identifier) {
  return ts.isExportSpecifier(node.parent);
}

function isLocalModuleSpecifier(moduleSpecifier: string) {
  return moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('@/');
}

function namespaceImportAlias(moduleSpecifier: string) {
  const baseName = moduleSpecifier.split('/').filter(Boolean).pop() ?? 'module';

  const words = baseName
    .replace(/\.[cm]?[jt]sx?$/, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  const alias =
    words
      .map((word, index) => {
        const normalized = word.replace(/^[0-9]+/, '');
        if (normalized.length === 0) return '';
        const lower = normalized[0].toLowerCase() + normalized.slice(1);
        if (index === 0) return lower;
        return lower[0].toUpperCase() + lower.slice(1);
      })
      .join('') || 'module';

  const namespaceAlias =
    alias.startsWith('use') && /^[A-Z]/.test(alias[3] ?? '')
      ? `${alias[3].toLowerCase()}${alias.slice(4)}`
      : alias;

  return /^[A-Za-z_$]/.test(namespaceAlias)
    ? namespaceAlias
    : `module${namespaceAlias}`;
}

function uniqueIdentifier(identifier: string, usedNames: Set<string>) {
  if (!usedNames.has(identifier)) return identifier;

  for (let index = 2; ; index += 1) {
    const candidate = `${identifier}${index}`;
    if (!usedNames.has(candidate)) return candidate;
  }
}

function collectIdentifierNames(
  source: ts.SourceFile,
  ignoredIdentifierStarts = new Set<number>()
) {
  const names = new Set<string>();

  function visit(node: ts.Node) {
    if (
      ts.isIdentifier(node) &&
      !ignoredIdentifierStarts.has(node.getStart(source))
    ) {
      names.add(node.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return names;
}

function namespaceImportText(
  source: ts.SourceFile,
  conversion: NamespaceImportConversion
) {
  const moduleSpecifier =
    conversion.importDeclaration.moduleSpecifier.getText(source);

  const typeKeyword = conversion.isTypeOnly ? ' type' : '';
  return `import${typeKeyword} * as ${conversion.alias} from ${moduleSpecifier};`;
}

function namespaceImportReferenceEdits(
  filePath: string,
  text: string,
  source: ts.SourceFile,
  conversions: NamespaceImportConversion[]
) {
  const importsByLocalName = new Map<
    string,
    { conversion: NamespaceImportConversion; exportedName: string }
  >();

  for (const conversion of conversions) {
    for (const [localName, exportedName] of conversion.exportedNames) {
      importsByLocalName.set(localName, { conversion, exportedName });
    }
  }

  const references = importedIdentifierReferences(filePath, text, conversions);
  const shorthandEdits = new Set<ts.ShorthandPropertyAssignment>();
  const edits: TextEdit[] = [];

  for (const reference of references) {
    const importReference = importsByLocalName.get(reference.name);
    if (!importReference) continue;

    if (
      isInsideNode(
        reference.start,
        importReference.conversion.importDeclaration
      )
    ) {
      continue;
    }

    const node = identifierAtPosition(source, reference.start);
    if (!node) continue;
    const replacement = `${importReference.conversion.alias}.${importReference.exportedName}`;

    if (
      ts.isShorthandPropertyAssignment(node.parent) &&
      node.parent.name === node
    ) {
      if (shorthandEdits.has(node.parent)) continue;
      shorthandEdits.add(node.parent);

      edits.push({
        end: node.parent.getEnd(),
        replacement: `${node.text}: ${replacement}`,
        start: node.parent.getStart(source),
      });

      continue;
    }

    edits.push({ end: reference.end, replacement, start: reference.start });
  }

  return edits;
}

function importedIdentifierReferences(
  filePath: string,
  text: string,
  conversions: NamespaceImportConversion[]
) {
  const references: { end: number; name: string; start: number }[] = [];
  const seenReferences = new Set<string>();
  const service = languageServiceForFile(filePath, text);

  for (const conversion of conversions) {
    for (const localName of conversion.exportedNames.keys()) {
      const name = importSpecifierLocalName(
        conversion.importDeclaration,
        localName
      );

      if (!name) continue;

      const referencedSymbols = service.findReferences(
        filePath,
        name.getStart()
      );

      for (const symbol of referencedSymbols ?? []) {
        for (const reference of symbol.references) {
          if (reference.fileName !== filePath) continue;
          const key = `${localName}:${reference.textSpan.start}:${reference.textSpan.length}`;
          if (seenReferences.has(key)) continue;
          seenReferences.add(key);

          references.push({
            end: reference.textSpan.start + reference.textSpan.length,
            name: localName,
            start: reference.textSpan.start,
          });
        }
      }
    }
  }

  return references;
}

function languageServiceForFile(filePath: string, text: string) {
  const compilerOptions: ts.CompilerOptions = {
    allowJs: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.Latest,
  };

  return ts.createLanguageService({
    directoryExists: (requestedDirectory) =>
      fs.existsSync(path.resolve(repoRoot, requestedDirectory)),
    fileExists: (requestedFilePath) =>
      requestedFilePath === filePath ||
      fs.existsSync(path.resolve(repoRoot, requestedFilePath)),
    getCompilationSettings: () => compilerOptions,
    getCurrentDirectory: () => repoRoot,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => [filePath],
    getScriptSnapshot: (requestedFilePath) => {
      if (requestedFilePath === filePath) {
        return ts.ScriptSnapshot.fromString(text);
      }

      const absolutePath = path.resolve(repoRoot, requestedFilePath);
      if (!fs.existsSync(absolutePath)) return undefined;

      return ts.ScriptSnapshot.fromString(
        fs.readFileSync(absolutePath, 'utf8')
      );
    },
    getScriptVersion: () => '0',
    readFile: (requestedFilePath) => {
      if (requestedFilePath === filePath) return text;
      const absolutePath = path.resolve(repoRoot, requestedFilePath);

      return fs.existsSync(absolutePath)
        ? fs.readFileSync(absolutePath, 'utf8')
        : undefined;
    },
  });
}

function importSpecifierLocalName(
  importDeclaration: ts.ImportDeclaration,
  localName: string
) {
  const namedBindings = importDeclaration.importClause?.namedBindings;
  if (!namedBindings || !ts.isNamedImports(namedBindings)) return null;

  return (
    namedBindings.elements.find((element) => element.name.text === localName)
      ?.name ?? null
  );
}

function isInsideNode(position: number, node: ts.Node) {
  return position >= node.getFullStart() && position < node.getEnd();
}

function identifierAtPosition(
  source: ts.SourceFile,
  position: number
): ts.Identifier | null {
  let match: ts.Identifier | null = null;

  function visit(node: ts.Node) {
    if (position < node.getFullStart() || position >= node.getEnd()) return;

    if (ts.isIdentifier(node) && position >= node.getStart(source)) {
      match = node;
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return match;
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
  return formatSwitchCaseSpacing(
    filePath,
    formatStatementWhitespace(
      filePath,
      formatImports(
        filePath,
        formatLocalNamespaceImports(
          filePath,
          formatImports(
            filePath,
            formatSwitchCases(
              filePath,
              formatIfStatements(filePath, formatJsx(filePath, text))
            )
          )
        )
      )
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
  runOxfmt(collectOxfmtTargets(options.targets));

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
