import styled from "styled-components";
import { ThemeType } from "../../styles/theme.ts";
import { useState, useEffect, useCallback } from "react";
import { settingsStore } from "../../stores/settingsStore";

// ===================== 类型定义 =====================

type CollectionMode = "disabled" | "anonymous" | "research";

interface CollectionConfig {
    enabled: boolean;
    mode: CollectionMode;
    endpoint?: string;
}

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
`;

const Section = styled.div<{ theme: ThemeType }>`
    background-color: ${props => props.theme.colors.elementBg};
    border-radius: ${props => props.theme.borderRadius};
    border: 1px solid ${props => props.theme.colors.border};
    padding: ${props => props.theme.spacing.medium};
    margin-bottom: ${props => props.theme.spacing.medium};
`;

const SectionTitle = styled.h2<{ theme: ThemeType }>`
    margin: 0 0 ${props => props.theme.spacing.small} 0;
    font-size: ${props => props.theme.fontSizes.medium};
    color: ${props => props.theme.colors.text};
`;

const SectionDesc = styled.p<{ theme: ThemeType }>`
    margin: 0 0 ${props => props.theme.spacing.small} 0;
    font-size: ${props => props.theme.fontSizes.small};
    color: ${props => props.theme.colors.textSecondary || '#888'};
    line-height: 1.5;
`;

const RadioGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const RadioOption = styled.label<{ $selected: boolean; theme: ThemeType }>`
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    border: 1px solid ${props => props.$selected ? props.theme.colors.primary : props.theme.colors.border};
    background-color: ${props => props.$selected ? 'rgba(59, 130, 246, 0.1)' : 'transparent'};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background-color: ${props => props.$selected ? 'rgba(59, 130, 246, 0.15)' : props.theme.colors.background || '#1a1a2e'};
    }
`;

const RadioInput = styled.input`
    margin-top: 0.2rem;
    accent-color: #3b82f6;
`;

const RadioContent = styled.div`
    flex: 1;
`;

const RadioTitle = styled.div<{ theme: ThemeType }>`
    font-weight: 600;
    font-size: 0.9rem;
    color: ${props => props.theme.colors.text};
    margin-bottom: 0.25rem;
`;

const RadioDesc = styled.div<{ theme: ThemeType }>`
    font-size: 0.8rem;
    color: ${props => props.theme.colors.textSecondary || '#888'};
    line-height: 1.4;
`;

const WarningBox = styled.div`
    background-color: rgba(245, 158, 11, 0.1);
    border-left: 3px solid #f59e0b;
    padding: 0.75rem 1rem;
    border-radius: 0 4px 4px 0;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #f59e0b;
