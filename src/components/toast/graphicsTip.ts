import {toast} from "./toast-core.ts";

/** 用户点过"不再显示"后写入的设置项 */
const HIDE_TIP_SETTING = 'hideGraphicsTip';

/** 每次打开软件只在第一次开启挂机时提醒 */
let shownThisSession = false;

/**
 * 首次开启挂机时，提醒用户调整画质和棋盘
 * @description 空格子靠和模板比对来判断（模板截自默认棋盘 + 最低画质），
 *              设置不一致时每个空格子都会被当成有棋子逐个点一遍，非常慢
 */
export const showGraphicsTip = async () => {
    if (shownThisSession) return;
    shownThisSession = true;

    try {
        if (await window.settings.get<boolean>(HIDE_TIP_SETTING)) return;
    } catch (error) {
        console.error('读取画质提醒设置失败:', error);
    }

    toast('请把画质手动调整为最低，并把棋盘替换为默认棋盘，这样可以更快地跳过空白槽位。', {
        type: 'warning',
        persistent: true,
        actions: [
            {
                label: '不再显示',
                onClick: () => {
                    window.settings.set(HIDE_TIP_SETTING, true)
                        .catch(error => console.error('保存画质提醒设置失败:', error));
                },
            },
            {label: '确认', primary: true},
        ],
    });
};
