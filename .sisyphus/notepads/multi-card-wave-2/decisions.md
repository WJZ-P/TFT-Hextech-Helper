# Multi-Card Wave 2 — Decisions

## Architectural Decisions

### StrategyService Migration (Round 2 complete)
- All 3 equipment-related methods now use strategyDataHub (not TFT_16_EQUIP_DATA directly)
- isBaseComponentEquipment() added to TftDataHub for formula==="" check
- checkSynthesis() uses strategyDataHub.getEquipmentDefinition()
- EquipKey and TFT_16_EQUIP_DATA imports removed from StrategyService

### StrategyService Migration (Round 3 — 2026-03-20)
Audit confirmed: **no direct static protocol or table accesses remain** in StrategyService.ts.
All catalog data access is routed through `strategyDataHub` (a `TftDataHub` instance).
Active calls: `getChampionRange` (3 sites), `getSelectedAutomationLineups` (1 site), `isWearableEquipment` via wrapper (4 sites), `getEquipmentRoleHint` via wrapper (3 sites), `isBaseComponentEquipment` direct (2 sites).
`getComponentNamesOfItem()` at line 458 is a dead wrapper (0 call sites, delegates to `strategyDataHub.getEquipmentComponents()`). Retained per no-deletion rule.
Remaining architectural gaps (not addressed): champion definition lookup, trait breakpoint/count per unit — would need `getChampionDefinition(name)` and trait rule lookups not currently in TftDataHub.
All imports verified via LSP (grep tool was broken for this file — pattern matching returned zero matches for all identifiers; use LSP or ast_grep for future audits).
