import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const rootManifest = await readManifest("package.json");
const lockfile = await readManifest("package-lock.json");
const releaseVersion = rootManifest.version;
const manifests = [
  { path: "package.json", manifest: rootManifest },
  ...(
    await Promise.all(
      rootManifest.workspaces.map(async (workspace) => ({
        path: `${workspace}/package.json`,
        manifest: await readManifest(`${workspace}/package.json`),
      })),
    )
  ).sort((left, right) => left.path.localeCompare(right.path)),
];

if (!releaseVersion || releaseVersion === "0.0.0") {
  fail(
    `root release version must be set, received ${releaseVersion ?? "none"}`,
  );
}

const internalPackages = new Set(
  manifests
    .map(({ manifest }) => manifest.name)
    .filter((name) => name?.startsWith("@under-glass/")),
);

for (const { path, manifest } of manifests) {
  verifyPackage(path, manifest);

  const workspacePath =
    path === "package.json" ? "" : path.replace(/\/package\.json$/, "");
  const lockedPackage = lockfile.packages?.[workspacePath];

  if (!lockedPackage) {
    fail(`package-lock.json is missing workspace ${workspacePath || "root"}`);
  }

  verifyPackage(`package-lock.json#packages[${workspacePath}]`, lockedPackage);
}

console.log(
  `Verified ${manifests.length} workspace manifests and package-lock entries at lockstep ${releaseVersion}.`,
);

async function readManifest(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

function verifyPackage(path, manifest) {
  if (manifest.version !== releaseVersion) {
    fail(
      `${path} uses version ${manifest.version ?? "none"}; expected ${releaseVersion}`,
    );
  }

  for (const dependencyField of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    for (const [name, version] of Object.entries(
      manifest[dependencyField] ?? {},
    )) {
      if (internalPackages.has(name) && version !== releaseVersion) {
        fail(
          `${path} declares ${name}@${version} in ${dependencyField}; expected ${releaseVersion}`,
        );
      }
    }
  }
}

function fail(message) {
  console.error(`Release verification failed: ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}
