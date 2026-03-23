import styled from "styled-components";
import { ThemeType } from "../../styles/theme.ts";
import DecisionChain from "../debug/DecisionChain.tsx";
import MemoryChart from "../debug/MemoryChart.tsx";
import { useState, useEffect } from "react";
import { settingsStore } from "../../stores/settingsStore";

// ===================== 样式组件 =====================

const PageWrapper = styled.div<{ theme: ThemeType }>`
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.large};
    height: 100vh;
    overflow-y: auto;
    transition: background-color 0.3s, color 0.3s;
`;

const PageHeader = styled.h1<{ theme: ThemeType }>`
    margin: 0 0 ${props => props.theme.spacing.medium} 0;
    font-size: ${props => props.theme.fontSizes.large};
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const Description = styled.p<{ theme: ThemeType }>`
    margin: 0 0 ${props => props.theme.spacing.large} 0;
    font-size: ${props => props.theme.fontSizes.small};
    color: ${props => props.theme.colors.textSecondary || '#888'};
    line-height: 1.5;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${props => props.theme.spacing.medium};

    @media (max-width: 1024px) {
        grid-template-columns: 1fr;
    }
`;

const FullWidth = styled.div`
    grid-column: 1 / -1;
`;

const Card = styled.div<{ theme: ThemeType }>`
    background-color: ${props => props.theme.colors.elementBg};
    border-radius: ${props => props.theme.borderRadius};
    border: 1px solid ${props => props.theme.colors.border};
    padding: ${props => props.theme.spacing.medium};
`;

const CardHeader = styled.h3<{ theme: ThemeType }>`
    margin: 0 0 ${props => props.theme.spacing.small} 0;
    font-size: ${props => props.theme.fontSizes.medium};
    color: ${props => props.theme.colors.text};
`;

const ExportButton = styled.button`
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    cursor: pointer;
    margin-left: auto;

    &:hover {
        opacity: 0.85;
    }
`;

const Tip = styled.div<{ theme: ThemeType }>`
    background-color: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
    padding: 0.75rem 1rem;
    border-radius: 0 4px 4px 0;
    margin-bottom: ${props => props.theme.spacing.medium};
    font-size: 0.85rem;
    color: ${props => props.theme.colors.text};
`;

// ===================== 主组件 =====================

export default function DebugDecisionPage() {
    // Beta 反馈按钮可见性
    const [betaEnabled, setBetaEnabled] = useState(settingsStore.getBetaFeaturesEnabled());
    useEffect(() => {
        const unsub = settingsStore.subscribe(s => setBetaEnabled(s.betaFeaturesEnabled));
        return unsub;
    }, []);

    // 导出当前状态为 JSON
    const handleExportJSON = async () => {
        try {
            const [decisionData, memoryStats] = await Promise.all([
                window.decision.getLatest(),
                window.memory.getStats(),
            ]);

            const exportData = {
                timestamp: Date.now(),
                decision: decisionData,
                memory: memoryStats,
                userAgent: navigator.userAgent,
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `debug-decision-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('导出失败:', err);
        }
    };

    return (
        <PageWrapper>
            <PageHeader>
                🔬 决策 Debug 面板
                <ExportButton onClick={handleExportJSON}>导出 JSON</ExportButton>
                {betaEnabled && (
                    <a
                        href={`mailto:tft-helper-feedback@example.com?subject=TFT Helper Beta Feedback&body=请描述你的问题或建议。\n\nApp Version: (版本号请在设置页或关于页查看)`}
                        style={{ marginLeft: 12 }}
                    >
                        <button style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1rem', cursor: 'pointer' }}>
                            反馈 Beta 问题
                        </button>
                    </a>
                )}
            </PageHeader>

            <Description>
                实时查看 RuleBasedDecisionEngine 的决策推理链路和后端内存使用情况。
                数据每 500ms 推送更新，可用于离线分析和问题排查。
            </Description>

            <Tip>
                💡 <strong>提示</strong>：决策数据在每次 generatePlan() 调用时更新。内存数据可通过"开始"按钮实时监控。
                点击"导出 JSON"可保存当前快照供离线分析。
            </Tip>

            <Grid>
                {/* 决策链路 */}
                <FullWidth>
                    <DecisionChain />
                </FullWidth>

                {/* 内存监控 */}
                <FullWidth>
                    <MemoryChart />
                </FullWidth>

                {/* 快捷操作 */}
                <Card>
                    <CardHeader>🛠️ 快捷操作</CardHeader>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <button
                            onClick={() => window.location.hash = '/debug'}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                border: '1px solid #3b82f6',
                                background: 'transparent',
                                color: '#3b82f6',
                                cursor: 'pointer',
                            }}
                        >
                            返回 Debug 主页
                        </button>
                        <button
                            onClick={() => window.location.hash = '/settings'}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                border: '1px solid #6b7280',
                                background: 'transparent',
                                color: '#6b7280',
                                cursor: 'pointer',
                            }}
                        >
                            设置
                        </button>
                    </div>
                </Card>

                {/* 使用说明 */}
                <Card>
                    <CardHeader>📖 使用说明</CardHeader>
                    <ul style={{ margin: '0.5rem 0 0 1rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
                        <li><strong>决策链路</strong>：显示当前游戏状态下引擎生成的所有行动计划（plans）</li>
                        <li><strong>优先级</strong>：数字越高优先执行（100=必须，90+=高，70+=中）</li>
                        <li><strong>内存图表</strong>：实时显示 RSS 和 Heap 使用趋势</li>
                        <li><strong>导出 JSON</strong>：保存当前状态快照，用于离线分析</li>
                    </ul>
                </Card>
            </Grid>
        </PageWrapper>
    );
}
