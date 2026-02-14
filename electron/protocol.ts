//  IPC通信Channel的枚举
export enum IpcChannel {
    CONFIG_BACKUP = 'config-backup',
    CONFIG_RESTORE = 'config-restore',
    LCU_REQUEST = 'lcu-request',
    // LCU 连接状态事件（主进程 -> 渲染进程）
    LCU_CONNECT = 'lcu-connect',           // LOL 客户端已连接
    LCU_DISCONNECT = 'lcu-disconnect',     // LOL 客户端已断开
    // LCU 连接状态查询（渲染进程 -> 主进程）
    LCU_GET_CONNECTION_STATUS = 'lcu-get-connection-status',  // 获取当前连接状态
    HEX_START = 'hex-start',
    HEX_STOP = 'hex-stop',
    HEX_GET_STATUS = 'hex-get-status',
    // 挂机开关快捷键触发事件（主进程 -> 渲染进程）
    HEX_TOGGLE_TRIGGERED = 'hex-toggle-triggered',
    TFT_BUY_AT_SLOT = 'tft-buy-at-slot',
    TFT_GET_SHOP_INFO = 'tft-get-shop-info',
    TFT_GET_EQUIP_INFO = 'tft-get-equip-info',
    TFT_GET_BENCH_INFO = 'tft-get-bench-info',
    TFT_GET_FIGHT_BOARD_INFO = 'tft-get-fight-board-info',
    TFT_GET_LEVEL_INFO = 'tft-get-level-info',
    TFT_GET_COIN_COUNT = 'tft-get-coin-count',
    TFT_GET_LOOT_ORBS = 'tft-get-loot-orbs',
    TFT_GET_STAGE_INFO = 'tft-get-stage-info',  // 获取当前游戏阶段信息
    TFT_SAVE_STAGE_SNAPSHOTS = 'tft-save-stage-snapshots',  // 保存阶段区域截图（用于调试）
    TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT = 'tft-test-save-bench-slot-snapshot',
    TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT = 'tft-test-save-fight-board-slot-snapshot',
    TFT_TEST_SAVE_QUIT_BUTTON_SNAPSHOT = 'tft-test-save-quit-button-snapshot',  // 保存发条鸟退出按钮截图
    // 阵容相关
    LINEUP_GET_ALL = 'lineup-get-all',          // 获取所有阵容
    LINEUP_GET_BY_ID = 'lineup-get-by-id',      // 根据 ID 获取单个阵容
    LINEUP_GET_SELECTED_IDS = 'lineup-get-selected-ids',    // 获取用户选中的阵容 ID 列表
    LINEUP_SET_SELECTED_IDS = 'lineup-set-selected-ids',    // 保存用户选中的阵容 ID 列表
    LINEUP_SAVE = 'lineup-save',                // 保存玩家自建阵容
    LINEUP_DELETE = 'lineup-delete',            // 删除玩家自建阵容
    // 棋子数据相关
    TFT_GET_CHAMPION_CN_TO_EN_MAP = 'tft-get-champion-cn-to-en-map',  // 获取棋子中英文映射表
    // 游戏模式相关
    TFT_GET_MODE = 'tft-get-mode',              // 获取当前 TFT 模式（匹配/排位）
    TFT_SET_MODE = 'tft-set-mode',              // 设置 TFT 模式
    // 日志模式相关
    LOG_GET_MODE = 'log-get-mode',              // 获取当前日志模式（简略/详细）
    LOG_SET_MODE = 'log-set-mode',              // 设置日志模式
    // 日志自动清理阈值
    LOG_GET_AUTO_CLEAN_THRESHOLD = 'log-get-auto-clean-threshold',  // 获取日志自动清理阈值
    LOG_SET_AUTO_CLEAN_THRESHOLD = 'log-set-auto-clean-threshold',  // 设置日志自动清理阈值
    // 游戏进程操作
    LCU_KILL_GAME_PROCESS = 'lcu-kill-game-process',  // 强制杀掉游戏进程
    // Toast 通知（主进程 -> 渲染进程）
    SHOW_TOAST = 'show-toast',  // 显示 Toast 通知
    // 快捷键设置
    HOTKEY_GET_TOGGLE = 'hotkey-get-toggle',    // 获取挂机开关快捷键
    HOTKEY_SET_TOGGLE = 'hotkey-set-toggle',    // 设置挂机开关快捷键
    HOTKEY_GET_STOP_AFTER_GAME = 'hotkey-get-stop-after-game',    // 获取"本局结束后停止"快捷键
    HOTKEY_SET_STOP_AFTER_GAME = 'hotkey-set-stop-after-game',    // 设置"本局结束后停止"快捷键
    // 本局结束后停止功能（主进程 -> 渲染进程）
    HEX_STOP_AFTER_GAME_TRIGGERED = 'hex-stop-after-game-triggered',  // 快捷键触发时通知前端更新状态
    // 本局结束后停止功能（渲染进程 -> 主进程）
    HEX_GET_STOP_AFTER_GAME = 'hex-get-stop-after-game',    // 获取当前状态
    HEX_TOGGLE_STOP_AFTER_GAME = 'hex-toggle-stop-after-game',  // 切换状态
    // 通用设置读写（取代单独的 get/set 通道）
    SETTINGS_GET = 'settings-get',    // 读取设置项
    SETTINGS_SET = 'settings-set',    // 写入设置项
    // 系统工具
    UTIL_IS_ELEVATED = 'util-is-elevated',  // 检测当前是否有管理员权限
    // 统计数据
    STATS_GET = 'stats-get',                      // 获取完整统计数据快照
    STATS_UPDATED = 'stats-updated',              // 统计数据更新事件（主进程 -> 渲染进程）
    // 定时停止功能
    HEX_SET_SCHEDULED_STOP = 'hex-set-scheduled-stop',        // 设置定时停止时间
    HEX_CLEAR_SCHEDULED_STOP = 'hex-clear-scheduled-stop',    // 取消定时停止
    HEX_GET_SCHEDULED_STOP = 'hex-get-scheduled-stop',        // 获取定时停止时间
    // 定时停止触发事件（主进程 -> 渲染进程）
    HEX_SCHEDULED_STOP_TRIGGERED = 'hex-scheduled-stop-triggered',  // 定时停止触发时通知前端
    // 版本与更新
    APP_GET_VERSION = 'app-get-version',          // 获取当前应用版本
    APP_CHECK_UPDATE = 'app-check-update',        // 检查更新（返回最新版本信息）
    // 游戏浮窗（Overlay）
    OVERLAY_SHOW = 'overlay-show',                        // 显示浮窗（传入游戏窗口坐标）
    OVERLAY_CLOSE = 'overlay-close',                      // 关闭浮窗
    OVERLAY_UPDATE_PLAYERS = 'overlay-update-players',    // 更新玩家列表数据（主进程 -> 浮窗渲染进程）
}