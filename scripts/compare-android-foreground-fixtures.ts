import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface CliArgs {
    baselineFixture: string;
    candidateFixture: string;
}

interface ReplayResult {
    fixtureId: string;
    analysisSequence: Array<{
        frameId: string;
        frameLabel: string;
        foregroundObservation: {
            state: string;
            verification: string;
        };
        foregroundDecision: {
            kind: string;
            reason: string;
        };
        expectedStateMatched?: boolean | null;
        expectedDecisionMatched?: boolean | null;
    }>;
}

function parseArgs(argv: string[]): CliArgs {
    let baselineFixture = "";
    let candidateFixture = "";

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--baseline" && argv[index + 1]) {
            baselineFixture = path.resolve(argv[index + 1]);
            index += 1;
            continue;
        }

        if (token === "--candidate" && argv[index + 1]) {
            candidateFixture = path.resolve(argv[index + 1]);
            index += 1;
        }
    }

    if (!baselineFixture || !candidateFixture) {
        throw new Error("缺少必要参数: --baseline <fixture> --candidate <fixture>");
    }

    return { baselineFixture, candidateFixture };
}

async function runFixture(fixturePath: string): Promise<ReplayResult> {
    const repoRoot = path.resolve(process.cwd());
    const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
    try {
        const { stdout } = await execFileAsync(
            process.execPath,
            [tsxCli, "scripts/run-android-live-smoke.ts", "--fixture", fixturePath],
            {
                cwd: repoRoot,
                windowsHide: true,
            }
        );

        return JSON.parse(stdout.slice(stdout.indexOf("{"))) as ReplayResult;
    } catch (error) {
        const stdout = (error as { stdout?: string }).stdout ?? "";
        const jsonStart = stdout.indexOf("{");
        if (jsonStart >= 0) {
            return JSON.parse(stdout.slice(jsonStart)) as ReplayResult;
        }
        throw error;
    }
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    const [baseline, candidate] = await Promise.all([
        runFixture(args.baselineFixture),
        runFixture(args.candidateFixture),
    ]);

    const maxLength = Math.max(baseline.analysisSequence.length, candidate.analysisSequence.length);
    const diffs = [] as Array<{
        index: number;
        baselineFrameId: string | null;
        candidateFrameId: string | null;
        baselineState: string | null;
        candidateState: string | null;
        baselineVerification: string | null;
        candidateVerification: string | null;
        baselineDecision: string | null;
        candidateDecision: string | null;
        stateChanged: boolean;
        verificationChanged: boolean;
        decisionChanged: boolean;
    }>;
    const baselineExpectedMismatchCount = baseline.analysisSequence.filter(
        (entry) => entry.expectedStateMatched === false || entry.expectedDecisionMatched === false
    ).length;
    const candidateExpectedMismatchCount = candidate.analysisSequence.filter(
        (entry) => entry.expectedStateMatched === false || entry.expectedDecisionMatched === false
    ).length;

    for (let index = 0; index < maxLength; index += 1) {
        const baselineEntry = baseline.analysisSequence[index];
        const candidateEntry = candidate.analysisSequence[index];
        const stateChanged = (baselineEntry?.foregroundObservation.state ?? null) !== (candidateEntry?.foregroundObservation.state ?? null);
        const verificationChanged =
            (baselineEntry?.foregroundObservation.verification ?? null) !== (candidateEntry?.foregroundObservation.verification ?? null);
        const decisionChanged =
            (baselineEntry?.foregroundDecision.kind ?? null) !== (candidateEntry?.foregroundDecision.kind ?? null);

        if (!stateChanged && !verificationChanged && !decisionChanged) {
            continue;
        }

        diffs.push({
            index,
            baselineFrameId: baselineEntry?.frameId ?? null,
            candidateFrameId: candidateEntry?.frameId ?? null,
            baselineState: baselineEntry?.foregroundObservation.state ?? null,
            candidateState: candidateEntry?.foregroundObservation.state ?? null,
            baselineVerification: baselineEntry?.foregroundObservation.verification ?? null,
            candidateVerification: candidateEntry?.foregroundObservation.verification ?? null,
            baselineDecision: baselineEntry?.foregroundDecision.kind ?? null,
            candidateDecision: candidateEntry?.foregroundDecision.kind ?? null,
            stateChanged,
            verificationChanged,
            decisionChanged,
        });
    }

    process.stdout.write(`${JSON.stringify({
        baselineFixtureId: baseline.fixtureId,
        candidateFixtureId: candidate.fixtureId,
        baselineFrameCount: baseline.analysisSequence.length,
        candidateFrameCount: candidate.analysisSequence.length,
        baselineExpectedMismatchCount,
        candidateExpectedMismatchCount,
        diffCount: diffs.length,
        diffs,
    }, null, 2)}\n`);

    if (diffs.length > 0 || baselineExpectedMismatchCount > 0 || candidateExpectedMismatchCount > 0) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
});
