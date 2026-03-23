/**
 * 游戏浮窗主组件
 * @module OverlayApp
 * @description 在游戏窗口右侧显示的竖条浮窗，展示当前对局玩家信息
 *              区分真人玩家和人机玩家，帮助用户快速了解对局情况
 * 
 * 数据来源：
 *   主进程通过 IPC 通道 'overlay-update-players' 发送玩家列表
 *   数据格式: PlayerInfo[]
 */
import React, { useEffect, useState } from 'react';

/** 玩家信息接口 */
interface PlayerInfo {
    /** 玩家显示名称（riotIdGameName 或 summonerName） */
    name: string;
    /** 是否为人机玩家 */
    isBot: boolean;
}

/**
 * 浮窗主应用组件
 * @description 展示当前对局的所有玩家，区分真人/人机
 *              使用深色半透明背景，与游戏界面融合
 */
export const OverlayApp: React.FC = () => {
    // 玩家列表状态
    const [players, setPlayers] = useState<PlayerInfo[]>([]);
    // 当前策略名称（来自决策引擎的上下文，可选）
    const [strategyName, setStrategyName] = useState<string | null>(null);
    // 关闭按钮 hover 状态（内联样式不支持 :hover 伪类，用 state 模拟）
    const [closeHover, setCloseHover] = useState(false);

    useEffect(() => {
        // 监听主进程发送的玩家数据更新
        // window.ipc.on 返回一个清理函数（取消监听）
        const cleanup = window.ipc?.on('overlay-update-players', (...args: unknown[]) => {
            const data = args[0] as PlayerInfo[] | undefined;
            if (Array.isArray(data)) setPlayers(data as PlayerInfo[]);
        });

        return () => cleanup?.();
    }, []);

    // 监听决策引擎的策略上下文更新（可选）
    useEffect(() => {
        const cleanupStrategy = window.ipc?.on('decision-chain-updated', (...args: unknown[]) => {
            try {
                const data = args[0] as { strategyName?: string } | undefined;
                if (data && typeof data.strategyName === 'string') {
                    setStrategyName(data.strategyName);
                } else {
                    setStrategyName(null);
                }
            } catch (e) {
                // 容错：不要让浮窗因为外部数据结构问题崩溃
                setStrategyName(null);
            }
        });

        return () => cleanupStrategy?.();
    }, []);

    /**
     * 关闭浮窗
     * 通过 preload 暴露的 ipcRenderer.invoke 调用主进程的 OVERLAY_CLOSE handler
     * 注意：浮窗是独立的渲染进程，使用的是 preload 暴露的 window.ipcRenderer
     */
    const handleClose = () => {
        (window as any).ipcRenderer?.invoke('overlay-close');
    };

    // 统计真人和人机数量
    const realPlayers = players.filter(p => !p.isBot);
    const botPlayers = players.filter(p => p.isBot);

    return (
        <div style={styles.container}>
            {/* 标题栏 */}
            <div style={styles.header}>
                <span style={styles.headerIcon}>🎮</span>
                <span style={styles.headerText}>对局信息</span>
                {/* 策略徽章：当后端提供时显示 */}
                {strategyName && (
                    <span style={styles.strategyBadge} title={`当前策略: ${strategyName}`}>
                        {strategyName}
                    </span>
                )}
                {/* 右上角关闭按钮 */}
                <span
                    style={{
                        ...styles.closeButton,
                        // hover 时变亮 + 加背景
                        ...(closeHover ? { color: '#e2e8f0', backgroundColor: 'rgba(255,255,255,0.1)' } : {}),
                    }}
                    onClick={handleClose}
                    onMouseEnter={() => setCloseHover(true)}
                    onMouseLeave={() => setCloseHover(false)}
                    title="关闭浮窗"
                >✕</span>
            </div>

            {/* 玩家统计摘要 */}
            <div style={styles.summary}>
                <span style={styles.summaryItem}>
                    <span style={styles.dotReal}></span>
                    真人 {realPlayers.length}
                </span>
                <span style={styles.summaryItem}>
                    <span style={styles.dotBot}></span>
                    人机 {botPlayers.length}
                </span>
            </div>

            {/* 分割线 */}
            <div style={styles.divider}></div>

            {/* 玩家列表 */}
            <div style={styles.playerList}>
                {players.length === 0 ? (
                    <div style={styles.loading}>等待对局数据...</div>
                ) : (
                    players.map((player, index) => (
                        <div
                            key={index}
                            style={{
                                ...styles.playerItem,
                                // 交替背景色，提升可读性
                                backgroundColor: index % 2 === 0
                                    ? 'rgba(255, 255, 255, 0.03)'
                                    : 'transparent',
                            }}
                        >
                            {/* 玩家类型指示器（彩色圆点） */}
                            <span
                                style={{
                                    ...styles.playerDot,
                                    backgroundColor: player.isBot ? '#F59E0B' : '#10B981',
                                }}
                            ></span>
                            {/* 玩家名称 */}
                            <span style={styles.playerName}>
                                {player.name}
                            </span>
                            {/* 人机标签 */}
                            {player.isBot && (
                                <span style={styles.botTag}>BOT</span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// ============================================================================
// 内联样式定义
// 由于浮窗是独立的 HTML 页面，不继承主应用的 styled-components 和主题
// 使用 React CSSProperties 内联样式保持简洁
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
    container: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',  // 深色半透明背景
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid rgba(102, 204, 255, 0.3)',  // 主题色边框
        overflow: 'hidden',
        userSelect: 'none',  // 禁止选中文字
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px 6px',
        gap: '6px',
    },
    headerIcon: {
        fontSize: '14px',
    },
    headerText: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#66ccff',  // 主题色
        letterSpacing: '0.5px',
        flex: 1,           // 占满剩余空间，把关闭按钮推到右边
    },
    closeButton: {
        fontSize: '12px',
        color: '#64748b',
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '3px',
        lineHeight: 1,
        transition: 'color 0.15s, background-color 0.15s',
        flexShrink: 0,
    },
    summary: {
        display: 'flex',
        gap: '12px',
        padding: '4px 12px 8px',
        fontSize: '11px',
        color: '#94a3b8',
    },
    summaryItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    dotReal: {
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: '#10B981',
    },
    dotBot: {
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: '#F59E0B',
    },
    divider: {
        height: '1px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        margin: '0 8px',
    },
    playerList: {
        flex: 1,
        overflowY: 'auto',
        padding: '4px 0',
    },
    playerItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        gap: '8px',
        transition: 'background-color 0.15s',
    },
    playerDot: {
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        flexShrink: 0,
    },
    playerName: {
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: '12px',
        color: '#e2e8f0',
    },
    botTag: {
        fontSize: '9px',
        fontWeight: 700,
        color: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        padding: '1px 4px',
        borderRadius: '3px',
        letterSpacing: '0.5px',
        flexShrink: 0,
    },
    loading: {
        textAlign: 'center',
        color: '#64748b',
        padding: '20px 0',
        fontSize: '11px',
    },
    strategyBadge: {
        marginLeft: 8,
        fontSize: '10px',
        fontWeight: 700,
        color: '#0369a1',
        backgroundColor: 'rgba(102, 204, 255, 0.12)',
        padding: '2px 8px',
        borderRadius: 10,
        border: '1px solid rgba(102, 204, 255, 0.18)',
        alignSelf: 'center',
        flexShrink: 0,
    },
};
