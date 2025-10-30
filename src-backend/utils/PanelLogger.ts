import {BrowserWindow} from 'electron';
import {LogLevel} from "vite";

class PanelLogger {
    private window: BrowserWindow | null;

    constructor() {
        this.window = null
    }

    public init(window: BrowserWindow) {
        this.window = window
    }

    info(message: string) {
        this.sendLogToFrontend(message, 'info');
    }

    warn(message: string) {
        this.sendLogToFrontend(message, 'warn');
    }

    error(message: string | Error) {
        const msg = message instanceof Error ? message.message : message;
        this.sendLogToFrontend(this.window, msg, 'error');
        if (message instanceof Error) {
            console.error(message.stack); // 也在后端打印堆栈
        }
    }

    private sendLogToFrontend(window: BrowserWindow, message: string, level: LogLevel = 'info') {
        if (this.window) {
            window.webContents.send('log-message', {message, level})
        } else {

        }
    }
}
