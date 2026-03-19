# AGENTS.md

## Purpose
- This repository is an Electron desktop app for TFT automation.
- Stack: Electron 32, React 18, TypeScript, electron-vite, styled-components, and MUI.
- Main process code lives in `electron/`.
- Renderer code lives in `src/`.
- Automation, game logic, services, OCR, and adapters live in `src-backend/`.
- Backend tests live in `tests/backend/`.
- The codebase is transitional rather than fully uniform.
- Follow the local style of the file you touch.
- Avoid broad refactors or formatting-only sweeps unless explicitly requested.

## Rule Files Status
- No pre-existing root `AGENTS.md` was found before this file was added.
- No `.cursorrules` file was found.
- No `.cursor/rules/` directory was found.
- No `.github/copilot-instructions.md` file was found.
- Supplemental guidance exists in `README.md`.
- Manual QA guidance also exists in `TEST_CHECKLIST.md`.

## Core Commands
- Install dependencies: `npm install`
- Start desktop dev app on Windows: `npm run dev`
- Start desktop dev app on macOS: `npm run mac-dev`
- Build app: `npm run build`
- Preview built app: `npm run preview`
- Lint TS/TSX sources: `npm run lint`
- Typecheck app code: `npm run typecheck`
- Typecheck migration-focused modules: `npm run typecheck:migration`

## Test Commands
- Run backend unit tests: `npm run test:unit`
- Under the hood this runs: `node --import tsx --test tests/backend/**/*.test.ts`
- Run a single test file with the underlying runner, for example:
- `node --import tsx --test tests/backend/rule_based_engine.test.ts`
- There is no dedicated npm script for single-test execution.
- Use the direct `node --import tsx --test <file>` form for focused test runs.

## Utility And Replay Scripts
- PC logic replay: `npm run pc:logic -- <state-json-path>`
- Android simulation replay: `npm run android:sim -- --scenario <scenario-name>`
- Android OCR replay: `npm run android:ocr -- --fixture <fixture-id>`
- Android smoke script: `npm run android:smoke`
- Android one-shot live verify alias: `npm run android:verify-live`
- Extract Android fixtures: `npm run android:extract`
- Refresh TFT data snapshots: `npm run data:refresh`
- Convert raw live state to observed state: `npm run state:convert -- <input> <output>`
- Packaging build directory: `npm run pack`
- Platform builds: `npm run dist`, `npm run dist:win`, `npm run dist:mac`, `npm run dist:linux`

## Validation Expectations
- For most code changes, run `npm run lint` and `npm run typecheck`.
- For backend logic changes, also run `npm run test:unit` or the narrowest affected test file.
- For migration-only backend modules, `npm run typecheck:migration` is a useful targeted check.
- For preload, Electron main-process, or packaging changes, `npm run build` is the safest final verification.
- For hotkey, overlay, logging, or runtime behavior, consult `TEST_CHECKLIST.md` for manual QA ideas.
- Do not claim a command exists unless it is present in `package.json` or is the direct underlying command shown there.

## Repo Layout
- `electron/main.ts`: Electron main process bootstrap and IPC registration.
- `electron/preload.ts`: preload bridge surface exposed to the renderer.
- `src/`: React renderer app and overlay UI.
- `src/components/`: renderer components and pages.
- `src/stores/`: renderer-side stores that wrap preload APIs.
- `src/styles/`: styled-components theme and global styles.
- `src-backend/`: game automation, adapters, OCR, services, data, and state logic.
- `tests/backend/`: Node test runner based backend tests.

## Tooling And Enforcement
- TypeScript is strict in `tsconfig.json`.
- `noUnusedLocals`, `noUnusedParameters`, and `noImplicitReturns` are enabled.
- ESLint is configured in `.eslintrc.cjs`.
- ESLint extends `eslint:recommended`, `@typescript-eslint/recommended`, and `react-hooks/recommended`.
- `@typescript-eslint/no-explicit-any` is disabled in ESLint, but avoid introducing new `any` unless there is no better option.
- `@typescript-eslint/no-unused-vars` is warning-only.
- No Prettier config was found.
- No Biome config was found.
- Formatting is enforced mostly by local file convention, not by one repo-wide formatter.

