import React, {useState, useEffect, useRef} from 'react';
import styled, {css} from 'styled-components';
import {ThemeType} from '../styles/theme'; // 确保主题类型路径正确

// 引入图标
import InfoIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import WarningIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorIcon from '@mui/icons-material/ErrorOutline';

// -------------------------------------------------------------------
// ✨ 类型定义 ✨ (从 HomePage 移到这里)
// -------------------------------------------------------------------
type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
    id: number;
    timestamp: string;
    level: LogLevel;
    message: string;
}

//  样式组件定义

const LogPanelWrapper = styled.div<{ $isVisible: boolean; theme: ThemeType }>`
  flex-shrink: 0;
  max-height: ${props => props.$isVisible ? '300px' : '0px'};
  overflow: hidden;
  background-color: ${props => props.theme.colors.elementBg};
  border-top: 1px solid ${props => props.theme.colors.border};
  transition: max-height 0.3s ease-in-out;
`;

const LogPanelContent = styled.div<{ theme: ThemeType }>`
  height: 300px;
  padding: ${props => props.theme.spacing.medium};
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.background};
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${props => props.theme.colors.border};
    border-radius: 3px;
  }
`;

const LogEntryLine = styled.div<{ level: LogLevel; theme: ThemeType }>`
  padding: 0.2rem 0;
  white-space: pre-wrap;
  word-break: break-all;

  .timestamp {
    color: ${props => props.theme.colors.textDisabled};
    margin-right: ${props => props.theme.spacing.small};
  }

  .level {
    font-weight: 600;
    margin-right: ${props => props.theme.spacing.small};
    display: inline-block;
    width: 45px;
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

  .message {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const IconContainer = styled.div` // 图标容器可以放在这里
  display: flex;
  align-items: center;
`;

interface LogPanelProps {
    isVisible: boolean;//   控制整个组件的显隐逻辑
}

export const LogPanel: React.FC<LogPanelProps> = ({isVisible}) => {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const logPanelRef = useRef<HTMLDivElement | null>(null)
    //  添加log
    const addLog = (message: string, level: LogLevel = 'info') => {
        //  创建一条新的日志
        const newLog: LogEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            level,
            message
        }
        setLogs(prevLogs => [...prevLogs, newLog]);
    }
    //  监听IPC消息以添加日志
    useEffect(() => {
        let cleanup = () => {
        }; // 默认的空清理函数
        if (window.ipc?.on) {
            try {
                cleanup = window.ipc.on('log-message', addLog)
                addLog('日志监听器启动');
            } catch (error) {
                console.error('设置IPC监听失败', error)
                addLog('日志监听器启动失败！请查看控制台')
            }
        } else {
            console.warn('IPC listener for logs not available.');
            addLog('无法连接到后端日志通道。', 'warn');
        }
        return cleanup;
    }, []);

    //  日志自动滚动逻辑
    useEffect(() => {
        if (logPanelRef.current) {
            logPanelRef.current!.scrollTop = logPanelRef.current!.scrollHeight
        }
    }, [logs]);

    return (
        <LogPanelWrapper $isVisible={isVisible}>
            <LogPanelContent ref={logPanelRef}>
                {logs.map((log) => (
                    <LogEntryLine key={log.id} level={log.level}>
                        <span className="timestamp">{log.timestamp}</span>
                        <span className="level">[{log.level.toUpperCase()}]</span>
                        <span className="message">{log.message}</span>
                    </LogEntryLine>
                ))}
            </LogPanelContent>
        </LogPanelWrapper>
    )
}