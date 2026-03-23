import styled from "styled-components";
import { ThemeType } from "../../styles/theme.ts";
import { useEffect, useState, useCallback, useRef } from "react";

// ===================== 类型定义 =====================

interface MemoryStats {
    timestamp: number;
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
}

interface MemorySample {
    timestamp: number;
    rssMB: number;
    heapUsedMB: number;
}

// ===================== 常量 =====================

const MAX_SAMPLES = 60; // 保留最近 60 个样本（30 秒 @ 500ms interval）

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

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
`;

const StatCard = styled.div<{ theme: ThemeType }>`
    background-color: ${props => props.theme.colors.background || '#1a1a2e'};
    border-radius: 4px;
    padding: 0.5rem;
    text-align: center;
`;

const StatLabel = styled.div<{ theme: ThemeType }>`
    font-size: 0.75rem;
    color: ${props => props.theme.colors.textSecondary || '#888'};
    margin-bottom: 0.25rem;
`;

const StatValue = styled.div<{ $color?: string }>`
    font-family: monospace;
    font-size: 1.1rem;
    font-weight: 600;
    color: ${props => props.$color || '#10b981'};
`;

const ChartContainer = styled.div`
    height: 100px;
    background-color: #1a1a2e;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
`;

const ChartCanvas = styled.canvas`
    width: 100%;
    height: 100%;
`;

const NoData = styled.div<{ theme: ThemeType }>`
    text-align: center;
    padding: 2rem;
    color: ${props => props.theme.colors.textSecondary || '#888'};
    font-style: italic;
`;

// ===================== 辅助函数 =====================

function bytesToMB(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1);
}

function bytesToMBNum(bytes: number): number {
    return bytes / 1024 / 1024;
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
}

function getMemoryColor(usedMB: number): string {
    if (usedMB > 500) return '#ef4444';   // 红色：危险
    if (usedMB > 300) return '#f59e0b';   // 黄色：警告
    return '#10b981';                     // 绿色：正常
}

// ===================== 主组件 =====================

export default function MemoryChart() {
    const [currentStats, setCurrentStats] = useState<MemoryStats | null>(null);
    const [samples, setSamples] = useState<MemorySample[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // 获取当前内存统计
    const fetchStats = useCallback(async () => {
        try {
            const stats = await window.memory.getStats();
            setCurrentStats(stats);
            addSample(stats);
        } catch (err) {
            console.error('获取内存统计失败:', err);
        }
    }, []);

    // 添加样本到历史
    const addSample = useCallback((stats: MemoryStats) => {
        const sample: MemorySample = {
            timestamp: stats.timestamp,
            rssMB: bytesToMBNum(stats.rss),
            heapUsedMB: bytesToMBNum(stats.heapUsed),
        };
        setSamples(prev => {
            const newSamples = [...prev, sample];
            if (newSamples.length > MAX_SAMPLES) {
                return newSamples.slice(-MAX_SAMPLES);
            }
            return newSamples;
        });
    }, []);

    // 开始/停止监控
    const toggleMonitoring = useCallback(() => {
        if (isMonitoring) {
            // 停止监控
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            setIsMonitoring(false);
        } else {
            // 开始监控
            unsubscribeRef.current = window.memory.onSampleEvent((stats: MemoryStats) => {
                setCurrentStats(stats);
                addSample(stats);
            });
            setIsMonitoring(true);
            fetchStats(); // 立即获取一次
        }
    }, [isMonitoring, addSample, fetchStats]);

    // 清理
    useEffect(() => {
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    // 绘制图表
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || samples.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const padding = 4;

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 计算 Y 轴范围
        const maxRss = Math.max(...samples.map(s => s.rssMB));
        const maxHeap = Math.max(...samples.map(s => s.heapUsedMB));
        const maxY = Math.max(maxRss, maxHeap) * 1.1;
        const minY = Math.min(...samples.map(s => s.heapUsedMB)) * 0.9;

        // 绘制网格线
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (height - 2 * padding) * (i / 4);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // 绘制 RSS 曲线
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        samples.forEach((sample, index) => {
            const x = padding + (width - 2 * padding) * (index / (samples.length - 1));
            const y = height - padding - ((sample.rssMB - minY) / (maxY - minY)) * (height - 2 * padding);
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // 绘制 Heap 曲线
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        samples.forEach((sample, index) => {
            const x = padding + (width - 2 * padding) * (index / (samples.length - 1));
            const y = height - padding - ((sample.heapUsedMB - minY) / (maxY - minY)) * (height - 2 * padding);
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

    }, [samples]);

    return (
        <Container>
            <Header>
                📈 内存监控 (Memory)
                <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>
                        {formatTime(currentStats?.timestamp || Date.now())}
                    </span>
                    <button
                        onClick={toggleMonitoring}
                        style={{
                            backgroundColor: isMonitoring ? '#ef4444' : '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                        }}
                    >
                        {isMonitoring ? '停止' : '开始'}
                    </button>
                </span>
            </Header>

            {!currentStats && (
                <NoData>点击"开始"按钮启动内存监控</NoData>
            )}

            {currentStats && (
                <>
                    <StatsGrid>
                        <StatCard>
                            <StatLabel>RSS (总内存)</StatLabel>
                            <StatValue $color={getMemoryColor(bytesToMBNum(currentStats.rss))}>
                                {bytesToMB(currentStats.rss)} MB
                            </StatValue>
                        </StatCard>
                        <StatCard>
                            <StatLabel>Heap Used</StatLabel>
                            <StatValue $color={getMemoryColor(bytesToMBNum(currentStats.heapUsed))}>
                                {bytesToMB(currentStats.heapUsed)} MB
                            </StatValue>
                        </StatCard>
                        <StatCard>
                            <StatLabel>External</StatLabel>
                            <StatValue>{bytesToMB(currentStats.external)} MB</StatValue>
                        </StatCard>
                    </StatsGrid>

                    <ChartContainer>
                        <ChartCanvas ref={canvasRef} width={400} height={100} />
                    </ChartContainer>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: '#888' }}>
                        <span>🔵 RSS</span>
                        <span>🟢 Heap Used</span>
                        <span>样本: {samples.length}/{MAX_SAMPLES}</span>
                    </div>
                </>
            )}
        </Container>
    );
}
