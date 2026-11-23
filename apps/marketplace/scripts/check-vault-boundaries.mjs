#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const DEFAULT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const CODE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/i;
const ASSET_EXTENSION =
  /\.(?:css|scss|sass|less|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf|json)$/i;
const PRIVATE_MODULE =
  /^src\/lib\/(?:vault-store|vault-auth|vault-access|rights-check|vault-download)(?:\.|\/|$)/;
const NODE_BUILTINS = new Set(
  builtinModules.map((name) => name.replace(/^node:/, "")),
);
const MAX_SCAN_BYTES = 16 * 1024 * 1024;
const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{36}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{60,255}\b/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,256}\b/,
];

const posix = (name) => name.split(path.sep).join("/");

function privatePublicFile(relative) {
  const name = path.posix.basename(relative);
  return (
    /(?:^|\/)(?:\.git|\.aws|\.ssh|\.gnupg)(?:\/|$)/i.test(relative) ||
    /^\.env(?:\.|$)/i.test(name) ||
    /\.(?:sqlite3?|db3?)(?:-(?:wal|shm|journal))?(?:\.(?:bak|backup))?$/i.test(
      name,
    ) ||
    /\.(?:key|pem|p12|pfx|jks|keystore|kdbx)$/i.test(name) ||
    /^id_(?:rsa|dsa|ecdsa|ed25519)$/i.test(name)
  );
}

function hasClientDirective(source) {
  for (const statement of source.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    )
      return false;
    if (statement.expression.text === "use client") return true;
  }
  return false;
}

function typeOnlyImport(node) {
  const clause = node.importClause;
  if (!clause) return false; // A side-effect import still executes its target.
  if (clause.isTypeOnly) return true;
  return (
    !clause.name &&
    clause.namedBindings &&
    ts.isNamedImports(clause.namedBindings) &&
    clause.namedBindings.elements.length > 0 &&
    clause.namedBindings.elements.every((item) => item.isTypeOnly)
  );
}

function typeOnlyExport(node) {
  return (
    node.isTypeOnly ||
    (node.exportClause &&
      ts.isNamedExports(node.exportClause) &&
      node.exportClause.elements.length > 0 &&
      node.exportClause.elements.every((item) => item.isTypeOnly))
  );
}

function dependencies(source) {
  const edges = [];
  function add(expression) {
    edges.push(
      expression && ts.isStringLiteralLike(expression)
        ? { name: expression.text }
        : { computed: true },
    );
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) && !typeOnlyImport(node))
      add(node.moduleSpecifier);
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      !typeOnlyExport(node)
    )
      add(node.moduleSpecifier);
    if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node.moduleReference.expression);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    )
      add(node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return edges;
}

/**
 * A deliberately limited static guard: local client import graphs, public-file
 * names, and a small set of high-confidence secret patterns. It is not a full
 * secret scanner, a production authorization audit, or a bundler replacement.
 * It neither executes source files nor prints the candidate secret values.
 */
