import test from "node:test";
import assert from "node:assert/strict";
import { equipmentNamesMatch, normalizeEquipmentName } from "../../src-backend/data";

test("equipment name normalizer maps shorthand aliases to canonical data names", () => {
    assert.equal(normalizeEquipmentName("反曲弓"), "反曲之弓");
    assert.equal(normalizeEquipmentName("反曲之弓"), "反曲之弓");
    assert.equal(equipmentNamesMatch("反曲弓", "反曲之弓"), true);
});
