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
    TFT_BUY_AT_SLOT = 'tft-buy-at-slot',
    TFT_GET_SHOP_INFO = 'tft-get-shop-info',
    TFT_GET_EQUIP_INFO = 'tft-get-equip-info',
    TFT_GET_BENCH_INFO = 'tft-get-bench-info',
    TFT_GET_FIGHT_BOARD_INFO = 'tft-get-fight-board-info',
    TFT_GET_LEVEL_INFO = 'tft-get-level-info',
    TFT_GET_COIN_COUNT = 'tft-get-coin-count',
    TFT_GET_LOOT_ORBS = 'tft-get-loot-orbs',
    TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT = 'tft-test-save-bench-slot-snapshot',
    TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT = 'tft-test-save-fight-board-slot-snapshot',
    // 阵容相关
    LINEUP_GET_ALL = 'lineup-get-all',          // 获取所有阵容
    LINEUP_GET_BY_ID = 'lineup-get-by-id',      // 根据 ID 获取单个阵容
    LINEUP_GET_SELECTED_IDS = 'lineup-get-selected-ids',    // 获取用户选中的阵容 ID 列表
    LINEUP_SET_SELECTED_IDS = 'lineup-set-selected-ids',    // 保存用户选中的阵容 ID 列表
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
}