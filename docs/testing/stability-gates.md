# v0.1 quality and stability gates

The v0.1 release boundary is protected at these observable seams:

1. Prettier and Biome keep formatting and lint diagnostics at zero.
2. Vitest exercises runtime-neutral domain rules and controller behavior and
   enforces a 50% coverage floor.
3. `publint` and `@arethetypeswrong/cli` validate every public package boundary.
4. Explicit JavaScript budgets reject unintended playground and vanilla
   example bundle growth.
5. Fallow rejects repository-wide dead code, dependency, cycle, duplication,
   and complexity findings.
6. Playwright exercises the public Viewer and Editor, scans the canonical and
   WebGL fallback states with axe, and smoke-tests Chromium, Firefox, and
   WebKit.
7. Pinned Chromium screenshots protect the accepted project-visualization
   presentation.
8. Dependency Review and CodeQL reject high-severity dependency changes and
   scan JavaScript/TypeScript code.

The complete suite is:

```sh
npm run check
npm run test:browser
```

## Visual baselines

`tests/browser/visual-regression.spec.ts` pins these accepted states at a fixed
1280 × 800 viewport:

- the complete PopChoice Recommendation graph in Isometric;
- the same Visualization in Top;
- a retained Asset Placeholder and its recoverable diagnostic;
- a selected Node;
- an invalid overlapping placement preview.

Expected images live beside the browser tests under
`tests/browser/__screenshots__`. A changed image fails CI. Review the actual,
expected, and diff artifacts before accepting a change. If the visual change is
intentional, update snapshots in the same pinned Linux image used by CI. The
anonymous volume prevents Linux dependencies from replacing the host's
`node_modules`, while the bind mount writes the reviewed snapshots back to the
current checkout. Playwright may also write gitignored `playwright-report/` and
`test-results/` diagnostics:

```sh
docker run --rm --ipc=host \
  --env CI=1 \
  --mount type=bind,source="$PWD",target=/work \
  --mount type=volume,target=/work/node_modules \
  --workdir /work \
  mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48 \
  bash -lc 'npm ci && npm run test:visual:update && npm run test:visual'
```

CI runs the complete browser suite in
the digest-pinned Playwright image above; the image already contains the exact
Chromium, Firefox, and WebKit versions required by the pinned Playwright
package. Chromium runs the complete interaction, accessibility, and visual
suite. Firefox and WebKit run the public semantic-graph smoke gate. Failure
artifacts are retained for seven days.

## Static, coverage, and package evidence

`npm run check` is the fast project gate. It checks formatting, lint with
warnings treated as errors, the release contract, TypeScript, unit coverage,
all workspace builds, and the package manifests and declarations.

The initial coverage floor is deliberately broad rather than aspirational:
statements, branches, functions, and lines must each remain at or above 50%.
The floor prevents silent regression while renderer/controller integration
coverage is expanded in later milestones.

Every package intended for eventual publication is checked with strict
`publint` rules and the ESM-only profile from `@arethetypeswrong/cli`. The
repository root remains private and v0.1 does not publish packages.

The built playground and vanilla example have explicit total JavaScript
budgets of 1000 kB and 800 kB respectively. These budgets document the current
Three.js baseline and fail on unintended growth; they do not claim that the
current bundles are fully optimized.

Fallow uses repository-wide gating in CI. Its explicit entry configuration
accounts for build configuration files without hiding unused runtime source.
No telemetry is required.

Dependabot batches npm and GitHub Actions updates into at most one weekly pull
request per ecosystem, keeping maintenance visible without producing a stream
of individual updates.

## Lifecycle and resource evidence

The playground exposes lifecycle controls only when a deterministic test URL
requests them:

- `?scenario=lifecycle` remounts the canonical Editor Session;
- `?scenario=stress&lifecycle=1` remounts the 200-Node fixture.

After one warm-up remount absorbs browser and framework listener
initialization, the browser gates verify after every measured remount that:

- exactly one renderer canvas, label overlay, and semantic summary remain;
- renderer and Editor listeners return to the initial live-target count;
- the previous WebGL context emits `webglcontextlost` and exactly one context
  remains active;
- Editor undo/redo state is empty for the new Session;
- the stress fixture still reports one successful Asset parse, one cached
  Asset, and 200 Node instances.

`packages/three/src/resource-disposal.test.ts` additionally proves that shared
geometry, material, and texture resources are disposed exactly once across all
renderer-owned roots. `packages/web/src/editor-controller.test.ts` proves that
disposing an Editor Session removes listeners, makes the controller inert, and
clears its bounded Operation history.

## Acceptance coverage

| v0.1 requirement | Evidence |
| --- | --- |
| Structural and semantic validation | Core schema and semantic-validation unit suites |
| Lifecycle and diagnostic transitions | Viewer, renderer, and browser lifecycle tests |
| Camera constants, modes, and motion | Camera unit suites plus Isometric/Top browser coverage |
| Node transforms and basic directional Connections | Scene layout, graph, and routing unit suites |
| Selection, Grid snapping, overlap rejection | Editor controller and browser interaction suites |
| Move Node Operation apply/invert and undo/redo | Core Operation/history tests plus browser workflow |
| Pointer and keyboard behavior in both Camera Modes | Canonical Editor browser workflow |
| Renderer, overlay, listener, history, and GPU cleanup | Repeated lifecycle browser gates and disposal unit tests |
| Repeated Asset reuse | Asset Session unit tests and renderer resource metrics |
| Deterministic 200-Node stability | Checked-in stress fixture and repeated lifecycle browser gate |
| Intentional visual review | Five committed screenshot baselines |
| Static and package quality | Prettier, Biome, Fallow, coverage, bundle budgets, `publint`, and `@arethetypeswrong/cli` |
| Accessible fallback and browser portability | axe scans plus Chromium/Firefox/WebKit browser gates |
| Dependency and code security | Dependency Review, CodeQL, and grouped Dependabot updates |
| Release-branch CI | Project, Fallow, browser, dependency, and CodeQL workflows |

The suite intentionally sets no FPS threshold. It detects crashes, lifecycle
growth, resource-count regressions, interaction breakage, and visible
presentation changes.
