export enum GameMode {
    NORMAL = 'NORMAL', //    匹配模式
    RANK = 'RANK'   //  排位模式
}

class GameModeService{
    private static instance:GameModeService | null = null
    public gamemode: GameMode = GameMode.NORMAL
    
    public static getInstance(): GameModeService {
    if (!GameModeService.instance) {
      GameModeService.instance = new GameModeService();
    }
    return GameModeService.instance;
  }

    private constructor() {
        //  从本地尝试读取配置
    }

    public setGameMode(gameMode:GameMode){
        this.gamemode = gameMode
    }

    public getGameMode(){
        return this.gamemode
    }
}

export const gameModeService = GameModeService.getInstance()