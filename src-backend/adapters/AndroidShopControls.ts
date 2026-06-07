import type { SimplePoint } from "../TFTProtocol";

type AndroidShopSlotKey = `SHOP_SLOT_${1 | 2 | 3 | 4 | 5}`;

// Android TFT shop controls are laid out differently from the PC client:
// shop cards are across the top and the refresh button is on the right side.
export const androidShopSlotPoints: Record<AndroidShopSlotKey, SimplePoint> = {
    SHOP_SLOT_1: { x: 0.211, y: 0.385 },
    SHOP_SLOT_2: { x: 0.386, y: 0.385 },
    SHOP_SLOT_3: { x: 0.559, y: 0.385 },
    SHOP_SLOT_4: { x: 0.732, y: 0.385 },
    SHOP_SLOT_5: { x: 0.906, y: 0.385 },
};

export const androidRefreshShopPoint: SimplePoint = { x: 0.936, y: 0.672 };
export const androidBuyExpPoint: SimplePoint = { x: 0.073, y: 0.873 };
