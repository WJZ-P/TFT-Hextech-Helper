//  IPC通信Channel的枚举
export enum IpcChannel {
    CONFIG_BACKUP = 'config-backup',
    CONFIG_RESTORE = 'config-restore',
    LCU_REQUEST = 'lcu-request',
    HEX_START = 'hex-start',
    HEX_STOP = 'hex-stop',
    TFT_BUY_AT_SLOT = 'tft-buy-at-slot',
    TFT_GET_SHOP_INFO = 'tft-get-shop-info',
    TFT_GET_EQUIP_INFO = 'tft-get-equip-info',
    TFT_GET_BENCH_INFO = 'tft-get-bench-info',
    TFT_GET_FIGHT_BOARD_INFO = 'tft-get-fight-board-info',
    TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT = 'tft-test-save-bench-slot-snapshot',
    TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT = 'tft-test-save-fight-board-slot-snapshot',
}