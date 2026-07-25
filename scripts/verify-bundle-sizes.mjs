import { readdir, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = process.cwd();
const budgets = [
  {
    directory: "apps/playground/dist",
    maxJavaScriptBytes: 1_000_000,
    name: "playground",
  },
  {
    directory: "apps/vanilla-example/dist",
    maxJavaScriptBytes: 800_000,
    name: "vanilla example",
  },
];

for (const budget of budgets) {
  const files = await listFiles(resolve(root, budget.directory));
  const javaScriptFiles = files.filter((path) => extname(path) === ".js");
  const byteCounts = await Promise.all(
    javaScriptFiles.map(async (path) => (await stat(path)).size),
  );
  const totalBytes = byteCounts.reduce((total, bytes) => total + bytes, 0);

  if (javaScriptFiles.length === 0) {
    fail(`${budget.name} build contains no JavaScript files`);
  }

  if (totalBytes > budget.maxJavaScriptBytes) {
    fail(
      `${budget.name} JavaScript is ${formatKilobytes(totalBytes)}; budget is ${formatKilobytes(budget.maxJavaScriptBytes)}`,
    );
  }

  console.log(
    `Verified ${budget.name} JavaScript at ${formatKilobytes(totalBytes)} of ${formatKilobytes(budget.maxJavaScriptBytes)}.`,
  );
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      paths.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      paths.push(path);
    }
  }

  return paths;
}

function formatKilobytes(bytes) {
  return `${(bytes / 1000).toFixed(1)} kB`;
}

function fail(message) {
  throw new Error(`Bundle size verification failed: ${message}.`);
}
