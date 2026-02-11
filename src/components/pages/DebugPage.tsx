import styled from "styled-components";
import { ThemeType } from "../../styles/theme.ts";
import { toast } from "../toast/toast-core.ts";

// -------------------------------------------------------------------
// ✨ 样式组件定义 (Styled Components Definitions) ✨
// -------------------------------------------------------------------

// 整个页面的根容器
const PageWrapper = styled.div<{ theme: ThemeType }>`
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.large};
  height: 100vh;
  overflow-y: auto;
  transition: background-color 0.3s, color 0.3s;
`;

// 设置每一组设置的标头
const SectionHeader = styled.h2`
  margin: ${props => props.theme.spacing.small};
  font-size: ${props => props.theme.fontSizes.large};
  text-align: start;
  margin-bottom: ${props => props.theme.spacing.medium};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// 用来包裹按钮组的卡片
const Card = styled.div`
  background-color: ${props => props.theme.colors.elementBg};
  border-radius: ${props => props.theme.borderRadius};
  border: 1px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.spacing.medium};
  transition: background-color 0.3s, border-color 0.3s;
  margin-bottom: ${props => props.theme.spacing.medium};
`;

// 按钮网格布局
const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${props => props.theme.spacing.small};
`;

// 美化后的调试按钮
const DebugButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'warning' | 'danger' }>`
  background-color: ${props => {
    switch (props.$variant) {
      case 'primary': return props.theme.colors.primary;
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
      default: return props.theme.colors.elementBg;
    }
  }};
  color: ${props => props.$variant ? '#ffffff' : props.theme.colors.text};
  border: 1px solid ${props => {
    switch (props.$variant) {
      case 'primary': return props.theme.colors.primary;
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
      default: return props.theme.colors.border;
    }
  }};
  font-size: ${props => props.theme.fontSizes.small};
  border-radius: ${props => props.theme.borderRadius};
  padding: 0.6rem 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    background-color: ${props => {
      switch (props.$variant) {
        case 'primary': return props.theme.colors.primaryHover;
        case 'warning': return '#d97706';
        case 'danger': return '#dc2626';
        default: return props.theme.colors.border;
      }
    }};
  }

  &:active {
    transform: translateY(0);
  }
`;

// 页面标题
const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin: 0 0 0.25rem 0;
`;

// 页面副标题
const PageSubtitle = styled.p`
  margin: 0 0 ${props => props.theme.spacing.medium} 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.fontSizes.medium};
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

const DebugPage = () => {
    return (
        <PageWrapper>
            <PageTitle>调试面板</PageTitle>
            <PageSubtitle>开发调试用，结果会通过弹窗显示（详细数据请查看控制台 F12）</PageSubtitle>

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
