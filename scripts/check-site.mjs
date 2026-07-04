import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const requiredPages = [
  "index.html",
  "programs/index.html",
  "categories/index.html",
  "samples/index.html",
  "pricing-preview/index.html",
  "about/index.html",
  "contact/index.html",
  "terms-preview/index.html",
  "programs/greeting-first-impression/index.html",
  "programs/report-contact-consult/index.html",
  "programs/basic-money-management/index.html",
];

const requiredDownloads = [
  "assets/downloads/greeting-first-impression-kit.html",
  "assets/downloads/report-contact-consult-kit.html",
  "assets/downloads/basic-money-management-kit.html",
  "assets/downloads/monthly-program-calendar.html",
  "assets/downloads/implementation-record-sample.html",
];

const missing = [...requiredPages, ...requiredDownloads].filter((relativePath) => {
  return !existsSync(path.join(root, relativePath));
});

if (missing.length > 0) {
  console.error("Missing required files:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

const dataSource = await readFile(path.join(root, "assets/data/programs.js"), "utf8");
const fullFreeCount = (dataSource.match(/access:\s*"free-full"/g) ?? []).length;
const previewCount = (dataSource.match(/access:\s*"free-preview"/g) ?? []).length;
const plannedPaidCount = (dataSource.match(/access:\s*"planned-paid"/g) ?? []).length;

if (fullFreeCount < 3 || previewCount < 3 || plannedPaidCount < 4) {
  console.error(
    `Unexpected access mix: full=${fullFreeCount}, preview=${previewCount}, planned=${plannedPaidCount}`,
  );
  process.exit(1);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(dataSource, sandbox);
for (const program of sandbox.window.SPL_DATA.programs) {
  for (const download of program.downloads || []) {
    const target = path.join(root, download.href);
    if (!existsSync(target)) {
      console.error(`Program download target missing: ${program.slug} -> ${download.href}`);
      process.exit(1);
    }
  }
}

const htmlFiles = [
  ...requiredPages,
  ...requiredDownloads,
].map((relativePath) => path.join(root, relativePath));

const linkPattern = /\b(?:href|src)="([^"]+)"/g;
const unresolved = [];

for (const htmlPath of htmlFiles) {
  const html = await readFile(htmlPath, "utf8");
  for (const match of html.matchAll(linkPattern)) {
    const target = match[1];
    if (
      target === "" ||
      target.startsWith("#") ||
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:")
    ) {
      continue;
    }

    const withoutHash = target.split("#")[0];
    if (withoutHash === "") continue;

    const absolute = path.resolve(path.dirname(htmlPath), withoutHash);
    const targetExists = withoutHash.endsWith("/")
      ? existsSync(path.join(absolute, "index.html"))
      : existsSync(absolute);

    if (!targetExists) {
      unresolved.push(`${path.relative(root, htmlPath)} -> ${target}`);
    }
  }
}

if (unresolved.length > 0) {
  console.error("Unresolved local links:");
  for (const item of unresolved) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`Support Program Lab static checks passed (${htmlFiles.length} HTML files).`);