## Formatting Guidance
- Preserve the surrounding file's quote style, semicolon usage, spacing, and import ordering.
- Do not mass-reformat a file just because you touched one line.
- Some files use single quotes and minimal semicolons.
- Other files use double quotes, semicolons, and wider indentation.
- Match the local style instead of imposing a new one.
- Keep diffs small and surgical.

## Imports And Modules
- The repo uses ESM (`"type": "module"` in `package.json`).
- Use `import type` for type-only imports where practical.
- Relative imports are common across both renderer and backend.
- The renderer build config defines `@` as an alias to `src/`, but current source files mostly use relative imports.
- Prefer the import style already used in the file you are editing.
- Keep explicit `.ts` and `.tsx` extensions when the surrounding file uses them.

## TypeScript Guidance
- Prefer precise interfaces, union types, and generics over `any`.
- Legacy `as any` casts exist in a few places; do not copy that pattern into new code.
- Avoid `@ts-ignore` and `@ts-expect-error` in new code.
- Favor typed wrappers around preload APIs instead of ad hoc `window` access.
- Return explicit types for exported functions, public methods, and store APIs when useful.
- Use null checks and safe defaults at process, IPC, OCR, network, and file-system boundaries.

## Naming Conventions
- React components use PascalCase file names and PascalCase component names.
- Backend classes also use PascalCase.
- Functions, methods, locals, and instances use camelCase.
- Constants use UPPER_SNAKE_CASE when they are true constants.
- Test files use the `*.test.ts` suffix.
- Test base names are mixed between snake_case and descriptive names; follow nearby files.

## Frontend Conventions
- The renderer uses function components, often as arrow functions.
- Routing is handled with `createHashRouter` in `src/Router.tsx`.
- Lazy-loaded pages use `React.lazy` plus `Suspense`.
- Styling is primarily done with styled-components.
- MUI icons and theme utilities are also used.
- Styled-components transient props use the `$propName` pattern.
- Preserve the `$` prefix for props that should not hit the DOM.
- Theme values come from `src/styles/theme.ts` and styled-components theme props.
- Renderer-side state often goes through custom stores such as `settingsStore` rather than repeated direct `window.settings` calls.

## Backend Conventions
- Singleton-style services are common in `src-backend/`.
- Exported singletons like `logger` and `settingsStore` are preferred over ad hoc global instances.
- Electron IPC uses `ipcMain.handle(...)` in `electron/main.ts`.
- Main-process startup is defensive because native modules can fail to load.
- Keep native-module imports and startup sequencing safe.
- Dynamic imports in `electron/main.ts` are intentional and should not be eagerly flattened without a reason.
- State-oriented logic exists under `src-backend/states/` and related services.
- Decision logic and replay tooling live in backend service/core modules and are covered by backend tests.

## Logging And Error Handling
- Backend code should prefer `src-backend/utils/Logger.ts` over raw `console.log`.
- Existing backend log messages commonly use a `[Module] message` prefix.
- Use `logger.info`, `logger.warn`, `logger.debug`, and `logger.error` consistently.
- Renderer code still contains some `console.*` usage, especially in stores and bootstrapping code.
- Avoid empty `catch` blocks.
- Wrap risky native, IPC, OCR, network, and file-system operations in `try/catch`.
- On failures, log enough context to explain which subsystem failed.
- Preserve safe fallback behavior where the existing code already uses it.

## Tests And Fixtures
- Backend tests use the built-in Node test runner from `node:test`.
- Assertions use `node:assert/strict`.
- Tests tend to build focused inline fixtures rather than large test harnesses.
- Keep new tests close to the behavior under change.
- Prefer deterministic fixtures and explicit expected actions.
- If you change game-planning logic, add or update backend tests under `tests/backend/`.

## Comments And Documentation
- JSDoc-style comments are common in backend utilities and services.
- Descriptive inline comments are also common, often in Chinese.
- Some files use a conversational comment style; preserve local tone when editing nearby code.
- Add comments for non-obvious logic, not for trivial assignments.
- Do not remove useful operational context from startup, OCR, state-machine, or runtime comments.

## Practical Agent Rules
- Read the touched module and nearby files before editing.
- Prefer the smallest viable change.
- Keep renderer, preload, and main-process responsibilities separated.
- Do not replace custom stores with a new state library unless explicitly requested.
- Do not replace styled-components with another styling system unless explicitly requested.
- Do not introduce a new formatter or linter config as part of an unrelated task.
- When uncertain, follow the nearest existing pattern in the same directory.
