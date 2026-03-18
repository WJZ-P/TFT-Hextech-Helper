import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { WindowCandidateDiagnosticsReport, WindowCandidateDiagnostic, WindowInfo } from "./WindowHelper";

const execFileAsync = promisify(execFile);
const ANDROID_WINDOW_REGEX = /bluestacks|app player|hd-player|hd-frontend|bstk|mumu|ldplayer|nox|teamfight|tft|金铲|云顶/;

export interface EmulatorProcessDiagnostic {
    processName: string | null;
    id: number | null;
    mainWindowTitle: string | null;
    mainWindowHandle: number | null;
    path: string | null;
}

export function getInterestingWindowEntries(report: WindowCandidateDiagnosticsReport): WindowCandidateDiagnostic[] {
    return report.entries.filter((entry) =>
        entry.matchedTitle ||
        entry.activeHintMatch ||
        entry.excluded ||
        entry.bucket !== "rejected"
    );
}

export function getNativeInterestingEntries(report: WindowCandidateDiagnosticsReport): WindowInfo[] {
    return report.nativeEntries.filter((entry) => {
        const values = [entry.title, entry.className, entry.processName]
            .filter(Boolean)
            .map((value) => (value ?? "").toLowerCase());
        return values.some((value) => ANDROID_WINDOW_REGEX.test(value));
    });
}

export async function getEmulatorProcessDiagnostics(): Promise<EmulatorProcessDiagnostic[]> {
    const script = `$procs = Get-Process | Where-Object { $_.ProcessName -match 'BlueStacks|HD-Player|HD-Frontend|Bstk|bs_' }; $procs | Select-Object ProcessName,Id,MainWindowTitle,MainWindowHandle,Path | ConvertTo-Json -Depth 4 -Compress`;
    try {
        const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script]);
        const trimmed = stdout.trim();
        if (!trimmed) {
            return [];
        }
        const parsed = JSON.parse(trimmed) as Array<{
            ProcessName?: string;
            Id?: number;
            MainWindowTitle?: string;
            MainWindowHandle?: number;
            Path?: string;
        }> | {
            ProcessName?: string;
            Id?: number;
            MainWindowTitle?: string;
            MainWindowHandle?: number;
            Path?: string;
        };
        const records = Array.isArray(parsed) ? parsed : [parsed];
        return records.map((entry) => ({
            processName: entry.ProcessName ?? null,
            id: entry.Id ?? null,
            mainWindowTitle: entry.MainWindowTitle ?? null,
            mainWindowHandle: entry.MainWindowHandle ?? null,
            path: entry.Path ?? null,
        }));
    } catch {
        return [];
    }
}

export function buildAndroidWindowDiagnosticsSummary(
    report: WindowCandidateDiagnosticsReport,
    emulatorProcesses: EmulatorProcessDiagnostic[]
) {
    const nativeInterestingEntries = getNativeInterestingEntries(report);
    return {
        totalWindows: report.totalWindows,
        nativeTotalWindows: report.nativeTotalWindows,
        matchedTitleCount: report.entries.filter((entry) => entry.matchedTitle).length,
        nonRejectedCount: report.entries.filter((entry) => entry.bucket !== "rejected").length,
        zeroSizedMatchedCount: report.entries.filter(
            (entry) => entry.matchedTitle && (!entry.sizeAccepted || entry.width <= 0 || entry.height <= 0)
        ).length,
        nativeInterestingCount: nativeInterestingEntries.length,
        emulatorProcessCount: emulatorProcesses.length,
    };
}
