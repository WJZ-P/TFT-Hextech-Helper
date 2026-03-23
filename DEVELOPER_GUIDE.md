# Developer Guide

This guide provides a quick reference for contributing to TFT-Hextech-Helper. It covers project structure, common workflows, and how to extend the app.

## Project Structure
- `electron/` — Main process code for Electron.
- `src/` — Renderer (React) code.
- `src-backend/` — Automation, adapters, OCR services, and data processing.
- `tests/` — Backend tests (located under `tests/backend/`).

## Common Commands
- `npm run dev` — Start the desktop app in development mode (Windows).
- `npm run build` — Build the app for distribution.
- `npm run lint` — Lint TypeScript/TSX sources.
- `npm run typecheck` — Type-check the TypeScript project.
- `npm run test` — Run backend unit tests (or targeted tests under `tests/backend/`).

## Adding a New IPC Channel
1. Define a channel name (e.g., `myChannel`) in the Electron main process (`electron/main.ts`).
2. Expose it to the renderer via the preload script (e.g., `window.api.myChannel`).
3. Implement the handler in the main process to perform the required action and return a result.
4. Use the channel from the renderer (e.g., via `ipcRenderer.invoke` or the exposed API).

## Adding New Settings
1. Add a new property to the Settings model/types in `src-backend/` (e.g., `src-backend/types/Settings.ts`).
2. Wire the setting into the Settings store used by the renderer (e.g., `src/stores/`).
3. Update UI components to reflect the new setting and ensure defaults are sane.
4. Validate the setting through existing tests or add new tests as needed.

## Testing Patterns
- Backend tests live in `tests/backend/` and are run via `npm run test`.
- Use deterministic fixtures in `tests/backend/fixtures/` where possible.
- When adding new modules, place unit tests alongside the module (e.g., `src-backend/services/MyService.ts` and `tests/backend/myservice.test.ts`).

## Contributing Notes
- Follow existing coding style and project conventions.
- Add JSDoc where helpful to clarify APIs and intent.
- Include small, focused commits; ensure tests pass before pushing.
