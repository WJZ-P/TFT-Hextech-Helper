import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { ThemeType } from "../../styles/theme.ts";
import { hextechPanel, hextechPanelSeeThrough, hextechSectionTitle, hextechButtonGhost, hextechButtonPrimary, hextechButtonGold, hextechButtonDanger } from "../../styles/hextech.ts";
import { ToggleSwitch, ToggleSlider } from "../HextechToggle.tsx";
import { toast } from "../toast/toast-core.ts";
import type { DebugScreenshotResult, DebugScreenshotState } from "../../../electron/preload.ts";

// -------------------------------------------------------------------
// ✨ 样式组件定义 (Styled Components Definitions) ✨
// -------------------------------------------------------------------

// 整个页面的根容器
const PageWrapper = styled.div<{ theme: ThemeType }>`
  background:
    radial-gradient(ellipse 80% 35% at 50% 0%, rgba(47, 139, 255, 0.08) 0%, transparent 70%),
    transparent;  /* 底色透明，透出全局背景图 */
  color: ${props => props.theme.colors.text};
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  height: 100%;
  overflow-y: auto;
  text-align: left;
`;

// 设置每一组设置的标头
const SectionHeader = styled.h2`
  ${hextechSectionTitle};
  font-size: ${props => props.theme.fontSizes.medium};
  margin: ${props => props.theme.spacing.medium} 4px ${props => props.theme.spacing.small};
`;

// 用来包裹按钮组的卡片
const Card = styled.div`
  ${hextechPanel};
  ${hextechPanelSeeThrough};
  padding: ${props => props.theme.spacing.medium};
  margin-bottom: ${props => props.theme.spacing.small};
`;

// 按钮网格布局
const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${props => props.theme.spacing.small};
`;

// 美化后的调试按钮
const DebugButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'warning' | 'danger' }>`
  ${props => {
    switch (props.$variant) {
      case 'primary': return hextechButtonPrimary;
      case 'warning': return hextechButtonGold;
      case 'danger': return hextechButtonDanger;
      default: return hextechButtonGhost;
    }
  }};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// 页面标题
const PageTitle = styled.h1`
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 2px;
  color: ${props => props.theme.colors.goldBright};
  margin: 0 0 0.25rem 0;
`;

// 页面副标题
const PageSubtitle = styled.p`
  margin: 0 0 ${props => props.theme.spacing.medium} 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.fontSizes.medium};
`;

// 工具行：左侧说明文字，右侧开关
const ToolRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => props.theme.spacing.medium};
  margin-bottom: ${props => props.theme.spacing.medium};
  padding-bottom: ${props => props.theme.spacing.medium};
  border-bottom: 1px solid ${props => props.theme.colors.goldDeep};
`;

const ToolText = styled.div`
  text-align: start;

  h3 {
    margin: 0 0 0.25rem 0;
    font-size: ${props => props.theme.fontSizes.medium};
    font-weight: 600;
    color: ${props => props.theme.colors.goldBright};
  }

  p {
    margin: 0;
    font-size: ${props => props.theme.fontSizes.small};
    color: ${props => props.theme.colors.textSecondary};
    word-break: break-all;
  }
`;

// 卡片底部的提示文字
const HintText = styled.p<{ $warning?: boolean }>`
  margin: ${props => props.theme.spacing.small} 0 0 0;
  font-size: ${props => props.theme.fontSizes.small};
  color: ${props => props.$warning ? props.theme.colors.warning : props.theme.colors.textSecondary};
  text-align: start;
  word-break: break-all;
