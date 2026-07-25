# v0.1 stability gates

The v0.1 release boundary is protected at three observable seams:

1. Vitest exercises runtime-neutral domain rules and controller behavior.
2. Playwright exercises the public Viewer and Editor in a real Chromium page.
3. Pinned Chromium screenshots protect the accepted project-visualization
   presentation.

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
`node_modules`, while the bind mount writes only the reviewed snapshots back to
the current checkout:

```sh
docker run --rm --ipc=host \
  --env CI=1 \
  --mount type=bind,source="$PWD",target=/work \
  --mount type=volume,target=/work/node_modules \
  --workdir /work \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  bash -lc 'npm ci && npm run test:visual:update && npm run test:visual'
```

CI runs the complete browser suite in
`mcr.microsoft.com/playwright:v1.61.1-noble`; that pinned Linux Chromium
environment is the release gate. Failure artifacts are retained for seven
days.

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
| Release-branch CI | `npm run check` and `npm run test:browser` in `.github/workflows/ci.yml` |

The suite intentionally sets no FPS threshold. It detects crashes, lifecycle
growth, resource-count regressions, interaction breakage, and visible
presentation changes.
