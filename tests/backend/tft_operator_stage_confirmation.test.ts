/**
 * Stage confirmation and normalization tests for TftOperator
 * 
 * Tests the majority voting mechanism in confirmStageWithHistory()
 * and the normalizeStageText() OCR correction logic.
 */

import test from "node:test";
import assert from "node:assert/strict";

/**
 * Extracted normalizeStageText logic for testing (mirrors TftOperator private method)
 */
function normalizeStageText(stageText: string): string | null {
    const cleaned = stageText.replace(/\s+/g, '').trim();
    const match = cleaned.match(/^(\d)[\-\.](\d)$/);
    if (!match) return null;

    let stage = parseInt(match[1]);
    let round = parseInt(match[2]);

    if (stage === 0) stage = 6;
    if (round === 0) round = 6;

    if (stage === 1 && round > 4) return null;
    if (stage < 1 || stage > 7 || round < 1 || round > 7) return null;

    return `${stage}-${round}`;
}

/**
 * Extracted confirmStageWithHistory logic for testing
 */
function createStageConfirmer(
    threshold = 4,
    maxHistory = 8
) {
    const history: string[] = [];

    return function confirm(stageText: string): string | null {
        const normalized = normalizeStageText(stageText);
        if (!normalized) return null;

        history.push(normalized);
        if (history.length > maxHistory) history.shift();

        if (history.length < threshold) return null;

        const recent = history.slice(-threshold);
        const voteCounts = new Map<string, number>();
        for (const s of recent) {
            voteCounts.set(s, (voteCounts.get(s) || 0) + 1);
        }

        let maxVotes = 0;
        let majorityStage: string | null = null;
        for (const [stage, count] of voteCounts) {
            if (count > maxVotes) {
                maxVotes = count;
                majorityStage = stage;
            }
        }

        const voteThreshold = Math.max(2, Math.ceil(threshold / 2));
        if (maxVotes >= voteThreshold) {
            return majorityStage;
        }

        return null;
    };
}

test.describe("normalizeStageText", () => {
    test("accepts valid stage format", () => {
        assert.equal(normalizeStageText("2-1"), "2-1");
        assert.equal(normalizeStageText("3-5"), "3-5");
        assert.equal(normalizeStageText("7-7"), "7-7");
    });

    test("handles whitespace", () => {
        assert.equal(normalizeStageText(" 2-1 "), "2-1");
        assert.equal(normalizeStageText("3 - 5"), "3-5");
    });

    test("handles dot separator", () => {
        assert.equal(normalizeStageText("2.1"), "2-1");
    });

    test("fixes stage 0 to 6", () => {
        assert.equal(normalizeStageText("0-2"), "6-2");
        assert.equal(normalizeStageText("0-5"), "6-5");
    });

    test("fixes round 0 to 6", () => {
        assert.equal(normalizeStageText("2-0"), "2-6");
        assert.equal(normalizeStageText("5-0"), "5-6");
    });

    test("rejects stage 1 rounds > 4", () => {
        assert.equal(normalizeStageText("1-5"), null);
        assert.equal(normalizeStageText("1-7"), null);
    });

    test("accepts stage 1 rounds <= 4", () => {
        assert.equal(normalizeStageText("1-1"), "1-1");
        assert.equal(normalizeStageText("1-4"), "1-4");
    });

    test("rejects invalid stage range", () => {
        assert.equal(normalizeStageText("8-1"), null);
        assert.equal(normalizeStageText("9-5"), null);
    });

    test("rejects invalid round range", () => {
        assert.equal(normalizeStageText("2-8"), null);
        assert.equal(normalizeStageText("3-9"), null);
    });

    test("rejects non-stage text", () => {
        assert.equal(normalizeStageText("abc"), null);
        assert.equal(normalizeStageText("2"), null);
        assert.equal(normalizeStageText(""), null);
        assert.equal(normalizeStageText("2-1-3"), null);
    });
});

test.describe("confirmStageWithHistory - majority voting", () => {
    test("returns null with insufficient data", () => {
        const confirm = createStageConfirmer(4, 8);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), null);
        // Only 3 samples, threshold is 4
    });

    test("confirms when all 4 results match", () => {
        const confirm = createStageConfirmer(4, 8);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), "2-1");
    });

    test("confirms with majority (3/4 same)", () => {
        const confirm = createStageConfirmer(4, 8);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-2"), null); // noise
        assert.equal(confirm("2-1"), "2-1"); // 3 out of 4 = 75%
    });

    test("confirms with majority (2/4 same, meeting threshold)", () => {
        const confirm = createStageConfirmer(4, 8);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("3-1"), null);
        assert.equal(confirm("3-2"), "2-1"); // 2 votes for 2-1 = 50%, meets threshold (>= 2)
    });

    test("returns null when no majority", () => {
        const confirm = createStageConfirmer(4, 8);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-2"), null);
        assert.equal(confirm("2-3"), null);
        assert.equal(confirm("2-4"), null); // 1 vote each, no majority
    });

    test("skips invalid stage text (not counted in history)", () => {
        const confirm = createStageConfirmer(4, 8);
        assert.equal(confirm("abc"), null); // invalid, not added
        assert.equal(confirm("8-1"), null); // invalid, not added
        // History should only contain valid entries
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), "2-1"); // 4 valid entries, should confirm
    });

    test("handles stage 0 correction before voting", () => {
        const confirm = createStageConfirmer(4, 8);
        // "0-2" normalizes to "6-2"
        assert.equal(confirm("0-2"), null);
        assert.equal(confirm("6-2"), null);
        assert.equal(confirm("6-2"), null);
        assert.equal(confirm("6-2"), "6-2"); // All 4 are "6-2" after normalization
    });

    test("sliding window works correctly", () => {
        const confirm = createStageConfirmer(4, 8);
        // Fill with 2-1
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), null);
        assert.equal(confirm("2-1"), "2-1"); // Confirmed 2-1
        
        // Shift to 3-1 (need 4 new samples to change confirmation)
        assert.equal(confirm("3-1"), "2-1"); // window: [2-1, 2-1, 2-1, 3-1] = 3/4 for 2-1, confirms 2-1
        assert.equal(confirm("3-1"), "2-1"); // window: [2-1, 2-1, 3-1, 3-1] = 2/4 each, 2-1 wins tiebreaker
        assert.equal(confirm("3-1"), "3-1"); // window: [2-1, 3-1, 3-1, 3-1] = 3/4 for 3-1, confirms 3-1
    });
});