`;

// -------------------------------------------------------------------
// ✨ 工具函数 ✨
// -------------------------------------------------------------------

/**
 * 将结果格式化为可读的字符串
 * @param data 任意数据
 * @param maxLength 最大显示长度（超出则截断）
 */
const formatResult = (data: any, maxLength: number = 2000): string => {
    if (data === null || data === undefined) return '无数据';
    if (typeof data === 'string') return data || '空字符串';
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);
    
    try {
        const jsonStr = JSON.stringify(data, null, 2);
        if (jsonStr.length > maxLength) {
            return jsonStr.substring(0, maxLength) + '... (详见控制台)';
        }
        return jsonStr;
    } catch {
        return String(data);
    }
};

/**
 * 通用的调试按钮点击处理函数
 * @param label 按钮标签（用于日志和提示）
 * @param asyncFn 异步操作函数
 */
const handleDebugClick = async (label: string, asyncFn: () => Promise<any>) => {
    try {
        const result = await asyncFn();
        console.log(`[${label}]`, result);
        
        // 处理带 error 字段的响应
        if (result && typeof result === 'object' && 'error' in result && result.error) {
            toast.error(`${label}: ${result.error}`);
            return;
        }
        
        // 处理带 data 字段的响应
        const displayData = result?.data !== undefined ? result.data : result;
        toast.success(`${label}: ${formatResult(displayData)}`);
    } catch (e: any) {
        console.error(`[${label}] 错误:`, e);
        toast.error(`${label} 失败: ${e.message}`);
    }
};

// -------------------------------------------------------------------
// ✨ React 组件本体 ✨
// -------------------------------------------------------------------

/**
 * TFT 窗口截图工具（仅开发版显示）
 * @description 截取 TFT 虚幻客户端窗口所在的屏幕区域，并裁掉标题栏和边框，
 *              用于采集识别模板。支持按钮截图和全局快捷键截图。
 */
const TftScreenshotTool = () => {
    const [state, setState] = useState<DebugScreenshotState | null>(null);
    const [lastFilePath, setLastFilePath] = useState<string | null>(null);

    /** 统一处理截图结果（按钮截图和快捷键截图共用） */
    const handleResult = useCallback((result: DebugScreenshotResult) => {
        if (result.error || !result.data) {
            toast.error(`TFT 窗口截图失败: ${result.error ?? '未知错误'}`);
            return;
        }
        const { filePath, width, height, elapsedMs } = result.data;
        setLastFilePath(filePath);
        toast.success(`已截图 ${width}x${height}，耗时 ${elapsedMs}ms`);
    }, []);

    useEffect(() => {
        window.debugTools.getScreenshotState().then(setState);
        // 快捷键截图在主进程完成，结果通过事件推送过来
        return window.debugTools.onScreenshotTaken(handleResult);
    }, [handleResult]);

    const handleToggleHotkey = async () => {
        if (!state) return;
        const enabled = !state.hotkeyEnabled;
        const result = await window.debugTools.setScreenshotHotkeyEnabled(enabled);
        if (!result.success) {
            toast.error(result.error ?? '设置快捷键失败');
            return;
        }
        setState(await window.debugTools.getScreenshotState());
        toast.success(enabled ? `已开启 ${state.hotkey} 截图快捷键` : `已关闭 ${state.hotkey} 截图快捷键`);
    };

    const handleOpenDir = async () => {
        const result = await window.debugTools.openScreenshotDir();
        if (result.error) {
            toast.error(`打开文件夹失败: ${result.error}`);
        }
    };

    // 非开发版（release 包）不显示
    if (!state?.available) return null;

    return (
        <>
            <SectionHeader>🖼️ TFT 窗口截图（开发版）</SectionHeader>
            <Card>
                <ToolRow>
                    <ToolText>
                        <h3>{state.hotkey} 快捷键截图</h3>
                        <p>截取 TFT 窗口当前所在的屏幕区域（拖动窗口也能截对，TFT 不在前台时会先切到前台），自动裁掉标题栏和边框，只保留游戏画面。</p>
                    </ToolText>
                    <ToggleSwitch onClick={handleToggleHotkey}>
                        <ToggleSlider $isOn={state.hotkeyEnabled} />
                    </ToggleSwitch>
                </ToolRow>
                <ButtonGrid>
                    <DebugButton $variant="primary" onClick={async () => handleResult(await window.debugTools.captureTftWindow())}>
                        截取 TFT 窗口
                    </DebugButton>
                    <DebugButton onClick={handleOpenDir}>
                        打开截图文件夹
                    </DebugButton>
                </ButtonGrid>
                {state.hotkeyEnabled && !state.hotkeyRegistered && (
                    <HintText $warning>快捷键已开启但没有生效，可能和挂机快捷键冲突，详见日志</HintText>
                )}
                <HintText>保存目录：{state.saveDir}</HintText>
                {lastFilePath && <HintText>最近一张：{lastFilePath}</HintText>}
            </Card>
        </>
    );
};

const DebugPage = () => {
    return (
        <PageWrapper>
            <PageTitle>调试面板</PageTitle>
            <PageSubtitle>开发调试用，结果会通过弹窗显示（详细数据请查看控制台 F12）</PageSubtitle>

            {/* TFT 窗口截图（仅开发版显示） */}
            <TftScreenshotTool />

            {/* LCU 客户端操作 */}
            <SectionHeader>🎮 LCU 客户端</SectionHeader>
            <Card>
                <ButtonGrid>
                    <DebugButton $variant="danger" onClick={async () => {
                        const result = await window.lcu.killGameProcess();
                        console.log('杀进程结果:', result);
                        toast(result ? '游戏进程已终止' : '终止失败', { type: result ? 'success' : 'error' });
                    }}>强制杀掉游戏进程</DebugButton>
                    
                    <DebugButton $variant="danger" onClick={() => handleDebugClick('退出游戏', window.lcu.quitGame)}>
                        退出游戏 (LCU)
                    </DebugButton>
                    
                    <DebugButton $variant="danger" onClick={() => handleDebugClick('投降', window.lcu.surrender)}>
                        投降 (LCU)
                    </DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('召唤师信息', window.lcu.getSummonerInfo)}>
                        获取召唤师信息
                    </DebugButton>
                    
                    <DebugButton onClick={async () => {
                        const connected = await window.lcu.getConnectionStatus();
                        toast(connected ? '已连接 LOL 客户端' : '未连接', { type: connected ? 'success' : 'warning' });
                    }}>检查连接状态</DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('游戏流程', window.lcu.getGameflowSession)}>
                        游戏流程 Session
                    </DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('客户端参数', window.lcu.getExtraGameClientArgs)}>
                        游戏客户端参数
                    </DebugButton>
                </ButtonGrid>
            </Card>

            {/* 房间 & 匹配 */}
            <SectionHeader>🏠 房间 & 匹配</SectionHeader>
            <Card>
                <ButtonGrid>
                    <DebugButton $variant="primary" onClick={() => handleDebugClick('创建房间', () => window.lcu.createLobbyByQueueId(1160))}>
                        创建云顶匹配房间
                    </DebugButton>
                    
                    <DebugButton $variant="primary" onClick={() => handleDebugClick('开始匹配', window.lcu.startMatch)}>
                        开始匹配
                    </DebugButton>
                    
                    <DebugButton $variant="danger" onClick={async () => {
                        const result = await window.lcu.leaveLobby();
                        console.log('退出房间结果:', result);
                        toast(result.error ? `退出失败: ${result.error}` : '已退出房间', { type: result.error ? 'error' : 'success' });
                    }}>退出房间</DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('当前房间', window.lcu.getLobby)}>
                        获取当前房间
                    </DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('游戏模式', window.lcu.getCurrentGamemodeInfo)}>
                        当前游戏模式
                    </DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('排队状态', window.lcu.checkMatchState)}>
                        检查排队状态
                    </DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('自定义房间', window.lcu.getCustomGames)}>
                        获取自定义房间
                    </DebugButton>
                    
                    <DebugButton onClick={async () => {
                        const queues: any = await window.lcu.getQueues();
                        if (queues.data) {
                            const count = queues.data.length;
                            console.log(`[游戏模式] 共 ${count} 个:`);
                            for (const queue of queues.data) {
                                console.log(`  [${queue.name || '无名'}] ID:${queue.id} | ${queue.queueAvailability}`);
                            }
                            toast.success(`共 ${count} 个游戏模式 (详见控制台)`);
                        } else {
                            toast.error('获取游戏模式失败');
                        }
                    }}>获取所有游戏模式</DebugButton>
                </ButtonGrid>
            </Card>

            {/* TFT 商店操作 */}
            <SectionHeader>🛒 TFT 商店</SectionHeader>
            <Card>
                <ButtonGrid>
                    <DebugButton $variant="primary" onClick={() => {
                        window.tft.buyAtSlot(1);
                        toast.success('已点击槽位 1');
                    }}>购买槽位 1</DebugButton>
                    
                    <DebugButton $variant="primary" onClick={() => {
                        window.tft.buyAtSlot(2);
                        toast.success('已点击槽位 2');
                    }}>购买槽位 2</DebugButton>
                    
                    <DebugButton $variant="primary" onClick={() => {
                        window.tft.buyAtSlot(3);
                        toast.success('已点击槽位 3');
                    }}>购买槽位 3</DebugButton>
                    
                    <DebugButton $variant="primary" onClick={() => {
                        window.tft.buyAtSlot(4);
                        toast.success('已点击槽位 4');
                    }}>购买槽位 4</DebugButton>
                    
                    <DebugButton $variant="primary" onClick={() => {
                        window.tft.buyAtSlot(5);
                        toast.success('已点击槽位 5');
                    }}>购买槽位 5</DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('商店信息', window.tft.getShopInfo)}>
                        查看商店信息
                    </DebugButton>
                </ButtonGrid>
            </Card>

            {/* TFT 游戏信息 */}
            <SectionHeader>📊 TFT 游戏信息</SectionHeader>
            <Card>
                <ButtonGrid>
                    <DebugButton $variant="primary" onClick={async () => {
                        try {
                            const result = await window.tft.getStageInfo();
                            console.log('[阶段信息]', result);
                            if (result && result.stageText) {
                                toast.success(`当前阶段: ${result.stageText} (类型: ${result.type})`);
                            } else {
                                toast.warning('未检测到阶段信息');
                            }
                        } catch (e: any) {
                            toast.error(`获取阶段失败: ${e.message}`);
                        }
                    }}>当前阶段</DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('备战席信息', window.tft.getBenchInfo)}>
                        备战席信息
                    </DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('棋盘信息', window.tft.getFightBoardInfo)}>
                        棋盘信息
                    </DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('装备信息', window.tft.getEquipInfo)}>
                        装备信息
                    </DebugButton>
                    
                    <DebugButton onClick={async () => {
                        try {
                            const result = await window.tft.getLevelInfo();
                            console.log('[等级信息]', result);
                            if (result && result.level !== undefined) {
                                toast.success(`等级: ${result.level}, 经验: ${result.exp || 0}/${result.expToNextLevel || '?'}`);
                            } else {
                                toast.warning('未检测到等级信息');
                            }
                        } catch (e: any) {
                            toast.error(`获取等级失败: ${e.message}`);
                        }
                    }}>等级信息</DebugButton>
                    
                    <DebugButton onClick={async () => {
                        try {
                            const result = await window.tft.getCoinCount();
                            console.log('[金币数量]', result);
                            toast.success(`当前金币: ${result ?? '未知'}`);
                        } catch (e: any) {
                            toast.error(`获取金币失败: ${e.message}`);
                        }
                    }}>金币数量</DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('战利品球', window.tft.getLootOrbs)}>
                        检测战利品球
                    </DebugButton>
                </ButtonGrid>
            </Card>

            {/* 测试 & 截图 */}
            <SectionHeader>🧪 测试工具</SectionHeader>
            <Card>
                <ButtonGrid>
                    <DebugButton $variant="warning" onClick={async () => {
                        try {
                            const result = await window.tft.saveStageSnapshots();
                            console.log('[阶段截图]', result);
                            if (result.success.length > 0) {
                                toast.success(`阶段截图已保存: ${result.success.join(', ')}`);
                            }
                            if (result.failed.length > 0) {
                                toast.error(`部分截图失败: ${result.failed.join(', ')}`);
                            }
                        } catch (e: any) {
                            toast.error(`保存阶段截图失败: ${e.message}`);
                        }
                    }}>保存阶段区域截图</DebugButton>
                    
                    <DebugButton $variant="warning" onClick={async () => {
                        await window.tft.saveBenchSlotSnapshots();
                        toast.success('备战席截图已保存');
                    }}>保存备战席截图</DebugButton>
                    
                    <DebugButton $variant="warning" onClick={async () => {
                        await window.tft.saveFightBoardSlotSnapshots();
                        toast.success('棋盘截图已保存');
                    }}>保存棋盘截图</DebugButton>
                    
                    <DebugButton $variant="warning" onClick={async () => {
                        await window.tft.saveQuitButtonSnapshot();
                        toast.success('发条鸟退出按钮截图已保存');
                    }}>发条鸟退出按钮截图</DebugButton>
                    
                    <DebugButton onClick={() => {
                        toast("这是一个测试弹窗！", { type: "success" });
                    }}>测试 Toast 弹窗</DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('通用测试', window.lcu.testFunc)}>
                        通用测试功能
                    </DebugButton>
                </ButtonGrid>
            </Card>

            {/* 聊天 & 英雄选择 */}
            <SectionHeader>💬 聊天 & 选人</SectionHeader>
            <Card>
                <ButtonGrid>
                    <DebugButton onClick={() => handleDebugClick('英雄选择', window.lcu.getChampSelectSession)}>
                        英雄选择 Session
                    </DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('聊天会话', window.lcu.getChatConversations)}>
                        聊天会话列表
                    </DebugButton>
                    
                    <DebugButton onClick={() => handleDebugClick('聊天配置', window.lcu.getChatConfig)}>
                        聊天配置
                    </DebugButton>
                </ButtonGrid>
            </Card>
        </PageWrapper>
    );
};

export default DebugPage;
