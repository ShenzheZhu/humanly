import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const packageJsonPaths = [
  path.join(repoRoot, 'package.json'),
  ...fs
    .readdirSync(path.join(repoRoot, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(repoRoot, 'packages', entry.name, 'package.json'))
    .filter((packageJsonPath) => fs.existsSync(packageJsonPath)),
];

const runnerCommands = new Set(['node', 'bash', 'sh', 'tsx']);
const shellOperators = new Set(['&&', '||', ';', '|']);
const localPathPattern = /^(?:\.{1,2}\/|[^=]+\/|[^=]+\.(?:cjs|js|mjs|sh|ts|tsx))$/;

function tokenize(script) {
  const tokens = [];
  let current = '';
  let quote = null;

  const pushCurrent = () => {
    if (current) {
      tokens.push(current);
      current = '';
    }
  };

  for (let index = 0; index < script.length; index += 1) {
    const char = script[index];
    const next = script[index + 1];

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      pushCurrent();
      continue;
    }

    if ((char === '&' && next === '&') || (char === '|' && next === '|')) {
      pushCurrent();
      tokens.push(`${char}${next}`);
      index += 1;
      continue;
    }

    if (char === ';' || char === '|') {
      pushCurrent();
      tokens.push(char);
      continue;
    }

    current += char;
  }

  pushCurrent();
  return tokens;
}

function hasWildcard(value) {
  return value.includes('*') || value.includes('?');
}

function wildcardSegmentToRegExp(segment) {
  const source = segment
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${source}$`);
}

function globExists(baseDir, pattern) {
  const parts = pattern.split(/[\\/]+/).filter(Boolean);

  const visit = (directory, index) => {
    if (index >= parts.length) {
      return fs.existsSync(directory);
    }

    const part = parts[index];
    if (!hasWildcard(part)) {
      return visit(path.join(directory, part), index + 1);
    }

    if (!fs.existsSync(directory)) {
      return false;
    }

    const matcher = wildcardSegmentToRegExp(part);
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .some((entry) => matcher.test(entry.name) && visit(path.join(directory, entry.name), index + 1));
  };

  return visit(baseDir, 0);
}

function pathExists(baseDir, value) {
  return hasWildcard(value)
    ? globExists(baseDir, value)
    : fs.existsSync(path.resolve(baseDir, value));
}

function isLocalPathLike(token) {
  return localPathPattern.test(token) && !token.startsWith('-');
}

function isGeneratedArtifactPath(token) {
  return token === 'dist' || token.startsWith('dist/');
}

function auditScript(packageJsonPath, scriptName, script) {
  const packageDir = path.dirname(packageJsonPath);
  const tokens = tokenize(script);
  const missing = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const command = path.basename(token);
    if (!runnerCommands.has(command)) {
      continue;
    }

    for (let nextIndex = index + 1; nextIndex < tokens.length; nextIndex += 1) {
      const candidate = tokens[nextIndex];
      if (shellOperators.has(candidate)) {
        break;
      }
      if (candidate.startsWith('-') || /^[A-Za-z_][A-Za-z0-9_]*=/.test(candidate)) {
        continue;
      }
      if (!isLocalPathLike(candidate)) {
        continue;
      }
      if (isGeneratedArtifactPath(candidate)) {
        continue;
      }
      if (!pathExists(packageDir, candidate)) {
        missing.push(candidate);
      }
    }
  }

  return missing.map((filePath) => ({
    packageJsonPath,
    scriptName,
    filePath,
  }));
}

const failures = [];

for (const packageJsonPath of packageJsonPaths) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts || {};

  for (const [scriptName, script] of Object.entries(scripts)) {
    failures.push(...auditScript(packageJsonPath, scriptName, String(script)));
  }
}

if (failures.length > 0) {
  console.error('Script audit failed. The following package scripts reference missing local files:');
  for (const failure of failures) {
    const packageLabel = path.relative(repoRoot, failure.packageJsonPath);
    console.error(`- ${packageLabel} script "${failure.scriptName}" -> ${failure.filePath}`);
  }
  process.exit(1);
}

console.log(`Script audit passed for ${packageJsonPaths.length} package.json files.`);
