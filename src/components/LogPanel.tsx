import React, {useState, useEffect, useRef} from 'react';
import styled, {css} from 'styled-components';
import {ThemeType} from '../styles/theme';
import {hextechPanel, hextechPanelSeeThrough} from '../styles/hextech';
import {logStore, LogEntry, LogLevel} from '../stores/logStore';

// 引入图标
import InfoIcon from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import TerminalIcon from '@mui/icons-material/Terminal';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

// -------------------------------------------------------------------
// 类型定义（从 logStore 重新导出，保持兼容）
// -------------------------------------------------------------------
export type {LogLevel, LogEntry} from '../stores/logStore';

// -------------------------------------------------------------------
// 样式组件定义
// -------------------------------------------------------------------

/** 日志级别对应的颜色（info 用青蓝，和整体的海克斯配色呼应） */
const levelColor = (level: LogLevel, theme: ThemeType): string => {
  switch (level) {
    case 'error':
      return theme.colors.error;
    case 'warn':
      return theme.colors.warning;
    case 'info':
    default:
      return theme.colors.accentCyan;
  }
};

// 整个日志面板的外层容器
const LogPanelWrapper = styled.div<{ $isVisible: boolean; theme: ThemeType }>`
  ${hextechPanel};
  ${hextechPanelSeeThrough};
  /* flex: 1 让面板自动占据父容器的剩余高度 */
  flex: 1;
  /* min-height 保证面板不会被压缩得太小 */
  min-height: 100px;
  /* 使用 flex 布局，让内部内容区也能自适应 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: opacity 0.3s ease;
  opacity: ${props => props.$isVisible ? 1 : 0};
  width: 100%;
`;

// 日志面板标题栏
const LogPanelHeader = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px ${props => props.theme.spacing.medium};
  background: linear-gradient(90deg, ${props => props.theme.colors.goldDeep}66 0%, transparent 70%);
  border-bottom: 1px solid ${props => props.theme.colors.goldDeep};
`;

// 标题左侧（图标 + 文字）
const HeaderLeft = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  
  .header-icon {
    color: ${props => props.theme.colors.gold};
    font-size: 1.1rem;
  }
  
  .header-title {
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 2px;
    color: ${props => props.theme.colors.goldBright};
  }
  
  .log-count {
    font-size: 0.72rem;
    color: ${props => props.theme.colors.textSecondary};
    padding: 0 6px;
    border: 1px solid ${props => props.theme.colors.goldDeep};
    margin-left: 4px;
  }
`;

// 清空按钮
const ClearButton = styled.button<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textSecondary};
  background: transparent;
  border: 1px solid ${props => props.theme.colors.goldDim};
  border-radius: ${props => props.theme.borderRadius};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.error};
    border-color: ${props => props.theme.colors.error};
    background: ${props => props.theme.colors.error}14;
  }
  
  .MuiSvgIcon-root {
    font-size: 0.9rem;
  }
`;

// 日志内容区域
const LogPanelContent = styled.div<{ theme: ThemeType }>`
  /* flex: 1 让内容区占据 Wrapper 的剩余空间 */
  flex: 1;
  min-height: 80px;
  padding: ${props => props.theme.spacing.small};
  overflow-y: auto;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: transparent;  /* 不再叠底色，否则实际不透明度会高于面板的 60% */
`;

// 单条日志的样式：左侧一条级别色竖线，背景从左往右淡出
const LogEntryLine = styled.div<{ level: LogLevel; theme: ThemeType }>`
  display: flex;
  align-items: center;  /* 垂直居中对齐 */
  gap: 10px;
  padding: 6px 12px;
  transition: background 0.2s ease;
  border: 1px solid ${({level, theme}) => levelColor(level, theme)}1f;
  border-left: 3px solid ${({level, theme}) => levelColor(level, theme)};
  background: linear-gradient(to right, ${({level, theme}) => levelColor(level, theme)}1a 0%, transparent 85%);

  &:hover {
    background: linear-gradient(to right, ${({level, theme}) => levelColor(level, theme)}2e 0%, ${({level, theme}) => levelColor(level, theme)}0a 85%);
  }
`;

// 日志图标容器 - 左侧垂直居中
const LogIcon = styled.div<{ level: LogLevel; theme: ThemeType }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  
  .MuiSvgIcon-root {
    font-size: 1.2rem;
    ${({level, theme}) => css`color: ${levelColor(level, theme)};`}
  }
`;

// 重复计数徽章 - 类似浏览器控制台的计数器
const RepeatBadge = styled.span<{ level: LogLevel; theme: ThemeType }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  background: ${({level, theme}) => levelColor(level, theme)};
  /* 文字颜色：背景都是亮色，统一用深色字 */
  color: #0A0F16;
`;

// 日志消息样式
const LogMessage = styled.span<{ theme: ThemeType }>`
  flex: 1;
  color: ${props => props.theme.colors.text};
  word-break: break-word;
  white-space: pre-wrap;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
`;

// 时间戳样式 - 放在最右边
const LogTimestamp = styled.span<{ theme: ThemeType }>`
  flex-shrink: 0;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textDisabled};
  font-family: 'Consolas', 'Monaco', monospace;
