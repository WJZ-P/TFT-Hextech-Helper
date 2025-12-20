import React, {useState, useEffect, useRef} from 'react';
import styled, {css} from 'styled-components';
import {ThemeType} from '../styles/theme';

// 引入图标
import InfoIcon from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import TerminalIcon from '@mui/icons-material/Terminal';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

// -------------------------------------------------------------------
// 类型定义
// -------------------------------------------------------------------
export type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
    id: number;
    timestamp: string;
    level: LogLevel;
    message: string;
}

// -------------------------------------------------------------------
// 样式组件定义
// -------------------------------------------------------------------

// 整个日志面板的外层容器
const LogPanelWrapper = styled.div<{ $isVisible: boolean; theme: ThemeType }>`
  /* flex: 1 让面板自动占据父容器的剩余高度 */
  flex: 1;
  /* min-height 保证面板不会被压缩得太小 */
  min-height: 100px;
  /* 使用 flex 布局，让内部内容区也能自适应 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: ${props => props.theme.colors.elementBg};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  transition: opacity 0.3s ease;
  opacity: ${props => props.$isVisible ? 1 : 0};
  width: 100%;
  margin-top: ${props => props.theme.spacing.large};
  /* 添加微妙的阴影增加层次感 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
`;

// 日志面板标题栏
const LogPanelHeader = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.medium};
  background: linear-gradient(135deg, 
    ${props => props.theme.colors.primary}15 0%, 
    ${props => props.theme.colors.elementBg} 100%
  );
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

// 标题左侧（图标 + 文字）
const HeaderLeft = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  
  .header-icon {
    color: ${props => props.theme.colors.primary};
    font-size: 1.2rem;
  }
  
  .header-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${props => props.theme.colors.text};
  }
  
  .log-count {
    font-size: 0.75rem;
    color: ${props => props.theme.colors.textSecondary};
    background: ${props => props.theme.colors.background};
    padding: 2px 8px;
    border-radius: 10px;
    margin-left: 4px;
  }
`;

// 清空按钮
const ClearButton = styled.button<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textSecondary};
  background: transparent;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.error};
    border-color: ${props => props.theme.colors.error};
    background: ${props => props.theme.colors.error}10;
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
  background: ${props => props.theme.colors.background}80;

  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.colors.border};
    border-radius: 3px;
    
    &:hover {
      background-color: ${props => props.theme.colors.textSecondary};
    }
  }
`;

// 单条日志的样式
const LogEntryLine = styled.div<{ level: LogLevel; theme: ThemeType }>`
  display: flex;
  align-items: center;  /* 垂直居中对齐 */
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  /* 根据日志级别设置从左到右的渐变背景 */
  background: ${({level, theme}) => {
    switch (level) {
      case 'error':
        // 错误：红色渐变，从左边较深到右边透明
        return `linear-gradient(to right, ${theme.colors.error}20 0%, ${theme.colors.error}08 80%, ${theme.colors.elementBg} 100%)`;
      case 'warn':
        // 警告：黄色渐变
        return `linear-gradient(to right, ${theme.colors.warning}20 0%, ${theme.colors.warning}08 80%, ${theme.colors.elementBg} 100%)`;
      case 'info':
      default:
        // 信息：主题色渐变
        return `linear-gradient(to right, ${theme.colors.primary}20 0%, ${theme.colors.primary}08 80%, ${theme.colors.elementBg} 100%)`;
    }
  }};

  /* 左侧边框 - 主色，较深 */
  border-left: 4px solid ${({level, theme}) => {
    switch (level) {
      case 'error':
        return theme.colors.error;
      case 'warn':
        return theme.colors.warning;
      case 'info':
      default:
        return theme.colors.primary;
    }
  }};
  
  /* 上、右、下边框 - 使用较浅的颜色（通过 alpha 值降低透明度） */
  border-top: 2px solid ${({level, theme}) => {
    switch (level) {
      case 'error':
        return `${theme.colors.error}30`;  // 30% 透明度
      case 'warn':
        return `${theme.colors.warning}30`;
      case 'info':
      default:
        return `${theme.colors.primary}25`;
    }
  }};
  border-right: 2px solid ${({level, theme}) => {
    switch (level) {
      case 'error':
        return `${theme.colors.error}30`;
      case 'warn':
        return `${theme.colors.warning}30`;
      case 'info':
      default:
        return `${theme.colors.primary}25`;
    }
  }};
  border-bottom: 2px solid ${({level, theme}) => {
    switch (level) {
      case 'error':
        return `${theme.colors.error}30`;
      case 'warn':
        return `${theme.colors.warning}30`;
      case 'info':
      default:
        return `${theme.colors.primary}25`;
    }
  }};
  
  &:hover {
    /* hover 时渐变更明显，中点位置与默认状态保持一致 (80%) */
    background: ${({level, theme}) => {
      switch (level) {
        case 'error':
          return `linear-gradient(to right, ${theme.colors.error}30 0%, ${theme.colors.error}12 80%, ${theme.colors.elementBg} 100%)`;
        case 'warn':
          return `linear-gradient(to right, ${theme.colors.warning}30 0%, ${theme.colors.warning}12 80%, ${theme.colors.elementBg} 100%)`;
        case 'info':
        default:
          return `linear-gradient(to right, ${theme.colors.primary}30 0%, ${theme.colors.primary}12 80%, ${theme.colors.elementBg} 100%)`;
      }
    }};
    
    /* hover 时边框也稍微加深 */
    border-top-color: ${({level, theme}) => {
      switch (level) {
        case 'error':
          return `${theme.colors.error}45`;
        case 'warn':
          return `${theme.colors.warning}45`;
        case 'info':
        default:
          return `${theme.colors.primary}40`;
      }
    }};
    border-right-color: ${({level, theme}) => {
      switch (level) {
        case 'error':
          return `${theme.colors.error}45`;
        case 'warn':
          return `${theme.colors.warning}45`;
        case 'info':
        default:
          return `${theme.colors.primary}40`;
      }
    }};
    border-bottom-color: ${({level, theme}) => {
      switch (level) {
        case 'error':
          return `${theme.colors.error}45`;
        case 'warn':
          return `${theme.colors.warning}45`;
        case 'info':
        default:
          return `${theme.colors.primary}40`;
      }
    }};
  }
`;

