# Contributing to opencode-ollama-websearch

Thanks for your interest. This is a small project; the process is intentionally light.

## Setup

```bash
git clone https://github.com/justin-carper/opencode-ollama-websearch.git
cd opencode-ollama-websearch
bun install
```

Requires [Bun](https://bun.sh) 1.3+.

## Common commands

```bash
bun test              # run tests (bun:test)
bun run build         # tsc -> dist/
bun run lint          # biome check
bun run lint:fix      # biome check --write (auto-fix)
bun run format        # biome format --write
```

## Workflow

1. Make your change. Keep it surgical — touch only what the change requires.
2. Add or update tests under `test/`. Tests should fail first, then pass.
3. Run `bun run lint:fix && bun run build && bun test`. All three must pass.
4. Add a changeset: `bun run changeset`. Pick `minor` for new features, `patch` for fixes. This updates the changelog and version on the next release PR.
5. Open a PR against `main`. CI runs lint, build, and test.

## Releases

Releases are handled by [Changesets](https://github.com/changesets/changesets) via GitHub Actions:

- A merged PR with a changeset triggers the `release` workflow.
- The workflow opens a "Version Packages" PR that bumps `package.json`, updates `CHANGELOG.md`, and publishes to npm on merge.
- You do not version-bump or publish by hand.

## Adding a changeset

```bash
bun run changeset
# answer the prompts:
#   1. opencode-ollama-websearch
#   2. patch | minor | major
#   3. summary line
```

Commit the new file under `.changeset/` with your PR.

## Code style

- Biome enforces formatting and lint rules. Run `bun run lint:fix` before pushing.
- No comments unless they explain non-obvious "why".
- No new dependencies without justification.
- Match existing patterns in `src/`.

## Reporting issues

Open a GitHub issue with:
- What you expected
- What happened (include the tool name, query, and error message)
- Your `bun --version`, OS, and whether you set `OLLAMA_API_KEY`