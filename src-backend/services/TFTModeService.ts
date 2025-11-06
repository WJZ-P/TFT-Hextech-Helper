export enum TFTMode {
    NORMAL = 'NORMAL', //    匹配模式
    RANK = 'RANK'   //  排位模式
}

class TFTModeService {
    private static instance:TFTModeService | null = null
    public tftMode: TFTMode = TFTMode.NORMAL
    
    public static getInstance(): TFTModeService {
    if (!TFTModeService.instance) {
      TFTModeService.instance = new TFTModeService();
    }
    return TFTModeService.instance;
  }

    private constructor() {
        //  从本地尝试读取配置
    }

    public setGameMode(gameMode:TFTMode){
        this.tftMode = gameMode
    }

    public getGameMode(){
        return this.tftMode
    }
}

export const gameModeService = TFTModeService.getInstance()