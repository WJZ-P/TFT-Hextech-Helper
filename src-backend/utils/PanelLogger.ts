import {BrowserWindow} from 'electron';
import {LogLevel} from "vite";

class PanelLogger {
    //  单例模式
    private static instance: PanelLogger | null = null;
    private window: BrowserWindow | undefined;

    public static getInstance() {
        if (!PanelLogger.instance)
            PanelLogger.instance = new PanelLogger()
        return PanelLogger.instance
    }

    private constructor() {
    }

    public init(window: BrowserWindow) {
        this.window = window
    }

    info(message: string) {
        this.sendLogToFrontend(message, 'info');
        console.log(`[info] ${message}`)
    }

    warn(message: string) {
        this.sendLogToFrontend(message, 'warn');
        console.log(`[warn] ${message}`)
    }

    error(message: string | Error) {
        const msg = message instanceof Error ? message.message : message;
        this.sendLogToFrontend(msg, 'error');
        console.log(`[error] ${message}`)
        if (message instanceof Error) {
            console.error(message.stack); // 也在后端打印堆栈
        }
    }

    private sendLogToFrontend(message: string, level: LogLevel = 'info') {
        if (this.window) {
            this.window.webContents.send('log-message', {message, level})
        } else {
            console.error("[PanelLogger] 无window对象")
        }
    }
}

export const logger = PanelLogger.getInstance()