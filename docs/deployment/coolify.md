# Coolify preview deployment

The public Under Glass preview runs as a static nginx container on the
maintainer's Coolify-managed VPS.

## Build contract

- Source: the public `shchilkin/under-glass` repository.
- Production branch: `development`.
- Build pack: the repository `Dockerfile`.
- Dockerfile location: `/Dockerfile`.
- Exposed port: `8080`.
- Health check: `GET /healthz` returns `200`.
- Public URL: <https://under-glass.shchilkin.dev>.

The multi-stage image builds the playground with the repository's Node 24 and
npm 11.13 baselines, then copies only `apps/playground/dist` into an
unprivileged nginx runtime image listening on `8080`. Playwright browsers,
source files, dependencies, and build tooling are not present in the runtime
image.

Coolify auto-deploy is enabled only after this deployment contract reaches
`development`. Feature branches may be selected temporarily for release
verification, but the public URL is never treated as release evidence until it
serves the accepted `development` commit.

## Release verification

After deployment:

1. require a healthy Coolify deployment for the accepted commit;
2. require `GET /healthz` to return `200`;
3. open the canonical playground in Chromium and wait for `loading → ready`;
4. exercise both Camera Modes and both Camera Motion choices;
5. select and move a Node, verify Grid snapping and overlap rejection, then
   undo and redo the committed Move Node Operation;
6. verify the semantic fallback with WebGL2 unavailable.

The custom hostname points at the Coolify server through Cloudflare DNS. HTTPS
termination and certificate renewal remain owned by the Coolify proxy.
