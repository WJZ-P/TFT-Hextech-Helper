# Frontend Asset Resolution

## Current Rule

Lineup-related frontend surfaces now resolve assets in this order:

1. local season-pack asset path from snapshot `imageUrl`
2. CDN fallback
3. UI placeholder or no-image state

CDN is fallback only. It is no longer the primary source when a synced local asset exists.

### Champion Portrait CDN Scope

Season-specific portrait CDN behavior:

- **S16** — champion portraits use **OP.GG CDN only**. Tencent CDN is not used as a fallback for S16 because Tencent returns skill icons instead of champion portraits for S16 chess IDs.
- **S4** — champion portraits fall back from OP.GG to **Tencent CDN**.
- **Equipment icons** — use OP.GG CDN with no Tencent fallback (unchanged).

## Current Consumers

The main consumer is `src/components/pages/LineupsPage.tsx`.

It now uses `src/utils/tftAssetResolver.ts` to build source chains for:

- champion avatars
- equipment icons
- champion splash art fallback chains

## Local Asset Source

Season-pack asset sync writes local files under:

- `public/resources/season-packs/<season>/champions/`
- `public/resources/season-packs/<season>/equipment/`

The backend sync step attaches those public paths back onto snapshot `imageUrl` fields.

## Failure Handling

- If the local asset exists, the page uses it first.
- If the local path is missing or returns an image load error, the next source in the resolver chain is used.
- If all sources fail, the UI falls back to an in-page placeholder instead of crashing.

## Offline Behavior

- With synced local assets present, the lineup page can render champion and equipment imagery without network access.
- Without local assets, the page still tries CDN sources.
- If both local and CDN sources are unavailable, the page stays interactive and degrades to placeholders.

## Scope Boundary

This change is intentionally limited to existing lineup-related pages and components.

- no global state rewrite
- no backend schema expansion
- no UI redesign
