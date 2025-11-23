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
}