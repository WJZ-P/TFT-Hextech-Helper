import { useEffect, useState, type ReactNode } from "react";
import styled from "styled-components";
import { toast } from "../toast/toast-core";
import type { ActionPlan, DecisionContext, ObservedState } from "../../../src-backend/core/types";
import type {
    AndroidExecutionStep,
    AndroidNamedPoint,
} from "../../../src-backend/adapters/AndroidActionPlanner";
import type {
    AndroidSimulationResult,
    AndroidSimulationScenario,
} from "../../../src-backend/services/AndroidSimulationRunner";
import type {
    AndroidRecognitionReplayFixture,
    AndroidRecognitionReplayResult,
    RecognitionSource,
} from "../../../src-backend/services/RecognitionReplayTypes";

type StrategyPreset = NonNullable<DecisionContext["strategyPreset"]>;

const DEFAULT_STATE: ObservedState = {
    timestamp: Date.now(),
    client: "ANDROID" as ObservedState["client"],
    target: "ANDROID_EMULATOR",
    stageText: "3-2",
    stageType: "PVP" as ObservedState["stageType"],
    level: 6,
    currentXp: 0,
    totalXp: 20,
    gold: 50,
    hp: 60,
    bench: [],
    board: [],
    shop: [
        { slot: 0, cost: null, unit: null },
        { slot: 1, cost: null, unit: null },
        { slot: 2, cost: null, unit: null },
        { slot: 3, cost: null, unit: null },
        { slot: 4, cost: null, unit: null },
    ],
    items: [],
};

const PRESET_OPTIONS: StrategyPreset[] = ["STANDARD", "FAST8", "REROLL"];

const Section = styled.div`
  background: linear-gradient(145deg, rgba(12, 24, 31, 0.92), rgba(20, 42, 48, 0.9));
  border: 1px solid rgba(126, 189, 194, 0.18);
  border-radius: 18px;
  padding: 1.1rem;
  margin-bottom: 1rem;
  box-shadow: 0 16px 28px rgba(0, 0, 0, 0.16);
`;

const Heading = styled.h3`
  margin: 0 0 0.35rem 0;
  font-size: 1.2rem;
  color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
  margin: 0 0 0.9rem 0;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.5;
  font-size: ${props => props.theme.fontSizes.small};
`;

const ScenarioBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-bottom: 0.9rem;
`;

const ScenarioButton = styled.button<{ $active?: boolean }>`
  border-radius: 999px;
  border: 1px solid ${props => props.$active ? "rgba(126, 189, 194, 0.55)" : props.theme.colors.border};
  background: ${props => props.$active ? "rgba(55, 121, 127, 0.35)" : "rgba(255, 255, 255, 0.02)"};
  color: ${props => props.theme.colors.text};
  padding: 0.45rem 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: ${props => props.theme.fontSizes.small};

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(126, 189, 194, 0.42);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.9rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.9rem;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.fontSizes.small};
`;

const TextInput = styled.input`
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  background: rgba(5, 15, 22, 0.55);
  color: ${props => props.theme.colors.text};
  padding: 0.65rem 0.8rem;
  font-size: ${props => props.theme.fontSizes.small};
  outline: none;

  &:focus {
    border-color: rgba(126, 189, 194, 0.55);
  }
`;

const SelectInput = styled.select`
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  background: rgba(5, 15, 22, 0.55);
  color: ${props => props.theme.colors.text};
  padding: 0.65rem 0.8rem;
  font-size: ${props => props.theme.fontSizes.small};
  outline: none;
`;

const JsonArea = styled.textarea`
  width: 100%;
  min-height: 360px;
  border-radius: 14px;
  border: 1px solid ${props => props.theme.colors.border};
  background: rgba(5, 15, 22, 0.78);
  color: ${props => props.theme.colors.text};
  padding: 0.85rem;
  font-size: 0.82rem;
  font-family: "Cascadia Code", "Consolas", monospace;
  line-height: 1.5;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: rgba(126, 189, 194, 0.55);
  }
`;

const ActionBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 0.9rem;
`;