// 日志图标容器 - 左侧垂直居中，图标更大
const LogIcon = styled.div<{ level: LogLevel; theme: ThemeType }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  
  .MuiSvgIcon-root {
    font-size: 1.5rem;  /* 图标更大 */
    ${({level, theme}) => {
      switch (level) {
        case 'error':
          return css`color: ${theme.colors.error};`;
        case 'warn':
          return css`color: ${theme.colors.warning};`;
        case 'info':
        default:
          return css`color: ${theme.colors.primary};`;
      }
    }}
  }
`;

// 日志消息样式 - 字号大、字体粗
const LogMessage = styled.span<{ theme: ThemeType }>`
  flex: 1;
  color: ${props => props.theme.colors.text};
  word-break: break-word;
  white-space: pre-wrap;
  font-size: 16px;   /* 字号更大 */
  font-weight: 600;  /* 字体加粗，600 比 bolder 更可控 */
  text-align: left;
`;

// 时间戳样式 - 放在最右边
const LogTimestamp = styled.span<{ theme: ThemeType }>`
  flex-shrink: 0;
  font-size: 1rem;
  color: ${props => props.theme.colors.textDisabled};
  font-weight: bold;
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

/**
 * 解析后端日志消息，提取时间戳和正文
 * 后端格式: "[HH:MM:SS][LEVEL] message" 或 "[HH:MM:SS][LEVEL]  message"
 * 返回: { timestamp: string, content: string }
 */
const parseLogMessage = (message: string): { timestamp: string; content: string } => {
    // 正则匹配: [时间][级别] 正文
    // 例如: "[14:30:25][INFO]  购买英雄成功" -> timestamp="14:30:25", content="购买英雄成功"
    const regex = /^\[([^\]]+)\]\[[^\]]+\]\s*/;
    const match = message.match(regex);
    
    if (match) {
        return {
            timestamp: match[1],           // 提取时间部分
            content: message.slice(match[0].length)  // 去掉前缀后的正文
        };
    }
    
    // 如果不匹配格式，使用当前时间，原消息作为正文
    return {
        timestamp: new Date().toLocaleTimeString(),
        content: message
    };
};

export const LogPanel: React.FC<LogPanelProps> = ({isVisible}) => {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const logPanelRef = useRef<HTMLDivElement | null>(null)
    const [isUserScrollUp, setIsUserScrollUp] = useState(false)

    // 添加一条日志（解析后端格式）
    const addLog = (message: string, level: LogLevel = 'info') => {
        const parsed = parseLogMessage(message);
        const newLog: LogEntry = {
            id: Date.now() + Math.random(),
            timestamp: parsed.timestamp,
            level,
            message: parsed.content
        }
        setLogs(prevLogs => [...prevLogs, newLog]);
    }

    // 清空所有日志
    const clearLogs = () => {
        setLogs([]);
    }

    // 监听 IPC 消息以添加日志
    useEffect(() => {
        let cleanup = () => {};
        
        if (window.ipc?.on) {
            const handleLogMessage = (logData: { message: string, level?: LogLevel }) => {
                if (logData) {
                    addLog(logData.message, logData.level || 'info');
                } else {
                    console.warn("Received invalid log data from IPC:", logData);
                }
            };
            try {
                cleanup = window.ipc.on('log-message', handleLogMessage)
                addLog('日志监听器已就绪');
            } catch (error) {
                console.error('设置IPC监听失败', error)
                addLog('日志监听器启动失败！', 'error')
            }
        } else {
            console.warn('IPC listener for logs not available.');
            addLog('无法连接到后端日志通道', 'warn');
        }
        return cleanup;
    }, []);

    // 日志自动滚动逻辑：新日志来时自动滚到底部（除非用户手动上滚）
    useEffect(() => {
        const logPanel = logPanelRef.current
        if (logPanel && !isUserScrollUp) {
            logPanel.scrollTop = logPanel.scrollHeight
        }
    }, [logs, isUserScrollUp]);

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