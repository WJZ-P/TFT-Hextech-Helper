import {toast} from "./toast-core.ts";

/** 用户点过"不再显示"后写入的设置项 */
const HIDE_TIP_SETTING = 'hideQueueTip';

/** 每次打开软件只在第一次开启挂机时提醒 */
let shownThisSession = false;

/**
 * 首次开启挂机时，说明排队时游戏界面没有反应是正常的
 * @description 排队是直接调接口发起的，游戏客户端的界面不会实时同步接口这边的状态
 */
export const showQueueTip = async () => {
    if (shownThisSession) return;
    shownThisSession = true;

    try {
        if (await window.settings.get<boolean>(HIDE_TIP_SETTING)) return;
    } catch (error) {
        console.error('读取排队提醒设置失败:', error);
    }

    toast('日志显示正在排队、但游戏界面没有反应是正常的，后台已经开始排队了。', {
        type: 'info',
        persistent: true,
        actions: [
            {
                label: '不再显示',
                onClick: () => {
                    window.settings.set(HIDE_TIP_SETTING, true)
                        .catch(error => console.error('保存排队提醒设置失败:', error));
                },
            },
            {label: '确认', primary: true},
        ],
    });
};
