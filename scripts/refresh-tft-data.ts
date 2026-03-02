import fs from "fs";
import path from "path";
import { tftDataService } from "../src-backend/services/TftDataService";

async function main(): Promise<void> {
    const [, , outputPathArg] = process.argv;
    await tftDataService.refresh(true);
    const snapshot = tftDataService.getSnapshot();

    console.log(
        `[tft-data] source=${snapshot.source} champions=${snapshot.champions.length} items=${snapshot.items.length} traits=${snapshot.traits.length} lineups=${snapshot.lineups.length}`
    );

    if (!outputPathArg) {
        return;
    }

    const outputPath = path.resolve(process.cwd(), outputPathArg);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf8");
    console.log(`[tft-data] snapshot written to ${outputPath}`);
}

void main();
