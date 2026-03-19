import path from "path";

interface CliArgs {
    fixture?: string;
    listFixtures: boolean;
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        listFixtures: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--fixture" && argv[index + 1]) {
            args.fixture = argv[index + 1];
            index += 1;
            continue;
        }

        if (token === "--list-fixtures") {
            args.listFixtures = true;
            continue;
        }
    }

    return args;
}

async function main(): Promise<void> {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");
    let ocrService: { destroy(): Promise<void> } | null = null;

    try {
        const args = parseArgs(process.argv.slice(2));
        const [{ androidRecognitionReplayRunner }, tftModule] = await Promise.all([
            import("../src-backend/services/AndroidRecognitionReplayRunner.ts"),
            import("../src-backend/tft/index.ts"),
        ]);
        ocrService = tftModule.ocrService;

        if (args.listFixtures) {
            const fixtures = await androidRecognitionReplayRunner.listFixtures();
            process.stdout.write(`${JSON.stringify(fixtures, null, 2)}\n`);
            return;
        }

        const fixtureId = args.fixture ?? "android-s16-opening-recognition";
        const result = await androidRecognitionReplayRunner.runFixture(fixtureId);
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

        if (!result.summary.allPassed) {
            process.exitCode = 1;
        }
    } finally {
        await ocrService?.destroy();
    }
}

main()
    .then(() => {
        setImmediate(() => process.exit(process.exitCode ?? 0));
    })
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
        process.exitCode = 1;
        setImmediate(() => process.exit(1));
    });