`;

const SaveButton = styled.button<{ theme: ThemeType }>`
    background-color: ${props => props.theme.colors.primary};
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
    cursor: pointer;
    margin-top: ${props => props.theme.spacing.small};
    transition: opacity 0.2s;

    &:hover {
        opacity: 0.85;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' }>`
    padding: 0.5rem 1rem;
    border-radius: 4px;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    background-color: ${props => props.$type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
    color: ${props => props.$type === 'success' ? '#10b981' : '#ef4444'};
`;

const DataList = styled.ul`
    margin: 0.5rem 0 0 1rem;
    padding: 0;
    font-size: 0.85rem;
    color: ${props => props.theme.colors.textSecondary || '#888'};
    
    li {
        margin-bottom: 0.25rem;
    }
`;

// ===================== 主组件 =====================

export default function DataPrivacySettingsPage() {
    const [config, setConfig] = useState<CollectionConfig>({
        enabled: false,
        mode: "disabled",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [betaEnabled, setBetaEnabled] = useState(settingsStore.getBetaFeaturesEnabled());
    const [showConsent, setShowConsent] = useState(false);

    // 订阅 betaFeaturesEnabled 变化
    useEffect(() => {
        const unsub = settingsStore.subscribe((s) => setBetaEnabled(s.betaFeaturesEnabled));
        return unsub;
    }, []);

    // 加载当前配置
    useEffect(() => {
        // TODO: 从 settingsStore 加载配置
        // const savedConfig = await window.settings.get('dataCollection');
        // if (savedConfig) setConfig(savedConfig);
    }, []);

    // 处理模式变更
    const handleModeChange = useCallback((mode: CollectionMode) => {
        setConfig(prev => ({
            ...prev,
            mode,
            enabled: mode !== "disabled",
        }));
        setSaveMessage(null);
    }, []);

    // 保存配置
    const handleSave = useCallback(async () => {
        setIsSaving(true);
        setSaveMessage(null);

        try {
            // TODO: 保存到 settingsStore
            // await window.settings.set('dataCollection', config);

            setSaveMessage({
                text: config.enabled ? '已启用数据收集' : '已禁用数据收集',
                type: 'success',
            });
        } catch (error) {
            setSaveMessage({
                text: '保存失败，请重试',
                type: 'error',
            });
        } finally {
            setIsSaving(false);
        }
    }, [config]);

    return (
        <PageWrapper>
            <PageHeader>🔒 数据隐私设置</PageHeader>

            {/* Beta 功能开关 */}
            <Section>
                <SectionTitle>Beta 功能体验</SectionTitle>
                <SectionDesc>
                    你可以选择加入 Beta 计划，体验最新的调试和分析工具。启用后，部分调试数据可能用于改进产品，仅在你同意后收集。
                </SectionDesc>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontWeight: 600 }}>
                        <input
                            type="checkbox"
                            checked={betaEnabled}
                            onChange={e => {
                                if (!e.target.checked) {
                                    settingsStore.setBetaFeaturesEnabled(false);
                                } else {
                                    setShowConsent(true);
                                }
                            }}
                            style={{ marginRight: 8 }}
                        />
                        启用 Beta 功能（调试与反馈）
                    </label>
                </div>
            </Section>

            {/* 选择收集模式 */}
            <Section>
                <SectionTitle>数据收集模式</SectionTitle>
                <SectionDesc>
                    选择是否匿名上传决策数据以帮助改进引擎算法。您的隐私很重要——我们不会收集任何个人身份信息。
                </SectionDesc>

                <RadioGroup>
                    <RadioOption $selected={config.mode === "disabled"} onClick={() => handleModeChange("disabled")}>
                        <RadioInput
                            type="radio"
                            name="mode"
                            checked={config.mode === "disabled"}
                            onChange={() => handleModeChange("disabled")}
                        />
                        <RadioContent>
                            <RadioTitle>🚫 不上报</RadioTitle>
                            <RadioDesc>
                                完全禁用数据收集。所有数据仅保存在本地，不会上传到任何服务器。
                            </RadioDesc>
                        </RadioContent>
                    </RadioOption>

                    <RadioOption $selected={config.mode === "anonymous"} onClick={() => handleModeChange("anonymous")}>
                        <RadioInput
                            type="radio"
                            name="mode"
                            checked={config.mode === "anonymous"}
                            onChange={() => handleModeChange("anonymous")}
                        />
                        <RadioContent>
                            <RadioTitle>📊 匿名上报</RadioTitle>
                            <RadioDesc>
                                上传匿名化后的决策数据（优先级、类型哈希），用于统计分析和算法优化。
                                数据已脱敏，无法追溯到您的账号或设备。
                            </RadioDesc>
                        </RadioContent>
                    </RadioOption>

                    <RadioOption $selected={config.mode === "research"} onClick={() => handleModeChange("research")}>
                        <RadioInput
                            type="radio"
                            name="mode"
                            checked={config.mode === "research"}
                            onChange={() => handleModeChange("research")}
                        />
                        <RadioContent>
                            <RadioTitle>🔬 允许科研使用</RadioTitle>
                            <RadioDesc>
                                在匿名上报的基础上，允许将脱敏数据用于学术研究。
                                数据可能与其他玩家的匿名数据一起被分析。
                            </RadioDesc>
                        </RadioContent>
                    </RadioOption>
                </RadioGroup>

                {config.mode !== "disabled" && (
                    <WarningBox>
                        ⚠️ 启用数据收集后，每次对局中的决策数据会被匿名化后上传。
                        您可以随时在此页面禁用。禁用后立即停止收集，但已上传的数据不会被删除。
                    </WarningBox>
                )}
            </Section>

            {/* 数据收集说明 */}
            <Section>
                <SectionTitle>我们收集什么数据？</SectionTitle>
                <SectionDesc>
                    当数据收集启用时，我们会收集以下<strong>匿名化</strong>数据：
                </SectionDesc>
                <DataList>
                    <li>决策类型（已哈希处理，无法还原为具体棋子名）</li>
                    <li>决策优先级（0-100 的数字）</li>
                    <li>游戏阶段（仅保留大阶段，如 "4-*"）</li>
                    <li>血量区间（如 "40" 表示 40-49）</li>
                </DataList>
                <SectionDesc style={{ marginTop: '0.5rem' }}>
                    <strong>我们不收集：</strong>
                </SectionDesc>
                <DataList>
                    <li>棋子名称、阵容配置</li>
                    <li>玩家账号信息、昵称</li>
                    <li>IP 地址、设备标识</li>
                    <li>对局截图、屏幕内容</li>
                </DataList>
            </Section>

            {/* 保存按钮 */}
            <SaveButton onClick={handleSave} disabled={isSaving}>
                {isSaving ? '保存中...' : '保存设置'}
            </SaveButton>

            {saveMessage && (
                <StatusMessage $type={saveMessage.type}>
                    {saveMessage.text}
                </StatusMessage>
            )}
        {/* Beta 功能同意弹窗 */}
        {showConsent && (
            <div style={{
                position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
                background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ background: '#fff', borderRadius: 8, maxWidth: 420, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
                    <h2 style={{ marginTop: 0 }}>Beta 功能体验同意</h2>
                    <p style={{ fontSize: 15, color: '#333', marginBottom: 16 }}>
                        启用 Beta 功能后，部分调试数据（如决策链、内存快照）可能会被匿名收集，用于产品改进和问题排查。<br />
                        <b>不会收集任何个人身份信息。</b><br />
                        你可以随时在本页关闭 Beta 功能，关闭后立即停止收集。
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <button
                            onClick={() => setShowConsent(false)}
                            style={{ padding: '0.5rem 1.2rem', borderRadius: 4, border: '1px solid #ccc', background: '#f5f5f5', color: '#333', cursor: 'pointer' }}
                        >取消</button>
                        <button
                            onClick={() => {
                                settingsStore.setBetaFeaturesEnabled(true);
                                setShowConsent(false);
                            }}
                            style={{ padding: '0.5rem 1.2rem', borderRadius: 4, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}
                        >同意并启用</button>
                    </div>
                </div>
            </div>
        )}
    </PageWrapper>
);
}
