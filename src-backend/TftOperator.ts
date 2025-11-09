//  游戏分辨率是1024x768
import { mouse, Button, Point, findWindow, Region } from "@nut-tree-fork/nut-js";
export class TftOperator {
    private static instance:TftOperator;
    //  缓存游戏窗口的位置和大小
    private gameWindowRegion:Region;

    private constructor() {
    }
    public static getInstance(): TftOperator {
        if (!TftOperator.instance) {
            TftOperator.instance = new TftOperator();
        }
        return TftOperator.instance;
    }

    private async clickAt(offset:Point){

    }
}

//node-window-manager