const PrimaryButton = styled.button`
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #3f7d81, #2d5b6d);
  color: #ffffff;
  font-weight: 600;
  padding: 0.7rem 1rem;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    opacity: 0.95;
  }

  &:disabled {
    opacity: 0.55;
    cursor: wait;
    transform: none;
  }
`;

const SecondaryButton = styled.button`
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.border};
  background: rgba(255, 255, 255, 0.03);
  color: ${props => props.theme.colors.text};
  padding: 0.7rem 1rem;
  cursor: pointer;
`;

const HelperText = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.fontSizes.small};
  line-height: 1.5;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.65rem;
  margin-bottom: 0.85rem;
`;

const SummaryCard = styled.div`
  border-radius: 14px;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(126, 189, 194, 0.12);
`;

const SummaryLabel = styled.div`
  font-size: 0.74rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 0.2rem;
`;

const SummaryValue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

const BlockTitle = styled.h4`
  margin: 0 0 0.55rem 0;
  color: ${props => props.theme.colors.text};
  font-size: 0.98rem;
`;

const UnitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.55rem;
`;

const UnitCard = styled.div`
  border-radius: 12px;
  padding: 0.65rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(126, 189, 194, 0.12);
`;

const UnitName = styled.div`
  color: ${props => props.theme.colors.text};
  font-weight: 600;
  margin-bottom: 0.2rem;
`;

const UnitMeta = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.78rem;
  line-height: 1.4;
`;

const EmptyState = styled.div`
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.82rem;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const ListItem = styled.div`
  border-radius: 12px;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(126, 189, 194, 0.12);
`;

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.35rem;
`;

const Badge = styled.span<{ $tone?: "default" | "warn" }>`
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
  font-size: 0.72rem;
  background: ${props => props.$tone === "warn" ? "rgba(235, 162, 80, 0.18)" : "rgba(126, 189, 194, 0.18)"};
  color: ${props => props.$tone === "warn" ? "#f5c781" : "#b4e8eb"};
  white-space: nowrap;
`;

const ListTitle = styled.div`
  color: ${props => props.theme.colors.text};
  font-weight: 600;
  line-height: 1.4;
`;

const Muted = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.8rem;
  line-height: 1.45;
`;

