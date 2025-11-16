//  定义一下棋子相关的一些协议。

//  棋子类型接口
export interface TFTUnit {
    displayName: string;    //  棋子的英雄名称，用于ocr
    cost: number;           //  棋子的购买花费
    traits: Trait[];        //  棋子所属羁绊
}

export enum Trait {
    Warden = "Warden",
    Duelist = "Duelist",
    Invoker = "Invoker",
    Sage = "Sage",
    // ...
    // 你告诉我赛季，我会自动生成完整列表
}