export function checkVaultBoundaries(directory = DEFAULT_ROOT) {
  const root = path.resolve(directory);
  if (!existsSync(root) || !lstatSync(root).isDirectory())
    throw new Error("scan-root-unavailable");
  const findings = [];
  const sourceFiles = new Map();
  const clientEntries = [];
  const scanned = new Set();
  const seenFindings = new Set();
  const relative = (filename) => posix(path.relative(root, filename));
  const add = (rule, filename, entry) => {
    const item = {
      rule,
      file: relative(filename),
      ...(entry ? { entry: relative(entry) } : {}),
    };
    const key = JSON.stringify(item);
    if (!seenFindings.has(key)) {
      seenFindings.add(key);
      findings.push(item);
    }
  };

  function readContents(filename) {
    try {
      if (lstatSync(filename).size > MAX_SCAN_BYTES) {
        add("content-scan-size-limit", filename);
        return null;
      }
      return readFileSync(filename, "utf8");
    } catch {
      add("file-read-failed", filename);
      return null;
    }
  }

  function inspectFile(filename, inPublic = false) {
    if (scanned.has(filename)) return;
    scanned.add(filename);
    if (inPublic && privatePublicFile(relative(filename)))
      add("public-private-file", filename);
    const content = readContents(filename);
    if (content === null) return;
    if (SECRET_PATTERNS.some((pattern) => pattern.test(content)))
      add("secret-candidate", filename);
    if (CODE_EXTENSION.test(filename)) {
      const source = ts.createSourceFile(
        filename,
        content,
        ts.ScriptTarget.Latest,
        true,
      );
      sourceFiles.set(filename, source);
      if (
        !inPublic &&
        relative(filename).startsWith("src/") &&
        hasClientDirective(source)
      )
        clientEntries.push(filename);
    }
  }

  function walk(folder, inPublic) {
    let folderInfo;
    try {
      // Check the directory itself before readdir, including dangling root links.
      folderInfo = lstatSync(folder);
    } catch (error) {
      if (error.code !== "ENOENT") add("file-read-failed", folder);
      return;
    }
    if (folderInfo.isSymbolicLink()) {
      add(inPublic ? "public-symlink" : "source-symlink", folder);
      return;
    }
    if (!folderInfo.isDirectory()) {
      add("scan-root-not-directory", folder);
      return;
    }
    for (const item of readdirSync(folder, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const filename = path.join(folder, item.name);
      if (item.isSymbolicLink()) {
        // A public symlink could expose private files outside this scan's roots.
        add(inPublic ? "public-symlink" : "source-symlink", filename);
      } else if (item.isDirectory()) walk(filename, inPublic);
      else if (item.isFile()) inspectFile(filename, inPublic);
    }
  }

  walk(path.join(root, "src"), false);
  walk(path.join(root, "public"), true);

  let compilerOptions = {
    allowJs: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    baseUrl: root,
    paths: { "@/*": ["./src/*"] },
  };
  const configPath = path.join(root, "tsconfig.json");
  if (existsSync(configPath)) {
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    if (config.error) add("typescript-config-unreadable", configPath);
    else {
      const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
      compilerOptions = { ...compilerOptions, ...parsed.options };
    }
  }

  function traverse(filename, entry, visited) {
    if (visited.has(filename)) return;
    visited.add(filename);
    if (PRIVATE_MODULE.test(relative(filename))) {
      add("client-server-boundary", filename, entry);
      return;
    }
    if (!sourceFiles.has(filename)) inspectFile(filename);
    const source = sourceFiles.get(filename);
    if (!source) return;
    for (const edge of dependencies(source)) {
      if (edge.computed) {
        add("client-unresolved-dynamic-import", filename, entry);
        continue;
      }
      const name = edge.name;
      if (name.startsWith("node:") || NODE_BUILTINS.has(name)) {
        add("client-node-builtin", filename, entry);
        continue;
      }
      const resolved = ts.resolveModuleName(
        name,
        filename,
        compilerOptions,
        ts.sys,
      ).resolvedModule;
      if (!resolved) {
        if (
          (name.startsWith(".") || name.startsWith("@/")) &&
          !ASSET_EXTENSION.test(name)
        ) {
          add("client-unresolved-local-import", filename, entry);
        }
        continue; // External npm dependency internals are intentionally not scanned.
      }
      const target = path.resolve(resolved.resolvedFileName);
      if (
        resolved.isExternalLibraryImport ||
        /(?:^|\/)node_modules\//.test(posix(target))
      )
        continue;
      const local = relative(target);
      if (local === ".." || local.startsWith("../") || path.isAbsolute(local)) {
        add("client-outside-root-import", filename, entry);
        continue;
      }
      traverse(target, entry, visited);
    }
  }

  for (const entry of clientEntries) traverse(entry, entry, new Set());
  return { findings, clientEntries: clientEntries.length, files: scanned.size };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.length && (args[0] !== "--root" || args.length !== 2)) {
    console.error(
      "Usage: node scripts/check-vault-boundaries.mjs [--root directory]",
    );
    process.exitCode = 1;
  } else {
    try {
      const report = checkVaultBoundaries(args[1] ?? DEFAULT_ROOT);
      if (report.findings.length) {
        console.error(
          `Vault boundary check failed (${report.findings.length}). 候補の値は表示しません。`,
        );
        for (const finding of report.findings) {
          console.error(
            `${finding.rule}: ${finding.file}${finding.entry ? ` (client: ${finding.entry})` : ""}`,
          );
        }
        process.exitCode = 1;
      } else {
        console.log(
          `Vault boundary check passed (${report.clientEntries} client entries, ${report.files} files).`,
        );
      }
      console.log(
        "限定検査: ローカルのクライアント依存・public内の私有ファイル名・特定の秘密文字列形式を確認します。完全な機密スキャンや認可監査を保証しません。外部npm内部は検査対象外です。",
      );
    } catch {
      console.error(
        "Vault boundary check could not complete. ファイル読取・設定を確認してください。候補の値は表示しません。",
      );
      process.exitCode = 1;
    }
  }
}
