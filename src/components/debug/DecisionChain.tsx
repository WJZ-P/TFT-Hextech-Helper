import styled from "styled-components";
import { ThemeType } from "../../styles/theme.ts";
import { useEffect, useState, useCallback } from "react";

// ===================== 类型定义 =====================

interface DecisionPlan {
    type: string;
    priority: number;
    reason: string;
    payload: Record<string, unknown>;
    tick: number;
}

interface DecisionChainData {
    plans: DecisionPlan[];
    reasoning: string[];
    scores: number[];
    timestamp: number;
}

// ===================== 样式组件 =====================

const Container = styled.div<{ theme: ThemeType }>`
    background-color: ${props => props.theme.colors.elementBg};
    border-radius: ${props => props.theme.borderRadius};
    border: 1px solid ${props => props.theme.colors.border};
    padding: ${props => props.theme.spacing.medium};
    margin-bottom: ${props => props.theme.spacing.medium};
`;

const Header = styled.h3<{ theme: ThemeType }>`
    margin: 0 0 ${props => props.theme.spacing.small} 0;
    font-size: ${props => props.theme.fontSizes.medium};
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const Timestamp = styled.span<{ theme: ThemeType }>`
    font-size: ${props => props.theme.fontSizes.small};
    color: ${props => props.theme.colors.textSecondary || '#888'};
    margin-left: auto;
`;

const PlanList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const PlanItem = styled.div<{ $priority: number; theme: ThemeType }>`
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 4px;
    background-color: ${props => props.theme.colors.background || '#1a1a2e'};
    border-left: 3px solid ${props => {
        if (props.$priority >= 90) return '#10b981';    // 高优先级：绿色
        if (props.$priority >= 70) return '#f59e0b';    // 中优先级：黄色
        return '#6b7280';                                // 低优先级：灰色
    }};
`;

const PlanPriority = styled.span<{ $priority: number }>`
    font-family: monospace;
    font-size: 0.85rem;
    font-weight: 600;
    color: ${props => {
        if (props.$priority >= 90) return '#10b981';
        if (props.$priority >= 70) return '#f59e0b';
        return '#6b7280';
    }};
    min-width: 2.5rem;
`;

const PlanType = styled.span<{ theme: ThemeType }>`
    font-family: monospace;
    font-size: 0.85rem;
    font-weight: 500;
    color: ${props => props.theme.colors.primary};
    min-width: 5rem;
`;

const PlanReason = styled.span<{ theme: ThemeType }>`
    font-size: 0.85rem;
    color: ${props => props.theme.colors.text};
    flex: 1;
    word-break: break-word;
`;

const EmptyState = styled.div<{ theme: ThemeType }>`
    text-align: center;
    padding: 2rem;
    color: ${props => props.theme.colors.textSecondary || '#888'};
    font-style: italic;
`;

const RefreshButton = styled.button<{ theme: ThemeType }>`
    background-color: ${props => props.theme.colors.primary};
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
        opacity: 0.85;
    }
`;

// ===================== 辅助函数 =====================

function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour12: false });
}

function getPriorityLabel(priority: number): string {
    if (priority >= 100) return '必须';
    if (priority >= 90) return '高';
    if (priority >= 70) return '中';
    return '低';
}

// ===================== 主组件 =====================

export default function DecisionChain() {
    const [chainData, setChainData] = useState<DecisionChainData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 获取最新决策链路数据
    const fetchLatest = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await window.decision.getLatest();
            setChainData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '获取决策数据失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 监听决策链路更新事件
    useEffect(() => {
        const unsubscribe = window.decision.onChainUpdated((data: DecisionChainData) => {
            setChainData(data);
        });

        // 初始加载
        fetchLatest();

        return unsubscribe;
    }, [fetchLatest]);

    const formatTime = (ts: number) => formatTimestamp(ts);

    return (
        <Container>
            <Header>
                📊 决策链路 (Decision Chain)
                <Timestamp>{chainData ? formatTime(chainData.timestamp) : '--:--:--'}</Timestamp>
                <RefreshButton onClick={fetchLatest} disabled={isLoading}>
                    {isLoading ? '刷新中...' : '刷新'}
                </RefreshButton>
            </Header>

            {error && (
                <EmptyState>⚠️ {error}</EmptyState>
            )}

            {!error && !chainData && !isLoading && (
                <EmptyState>暂无决策数据</EmptyState>
            )}

            {!error && chainData && chainData.plans.length === 0 && (
                <EmptyState>当前无活跃决策</EmptyState>
            )}

            {!error && chainData && chainData.plans.length > 0 && (
                <PlanList>
                    {chainData.plans.map((plan, index) => (
                        <PlanItem key={`${plan.tick}-${index}`} $priority={plan.priority}>
                            <PlanPriority $priority={plan.priority}>
                                {getPriorityLabel(plan.priority)} {plan.priority}
                            </PlanPriority>
                            <PlanType>{plan.type}</PlanType>
                            <PlanReason>{plan.reason}</PlanReason>
                        </PlanItem>
                    ))}
                </PlanList>
            )}
        </Container>
    );
}