`;

// 空状态提示
const EmptyState = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.large};
  color: ${props => props.theme.colors.textDisabled};
  
  .MuiSvgIcon-root {
    font-size: 2rem;
    margin-bottom: 8px;
    opacity: 0.5;
    color: ${props => props.theme.colors.gold};
  }
  
  span {
    font-size: 0.85rem;
  }
`;

interface LogPanelProps {
    isVisible: boolean; // 控制整个组件的显隐逻辑
}

/**
 * 根据日志级别返回对应的图标组件
 * @param level - 日志级别：'info' | 'warn' | 'error'
 */
const getLogIcon = (level: LogLevel) => {
    switch (level) {
        case 'error':
            return <ErrorIcon />;
        case 'warn':
            return <WarningIcon />;
        case 'info':
        default:
            return <InfoIcon />;
    }
};

export const LogPanel: React.FC<LogPanelProps> = ({isVisible}) => {
    const [logs, setLogs] = useState<LogEntry[]>(logStore.getLogs())
    const logPanelRef = useRef<HTMLDivElement | null>(null)
    const [isUserScrollUp, setIsUserScrollUp] = useState(false)

    // 初始化全局日志存储 + 订阅变化
    useEffect(() => {
        // 初始化 IPC 监听（只会执行一次）
        logStore.init();
        
        // 订阅日志变化
        const unsubscribe = logStore.subscribe((newLogs) => {
            setLogs(newLogs);
        });
        
        return unsubscribe;
    }, []);

    // 清空所有日志
    const clearLogs = () => {
        logStore.clearLogs();
    }

    /**
     * 日志自动滚动逻辑 - 使用 MutationObserver
     * 
     * 为什么用 MutationObserver 而不是 useEffect + rAF？
     * - useEffect 依赖 logs 变化触发，但 cleanup 会取消 rAF
     * - 当日志快速涌入时，每次新日志都会取消上一次的滚动操作
     * - MutationObserver 直接监听 DOM 变化，在子节点真正添加后触发
     * - 这样无论日志多快涌入，每次 DOM 变化都会触发滚动
     * 
     * isUserScrollUpRef 的作用：
     * - MutationObserver 的回调是闭包，直接读取 state 会拿到旧值
     * - 用 ref 保持对最新值的引用
     */
    const isUserScrollUpRef = useRef(isUserScrollUp);
    
    // 同步 state 到 ref
    useEffect(() => {
        isUserScrollUpRef.current = isUserScrollUp;
    }, [isUserScrollUp]);
    
    // MutationObserver 监听 DOM 变化并自动滚动
    useEffect(() => {
        const logPanel = logPanelRef.current;
        if (!logPanel) return;
        
        // 创建 MutationObserver，监听子节点变化
        const observer = new MutationObserver(() => {
            // 检查用户是否手动上滚（通过 ref 获取最新值）
            if (!isUserScrollUpRef.current) {
                // 直接滚动到底部，此时 DOM 已经更新完成
                logPanel.scrollTop = logPanel.scrollHeight;
            }
        });
        
        // 开始监听：只监听直接子节点的增删
        observer.observe(logPanel, {
            childList: true,  // 监听子节点增删
            subtree: false,   // 不监听孙节点（性能优化）
        });
        
        // 组件卸载时断开监听
        return () => observer.disconnect();
    }, []); // 空依赖，只在挂载时创建一次 observer

    // 检测用户是否手动上滚
    const handleScroll = () => {
        const panel = logPanelRef.current
        if (panel) {
            const isAtBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 20;
            setIsUserScrollUp(!isAtBottom)
        }
    }

    return (
        <LogPanelWrapper $isVisible={isVisible}>
            {/* 标题栏 */}
            <LogPanelHeader>
                <HeaderLeft>
                    <TerminalIcon className="header-icon" />
                    <span className="header-title">运行日志</span>
                    <span className="log-count">{logs.length} 条</span>
                </HeaderLeft>
                <ClearButton onClick={clearLogs} title="清空日志">
                    <DeleteSweepIcon />
                    清空
                </ClearButton>
            </LogPanelHeader>
            
            {/* 日志内容区 */}
            <LogPanelContent ref={logPanelRef} onScroll={handleScroll}>
                {logs.length === 0 ? (
                    <EmptyState>
                        <TerminalIcon />
                        <span>暂无日志</span>
                    </EmptyState>
                ) : (
                    logs.map((log) => (
                        <LogEntryLine key={log.id} level={log.level}>
                            {/* 左侧图标 - 垂直居中 */}
                            <LogIcon level={log.level}>
                                {getLogIcon(log.level)}
                            </LogIcon>
                            {/* 重复计数徽章 - 仅当 count > 1 时显示 */}
                            {log.count > 1 && (
                                <RepeatBadge level={log.level}>{log.count}</RepeatBadge>
                            )}
                            {/* 中间正文 - 字大加粗 */}
                            <LogMessage>{log.message}</LogMessage>
                            {/* 右侧时间戳 */}
                            <LogTimestamp>{log.timestamp}</LogTimestamp>
                        </LogEntryLine>
                    ))
                )}
            </LogPanelContent>
        </LogPanelWrapper>
    )
}