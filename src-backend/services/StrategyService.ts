/**
 * 策略服务
 * @module StrategyService
 * @description 负责游戏内的决策逻辑，如选牌、站位、装备合成等 "大脑" 工作
 */
import { tftOperator } from "../TftOperator";
import { logger } from "../utils/Logger";
import { TFTUnit } from "../TFTProtocol";

// 定义一个简单的目标阵容（演示用）
// 这里为了演示，硬编码了一个诺克萨斯阵容
// 后续我们可以把这个变成从配置文件读取，或者用户在界面选择
const MY_DREAM_COMP = {
    name: "赌狗诺克萨斯",
    // 这里的名字必须和 TFT_16_CHAMPION_DATA 里的 displayName 一致
    // 包含：莎弥拉(1), 卡西奥佩娅(1), 斯维因(2), 克烈(2), 德莱厄斯(3), 卡特琳娜(3), 赛恩(5)
    // 注意：TFTProtocol 中目前可能缺少部分棋子数据，我们暂时只填 Protocol 里有的
    targetUnits: ["莎弥拉", "卡西奥佩娅", "斯维因", "克烈", "德莱厄斯", "卡特琳娜", "赛恩"],
};

/**
 * 策略服务类 (单例)
 */
export class StrategyService {
    private static instance: StrategyService;

    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): StrategyService {
        if (!StrategyService.instance) {
            StrategyService.instance = new StrategyService();
        }
        return StrategyService.instance;
    }

    /**
     * 分析商店并执行购买
     * @description 获取当前商店棋子信息，对比目标阵容，自动购买需要的棋子
     */
    public async analyzeAndBuy() {
        // 1. 获取商店信息
        // getShopInfo 内部会截图并进行 OCR 识别，这是一步相对耗时的操作
        // 返回的是一个长度为 5 的数组，对应商店的 5 个格子
        const shopUnits = await tftOperator.getShopInfo();

        // 2. 遍历商店里的 5 个位置
        for (let i = 0; i < shopUnits.length; i++) {
            const unit = shopUnits[i];

            // 如果是空槽位 (null) 或者识别失败，直接跳过
            if (!unit) continue;

            // 3. 决策逻辑：是我想玩的英雄吗？
            if (this.shouldIBuy(unit)) {
                logger.info(`[StrategyService] 发现目标棋子: ${unit.displayName} (￥${unit.price})，正在购买...`);
                
                // 4. 执行购买
                // buyAtSlot 接受的是 1-5 的索引，而循环变量 i 是 0-4，所以要 +1
                await tftOperator.buyAtSlot(i + 1);
            } else {
                // 如果不是目标棋子，记录一条 debug 日志 (在生产环境可能不需要这条，避免刷屏)
                logger.debug(`[StrategyService] 路人棋子: ${unit.displayName}，跳过`);
            }
        }
    }

    /**
     * 判断某个棋子是否应该购买
     * @param unit 商店里的棋子信息
     * @returns true 表示建议购买，false 表示不买
     */
    private shouldIBuy(unit: TFTUnit): boolean {
        // 基础逻辑：只要在我们的目标阵容名单里，就买！
        // .includes() 方法用来判断数组中是否包含某个元素
        return MY_DREAM_COMP.targetUnits.includes(unit.displayName);

        // --- 进阶逻辑思路 (留给未来的作业) ---
        // 1. 检查金币：如果买了会卡利息 (比如剩 51 块，买个 2 块的变 49)，是否值得？
        // 2. 检查星级：如果场上 + 备战席已经有 9 张了 (能合 3 星)，是否还需要买？
        // 3. 检查备战席空间：如果备战席满了，买了也没地放，是不是要先卖别的？
    }
}

// 导出单例实例，方便其他文件直接使用
export const strategyService = StrategyService.getInstance();
