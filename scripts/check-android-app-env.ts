import { access } from "fs/promises";
import { constants } from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

async function commandVersion(
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv = process.env
): Promise<{ ok: boolean; output: string }> {
    try {
        const { stdout, stderr } = await execFileAsync(command, args, { env, windowsHide: true, timeout: 10000 });
        return { ok: true, output: `${stdout}${stderr}`.trim() };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, output: message };
    }
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function commandVersionFromCandidates(
    command: string,
    args: string[],
    candidates: string[],
    env: NodeJS.ProcessEnv = process.env
): Promise<{ ok: boolean; output: string; command: string }> {
    const direct = await commandVersion(command, args, env);
    if (direct.ok) {
        return { ...direct, command };
    }

    for (const candidate of candidates) {
        if (!(await fileExists(candidate))) {
            continue;
        }
        const result = candidate.toLowerCase().endsWith(".bat") || candidate.toLowerCase().endsWith(".cmd")
            ? await commandVersion("cmd.exe", ["/c", candidate, ...args], env)
            : await commandVersion(candidate, args, env);
        if (result.ok) {
            return { ...result, command: candidate };
        }
    }

    return { ...direct, command };
}

async function main(): Promise<void> {
    const root = process.cwd();
    const projectRoot = path.join(root, "android-app");
    const checks = [
        ["settings.gradle.kts", path.join(projectRoot, "settings.gradle.kts")],
        ["root build.gradle.kts", path.join(projectRoot, "build.gradle.kts")],
        ["gradle.properties", path.join(projectRoot, "gradle.properties")],
        ["app build.gradle.kts", path.join(projectRoot, "app", "build.gradle.kts")],
        ["AndroidManifest.xml", path.join(projectRoot, "app", "src", "main", "AndroidManifest.xml")],
        ["MainActivity.kt", path.join(projectRoot, "app", "src", "main", "java", "com", "tfthextech", "helper", "MainActivity.kt")],
    ] as const;

    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    const javaHome = process.env.JAVA_HOME || process.env.JDK_HOME || "";
    const javaCandidates = [
        javaHome ? path.join(javaHome, "bin", "java.exe") : "",
        path.join("C:", "Program Files", "Eclipse Adoptium", "jdk-17.0.19.10-hotspot", "bin", "java.exe"),
    ].filter(Boolean);
    const gradleCandidates = [path.join(localAppData, "Gradle", "gradle-8.10.2", "bin", "gradle.bat")];

    const java = await commandVersionFromCandidates("java", ["-version"], javaCandidates);
    const effectiveJavaHome = java.command.endsWith("java.exe") ? path.dirname(path.dirname(java.command)) : javaHome;
    const toolEnv = {
        ...process.env,
        JAVA_HOME: effectiveJavaHome || process.env.JAVA_HOME,
        PATH: [
            effectiveJavaHome ? path.join(effectiveJavaHome, "bin") : "",
            process.env.PATH || "",
        ].filter(Boolean).join(path.delimiter),
    };
    const gradle = await commandVersionFromCandidates("gradle", ["-v"], gradleCandidates, toolEnv);
    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(localAppData, "Android", "Sdk");

    const files = await Promise.all(
        checks.map(async ([label, filePath]) => ({ label, ok: await fileExists(filePath), path: filePath }))
    );

    const result = {
        projectRoot,
        java: { ok: java.ok, command: java.command, firstLine: java.output.split(/\r?\n/)[0] ?? "" },
        gradle: { ok: gradle.ok, command: gradle.command, firstLine: gradle.output.split(/\r?\n/)[0] ?? "" },
        androidSdk: {
            ok: androidHome.length > 0 && await fileExists(androidHome),
            path: androidHome || null,
            platformTools: await fileExists(path.join(androidHome, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb")),
            android35: await fileExists(path.join(androidHome, "platforms", "android-35", "android.jar")),
            buildTools35: await fileExists(path.join(androidHome, "build-tools", "35.0.0")),
        },
        files,
        nextStep: java.ok && gradle.ok && androidHome.length > 0
            ? "Run Gradle from android-app: gradle :app:assembleDebug"
            : "Install Android Studio/JDK/SDK first, then rerun npm run android:app:doctor",
    };

    console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});