const WarningList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 0.75rem;
`;

function toPrettyJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

function formatPoint(point?: AndroidNamedPoint): string {
    if (!point) {
        return "未绑定坐标";
    }

    return `${point.label} (${point.point.x.toFixed(3)}, ${point.point.y.toFixed(3)})`;
}

function formatPlan(plan: ActionPlan): string {
    return `${plan.type} · P${plan.priority} · ${plan.reason}`;
}

function formatStep(step: AndroidExecutionStep): string {
    if (step.fromPoint && step.toPoint) {
        return `${formatPoint(step.fromPoint)} -> ${formatPoint(step.toPoint)}`;
    }

    if (step.targetPoint) {
        return formatPoint(step.targetPoint);
    }

    return "无额外坐标";
}

function formatRecognitionSource(source: RecognitionSource): string {
    switch (source) {
        case "OCR":
            return "OCR 直中";
        case "TEMPLATE":
            return "模板兜底";
        default:
            return "未命中";
    }
}

function getFileName(filePath?: string): string {
    if (!filePath) {
        return "未绑定素材";
    }

    const parts = filePath.split(/[\\/]/);
    return parts[parts.length - 1] || filePath;
}

function buildContext(
    targetsText: string,
    preset: StrategyPreset,
    hpThresholdText: string
): DecisionContext {
    const targetChampionNames = targetsText
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    const hpThreshold = Number(hpThresholdText);

    return {
        targetChampionNames,
        strategyPreset: preset,
        stabilizeHpThreshold: Number.isFinite(hpThreshold) ? hpThreshold : undefined,
    };
}

function renderUnitCards(
    units: Array<{ id: string; name: string; star: number; location?: string; cost?: number; items: string[] }>
): ReactNode {
    if (units.length === 0) {
        return <EmptyState>当前没有可显示的单位。</EmptyState>;
    }

    return (
        <UnitGrid>
            {units.map((unit) => (
                <UnitCard key={`${unit.id}-${unit.location ?? unit.name}`}>
                    <UnitName>{unit.name}</UnitName>
                    <UnitMeta>{unit.location ?? "未标记位置"}</UnitMeta>
                    <UnitMeta>{unit.star} 星 · {unit.cost ?? "?"} 费</UnitMeta>
                    <UnitMeta>{unit.items.length > 0 ? `装备: ${unit.items.join(" / ")}` : "装备: 无"}</UnitMeta>
                </UnitCard>
            ))}
        </UnitGrid>
    );
}

export default function AndroidSimulatorPanel() {
    const [scenarios, setScenarios] = useState<AndroidSimulationScenario[]>([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
    const [stateJson, setStateJson] = useState<string>(toPrettyJson(DEFAULT_STATE));
    const [targetsText, setTargetsText] = useState<string>("安妮,辛德拉");
    const [preset, setPreset] = useState<StrategyPreset>("REROLL");
    const [hpThresholdText, setHpThresholdText] = useState<string>("35");
    const [result, setResult] = useState<AndroidSimulationResult | null>(null);
    const [isLoadingScenarios, setIsLoadingScenarios] = useState<boolean>(false);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [recognitionFixtures, setRecognitionFixtures] = useState<AndroidRecognitionReplayFixture[]>([]);
    const [selectedRecognitionId, setSelectedRecognitionId] = useState<string>("");
    const [recognitionResult, setRecognitionResult] = useState<AndroidRecognitionReplayResult | null>(null);
    const [isLoadingRecognitionFixtures, setIsLoadingRecognitionFixtures] = useState<boolean>(false);
    const [isRunningRecognition, setIsRunningRecognition] = useState<boolean>(false);

    useEffect(() => {
        let active = true;

        const loadScenarios = async () => {
            setIsLoadingScenarios(true);
            try {
                const loaded = await window.tft.getAndroidSimulationScenarios();
                if (!active) {
                    return;
                }

                const nextScenarios = Array.isArray(loaded) ? loaded as AndroidSimulationScenario[] : [];
                setScenarios(nextScenarios);

                if (nextScenarios.length > 0) {
                    const first = nextScenarios[0];
                    setSelectedScenarioId(first.id);
                    setStateJson(toPrettyJson(first.state));
                    setTargetsText((first.context.targetChampionNames ?? []).join(","));
                    setPreset(first.context.strategyPreset ?? "REROLL");
                    setHpThresholdText(
                        first.context.stabilizeHpThreshold !== undefined
                            ? String(first.context.stabilizeHpThreshold)
                            : "35"
                    );
                }
            } catch (error: any) {
                toast.error(`加载安卓离线样例失败: ${error?.message ?? error}`);
            } finally {
                if (active) {
                    setIsLoadingScenarios(false);
                }
            }
        };

        const loadRecognitionFixtures = async () => {
            setIsLoadingRecognitionFixtures(true);
            try {
                const loaded = await window.tft.getAndroidRecognitionReplayFixtures();
                if (!active) {
                    return;
                }

                const nextFixtures = Array.isArray(loaded) ? loaded as AndroidRecognitionReplayFixture[] : [];
                setRecognitionFixtures(nextFixtures);

                if (nextFixtures.length > 0) {
                    setSelectedRecognitionId(nextFixtures[0].id);
                }
            } catch (error: any) {
                toast.error(`加载识别回放样例失败: ${error?.message ?? error}`);
            } finally {
                if (active) {
                    setIsLoadingRecognitionFixtures(false);
                }
            }
        };

        void loadScenarios();
        void loadRecognitionFixtures();

        return () => {
            active = false;
        };
    }, []);

    const applyScenario = (scenario: AndroidSimulationScenario) => {
        setSelectedScenarioId(scenario.id);
        setStateJson(toPrettyJson(scenario.state));
        setTargetsText((scenario.context.targetChampionNames ?? []).join(","));
        setPreset(scenario.context.strategyPreset ?? "REROLL");
        setHpThresholdText(
            scenario.context.stabilizeHpThreshold !== undefined
                ? String(scenario.context.stabilizeHpThreshold)
                : "35"
        );
        setResult(null);
    };

    const applyRecognitionFixture = (fixture: AndroidRecognitionReplayFixture) => {
        setSelectedRecognitionId(fixture.id);
        setRecognitionResult(null);
    };

    const runSimulation = async () => {
        setIsRunning(true);
        try {
            const parsedState = JSON.parse(stateJson) as Partial<ObservedState>;
            const context = buildContext(targetsText, preset, hpThresholdText);
            const nextResult = await window.tft.planAndroidSimulation(parsedState, context) as AndroidSimulationResult;
            setResult(nextResult);
            toast.success(`安卓离线回放已生成 ${nextResult.executionPlan.steps.length} 个触控步骤`);
        } catch (error: any) {
            toast.error(`安卓离线回放失败: ${error?.message ?? error}`);
        } finally {
            setIsRunning(false);
        }
    };

    const restoreCurrentScenario = () => {
        const currentScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId);
        if (currentScenario) {
            applyScenario(currentScenario);
            return;
        }

        setStateJson(toPrettyJson(DEFAULT_STATE));
        setResult(null);
    };

    const runRecognitionReplay = async () => {
        if (!selectedRecognitionId) {
            toast.error("请先选择一个识别回放样例");
            return;
        }

        setIsRunningRecognition(true);
        try {
            const nextResult = await window.tft.runAndroidRecognitionReplay(selectedRecognitionId) as AndroidRecognitionReplayResult;
            setRecognitionResult(nextResult);
            toast.success(
                `识别回放完成：${nextResult.summary.championPassedCount}/${nextResult.summary.championCount} 个英雄命中`
            );
        } catch (error: any) {
            toast.error(`识别回放失败: ${error?.message ?? error}`);
        } finally {
            setIsRunningRecognition(false);
        }
    };

    const currentScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;
    const currentSequence = currentScenario?.sequence ?? null;
    const sequenceScenarios = currentSequence
        ? scenarios
            .filter((scenario) => scenario.sequence?.id === currentSequence.id)
            .sort((left, right) => (left.sequence?.index ?? 0) - (right.sequence?.index ?? 0))
        : [];
    const currentRecognitionFixture = recognitionFixtures.find((fixture) => fixture.id === selectedRecognitionId) ?? null;

    return (
        <>
            <Section>
            <Heading>安卓离线模拟面板</Heading>
            <Subtitle>
                这里不依赖模拟器对局，而是直接把“安卓局面 JSON -&gt; 运营决策 -&gt; 触控步骤”整条链路跑一遍。
                现在内置了一条 5 帧的安卓实战时间线，可以直接按回合切换关键帧做回放。
            </Subtitle>

            <ScenarioBar>
                {scenarios.map((scenario) => (
                    <ScenarioButton
                        key={scenario.id}
                        $active={scenario.id === selectedScenarioId}
                        onClick={() => applyScenario(scenario)}
                        title={scenario.description}
                    >
                        {scenario.label}
                    </ScenarioButton>
                ))}
                {isLoadingScenarios && <Badge>样例加载中</Badge>}
            </ScenarioBar>

            {currentScenario && (
                <HelperText>{currentScenario.description}</HelperText>
            )}

            {sequenceScenarios.length > 1 && (
                <>
                    <BlockTitle style={{ marginTop: "0.9rem" }}>
                        对局时间线 {currentSequence?.label ? `· ${currentSequence.label}` : ""}
                    </BlockTitle>
                    <ScenarioBar>
                        {sequenceScenarios.map((scenario) => (
                            <ScenarioButton
                                key={`${scenario.id}-sequence`}
                                $active={scenario.id === selectedScenarioId}
                                onClick={() => applyScenario(scenario)}
                            >
                                {scenario.sequence?.index ?? "?"}/{scenario.sequence?.total ?? "?"} · {scenario.state.stageText}
                            </ScenarioButton>
                        ))}
                    </ScenarioBar>
                </>
            )}

            <FormGrid>
                <Field>
                    目标棋子
                    <TextInput
                        value={targetsText}
                        onChange={(event) => setTargetsText(event.target.value)}
                        placeholder="安妮,辛德拉"
                    />
                </Field>

                <Field>
                    策略预设
                    <SelectInput
                        value={preset}
                        onChange={(event) => setPreset(event.target.value as StrategyPreset)}
                    >
                        {PRESET_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </SelectInput>
                </Field>

                <Field>
                    稳血阈值
                    <TextInput
                        value={hpThresholdText}
                        onChange={(event) => setHpThresholdText(event.target.value)}
                        placeholder="35"
                    />
                </Field>
            </FormGrid>

            <ActionBar>
                <PrimaryButton onClick={runSimulation} disabled={isRunning}>
                    {isRunning ? "离线回放中..." : "运行安卓回放"}
                </PrimaryButton>
                <SecondaryButton onClick={restoreCurrentScenario}>恢复当前样例</SecondaryButton>
            </ActionBar>

            <Grid>
                <div>
                    <BlockTitle>局面 JSON</BlockTitle>
                    <HelperText>
                        你可以直接修改这里的棋盘、备战席、商店、装备和海克斯数据，然后重新生成动作计划。
                    </HelperText>
                    <JsonArea
                        value={stateJson}
                        onChange={(event) => setStateJson(event.target.value)}
                        spellCheck={false}
                    />
                </div>

                <div>
                    <BlockTitle>回放结果</BlockTitle>
                    {result ? (
                        <>
                            <SummaryGrid>
                                <SummaryCard>
                                    <SummaryLabel>阶段</SummaryLabel>
                                    <SummaryValue>{result.state.stageText || "未知"}</SummaryValue>
                                </SummaryCard>
                                <SummaryCard>
                                    <SummaryLabel>等级</SummaryLabel>
                                    <SummaryValue>Lv.{result.state.level}</SummaryValue>
                                </SummaryCard>
                                <SummaryCard>
                                    <SummaryLabel>金币</SummaryLabel>
                                    <SummaryValue>{result.state.gold}</SummaryValue>
                                </SummaryCard>
                                <SummaryCard>
                                    <SummaryLabel>血量</SummaryLabel>
                                    <SummaryValue>{result.state.hp ?? "-"}</SummaryValue>
                                </SummaryCard>
                            </SummaryGrid>

                            <Grid>
                                <div>
                                    <BlockTitle>商店</BlockTitle>
                                    {renderUnitCards(
                                        result.state.shop
                                            .filter((slot) => slot.unit)
                                            .map((slot) => ({
                                                id: `${slot.slot}-${slot.unit?.id ?? "empty"}`,
                                                name: `${slot.slot + 1}号位 ${slot.unit?.name ?? "空"}`,
                                                star: slot.unit?.star ?? 0,
                                                location: `SHOP_SLOT_${slot.slot + 1}`,
                                                cost: slot.cost ?? undefined,
                                                items: [],
                                            }))
                                    )}
                                </div>

                                <div>
                                    <BlockTitle>备战席</BlockTitle>
                                    {renderUnitCards(result.state.bench)}
                                </div>

                                <div>
                                    <BlockTitle>棋盘</BlockTitle>
                                    {renderUnitCards(
                                        [...result.state.board].sort((a, b) => (a.location ?? "").localeCompare(b.location ?? ""))
                                    )}
                                </div>

                                <div>
                                    <BlockTitle>当前羁绊</BlockTitle>
                                    {result.state.activeTraits && result.state.activeTraits.length > 0 ? (
                                        <UnitGrid>
                                            {result.state.activeTraits.map((trait) => (
                                                <UnitCard key={`${trait.name}-${trait.count}`}>
                                                    <UnitName>{trait.name}</UnitName>
                                                    <UnitMeta>{`数量: ${trait.count}`}</UnitMeta>
                                                    <UnitMeta>
                                                        {trait.required !== null
                                                            ? `阈值: ${trait.required} · ${trait.active ? "已激活" : "未激活"}`
                                                            : "阈值: 未知"}
                                                    </UnitMeta>
                                                </UnitCard>
                                            ))}
                                        </UnitGrid>
                                    ) : (
                                        <EmptyState>当前没有可汇总的羁绊。</EmptyState>
                                    )}
                                </div>

                                <div>
                                    <BlockTitle>装备栏</BlockTitle>
                                    {result.state.items.length > 0 ? (
                                        <UnitGrid>
                                            {result.state.items.map((item, index) => (
                                                <UnitCard key={`${item}-${index}`}>
                                                    <UnitName>{item}</UnitName>
                                                    <UnitMeta>{`EQ_SLOT_${index + 1}`}</UnitMeta>
                                                </UnitCard>
                                            ))}
                                        </UnitGrid>
                                    ) : (
                                        <EmptyState>当前没有待分配装备。</EmptyState>
                                    )}
                                </div>
                            </Grid>

                            {result.executionPlan.warnings.length > 0 && (
                                <WarningList>
                                    {result.executionPlan.warnings.map((warning, index) => (
                                        <ListItem key={`${warning}-${index}`}>
                                            <ListHeader>
                                                <ListTitle>执行计划警告</ListTitle>
                                                <Badge $tone="warn">WARN</Badge>
                                            </ListHeader>
                                            <Muted>{warning}</Muted>
                                        </ListItem>
                                    ))}
                                </WarningList>
                            )}
                        </>
                    ) : (
                        <EmptyState>运行一次安卓离线回放后，这里会显示当前局面摘要、动作计划和触控步骤。</EmptyState>
                    )}
                </div>
            </Grid>

            {result && (
                <Grid style={{ marginTop: "0.9rem" }}>
                    <div>
                        <BlockTitle>运营动作计划</BlockTitle>
                        <List>
                            {result.plans.map((plan, index) => (
                                <ListItem key={`${plan.type}-${index}-${plan.tick}`}>
                                    <ListHeader>
                                        <ListTitle>{plan.type}</ListTitle>
                                        <Badge>{`Tick ${plan.tick}`}</Badge>
                                    </ListHeader>
                                    <Muted>{formatPlan(plan)}</Muted>
                                    <Muted>{toPrettyJson(plan.payload)}</Muted>
                                </ListItem>
                            ))}
                        </List>
                    </div>

                    <div>
                        <BlockTitle>安卓触控步骤</BlockTitle>
                        <List>
                            {result.executionPlan.steps.map((step) => (
                                <ListItem key={`${step.kind}-${step.index}`}>
                                    <ListHeader>
                                        <ListTitle>{step.description}</ListTitle>
                                        <Badge>{step.kind}</Badge>
                                    </ListHeader>
                                    <Muted>{step.reason}</Muted>
                                    <Muted>{formatStep(step)}</Muted>
                                </ListItem>
                            ))}
                        </List>
                    </div>
                </Grid>
            )}
            </Section>

            <Section>
                <Heading>安卓识别离线回放</Heading>
                <Subtitle>
                    这里把“回合号 OCR mock + 英雄名 OCR/mock + 模板兜底”一起离线跑掉。
                    适合先验证阶段解析、商店/备战席/棋盘英雄名识别，再决定要不要进模拟器录新素材。
                </Subtitle>

                <ScenarioBar>
                    {recognitionFixtures.map((fixture) => (
                        <ScenarioButton
                            key={fixture.id}
                            $active={fixture.id === selectedRecognitionId}
                            onClick={() => applyRecognitionFixture(fixture)}
                            title={fixture.description}
                        >
                            {fixture.label}
                        </ScenarioButton>
                    ))}
                    {isLoadingRecognitionFixtures && <Badge>识别样例加载中</Badge>}
                </ScenarioBar>

                {currentRecognitionFixture && (
                    <HelperText>{currentRecognitionFixture.description}</HelperText>
                )}

                <ActionBar>
                    <PrimaryButton onClick={runRecognitionReplay} disabled={isRunningRecognition}>
                        {isRunningRecognition ? "识别回放中..." : "运行识别回放"}
                    </PrimaryButton>
                </ActionBar>

                {currentRecognitionFixture?.notes && currentRecognitionFixture.notes.length > 0 && (
                    <WarningList>
                        {currentRecognitionFixture.notes.map((note, index) => (
                            <ListItem key={`${note}-${index}`}>
                                <ListHeader>
                                    <ListTitle>样例说明</ListTitle>
                                    <Badge>NOTE</Badge>
                                </ListHeader>
                                <Muted>{note}</Muted>
                            </ListItem>
                        ))}
                    </WarningList>
                )}

                {recognitionResult ? (
                    <>
                        <SummaryGrid style={{ marginTop: "0.9rem" }}>
                            <SummaryCard>
                                <SummaryLabel>回合识别</SummaryLabel>
                                <SummaryValue>{recognitionResult.stageResult?.extractedText || "未配置"}</SummaryValue>
                            </SummaryCard>
                            <SummaryCard>
                                <SummaryLabel>英雄命中</SummaryLabel>
                                <SummaryValue>
                                    {recognitionResult.summary.championPassedCount}/{recognitionResult.summary.championCount}
                                </SummaryValue>
                            </SummaryCard>
                            <SummaryCard>
                                <SummaryLabel>OCR 直中</SummaryLabel>
                                <SummaryValue>{recognitionResult.summary.ocrHitCount}</SummaryValue>
                            </SummaryCard>
                            <SummaryCard>
                                <SummaryLabel>模板兜底</SummaryLabel>
                                <SummaryValue>{recognitionResult.summary.templateHitCount}</SummaryValue>
                            </SummaryCard>
                        </SummaryGrid>

                        {recognitionResult.stageResult && (
                            <div style={{ marginTop: "0.9rem" }}>
                                <BlockTitle>回合号识别</BlockTitle>
                                <List>
                                    <ListItem>
                                        <ListHeader>
                                            <ListTitle>{recognitionResult.stageResult.expectedText}</ListTitle>
                                            <Badge $tone={recognitionResult.stageResult.passed ? "default" : "warn"}>
                                                {recognitionResult.stageResult.passed ? "PASS" : "FAIL"}
                                            </Badge>
                                        </ListHeader>
                                        <Muted>OCR mock: {recognitionResult.stageResult.rawText || "空"}</Muted>
                                        <Muted>提取结果: {recognitionResult.stageResult.extractedText || "空"}</Muted>
                                        <Muted>阶段类型: {recognitionResult.stageResult.recognizedType}</Muted>
                                        {recognitionResult.stageResult.note && (
                                            <Muted>说明: {recognitionResult.stageResult.note}</Muted>
                                        )}
                                        {recognitionResult.stageResult.imagePath && (
                                            <Muted>素材: {getFileName(recognitionResult.stageResult.imagePath)}</Muted>
                                        )}
                                    </ListItem>
                                </List>
                            </div>
                        )}

                        <div style={{ marginTop: "0.9rem" }}>
                            <BlockTitle>英雄名识别</BlockTitle>
                            <List>
                                {recognitionResult.championResults.map((entry) => (
                                    <ListItem key={entry.id}>
                                        <ListHeader>
                                            <ListTitle>
                                                {entry.region} {entry.slot ? `· ${entry.slot}` : ""} · 期望 {entry.expectedName ?? "空"}
                                            </ListTitle>
                                            <Badge $tone={entry.passed ? "default" : "warn"}>
                                                {entry.passed ? "PASS" : "FAIL"}
                                            </Badge>
                                        </ListHeader>
                                        <Muted>OCR mock: {entry.ocrText || "未提供"} → {entry.normalizedOcrText || "空"}</Muted>
                                        <Muted>
                                            实际识别: {entry.recognizedName ?? "未命中"} · {formatRecognitionSource(entry.recognizedSource)}
                                        </Muted>
                                        <Muted>
                                            置信度: {entry.confidence !== null ? `${(entry.confidence * 100).toFixed(1)}%` : "-"}
                                        </Muted>
                                        {entry.note && (
                                            <Muted>说明: {entry.note}</Muted>
                                        )}
                                        {entry.imagePath && (
                                            <Muted>模板素材: {getFileName(entry.imagePath)}</Muted>
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                        </div>
                    </>
                ) : (
                    <EmptyState>运行识别回放后，这里会显示回合号解析结果、英雄名命中情况和命中来源。</EmptyState>
                )}
            </Section>
        </>
    );
}
