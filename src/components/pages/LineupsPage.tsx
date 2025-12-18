/**
 * 阵容搭配页面
 * @description 展示和管理 TFT 阵容配置，仿 OP.GG 风格
 */

import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {ThemeType} from '../../styles/theme';
import {TFT_16_CHAMPION_DATA, TFTEquip} from "../../../src-backend/TFTProtocol";

// ==================== 类型定义 ====================

/**
 * 棋子配置（从后端获取）
 */
interface ChampionConfig {
    name: string;           // 中文名
    isCore: boolean;        // 是否核心棋子
    items?: {
        core: TFTEquip[];       // 核心装备
        alternatives?: TFTEquip[];
    };
}

/**
 * 阶段配置
 */
interface StageConfig {
    champions: ChampionConfig[];
    tips?: string;
}

/**
 * 完整阵容配置（从后端获取）
 */
interface LineupConfig {
    id: string;
    name: string;
    stages: {
        level4?: StageConfig;
        level5?: StageConfig;
        level6?: StageConfig;
        level7?: StageConfig;
        level8: StageConfig;
        level9?: StageConfig;
        level10?: StageConfig;
    };
}

// ==================== 常量 ====================

/**
 * OP.GG 头像 API 基础 URL
 * 将 {englishId} 替换为英雄英文ID即可获取头像
 */
const OPGG_AVATAR_BASE = 'https://c-tft-api.op.gg/img/set/16/tft-champion/tiles/{englishId}.tft_set16.png?image=q_auto:good,f_webp&v=1765176243';

// ==================== 样式组件 ====================

const PageWrapper = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing.large};
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  height: 100%;
  overflow-y: auto;
`;

// 阵容卡片容器（垂直列表布局）
const LineupsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
`;

// 单个阵容卡片 - 仿 OP.GG 风格
const LineupCard = styled.div<{ theme: ThemeType; $expanded?: boolean; $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  background-color: ${props => props.$selected 
    ? 'rgba(59, 130, 246, 0.1)'
    : props.theme.colors.cardBg};
  border: 1.5px solid ${props => props.$selected 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: ${props => props.$expanded 
    ? `${props.theme.borderRadius} ${props.theme.borderRadius} 0 0` 
    : props.theme.borderRadius};
  padding: ${props => props.theme.spacing.small};
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  /* 未展开时，单独的 hover 效果 */
  ${props => !props.$expanded && `
    &:hover {
      border-color: ${props.theme.colors.primary};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `}
`;

// 卡片头部：阵容名称和箭头在同一行
const CardHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  padding-right: ${props => props.theme.spacing.medium};
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

// 箭头图标（展开/收起指示器）
const Arrow = styled.span<{ $expanded: boolean }>`
  display: inline-block;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 16px;
  transition: transform 0.2s ease;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

// 选择复选框容器（加大点击区域）
const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  margin: -8px;
  flex-shrink: 0;
  cursor: pointer;
`;

// 自定义复选框样式
const Checkbox = styled.div<{ $checked: boolean; theme: ThemeType }>`
  width: 24px;
  height: 24px;
  border: 2px solid ${props => props.$checked 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: 4px;
  background-color: ${props => props.$checked 
    ? props.theme.colors.primary 
    : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }

  /* 选中时显示勾号 */
  &::after {
    content: '✓';
    color: white;
    font-size: 14px;
    font-weight: bold;
    opacity: ${props => props.$checked ? 1 : 0};
    transition: opacity 0.2s ease;
  }
`;

// 选中状态提示栏（常驻显示）
const SelectionInfo = styled.div<{ $hasSelection: boolean; theme: ThemeType }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: ${props => props.theme.colors.cardBg};
  border: 1.5px solid ${props => props.$hasSelection 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: 8px;
  margin-bottom: ${props => props.theme.spacing.medium};
  transition: border-color 0.2s ease;
`;

const SelectionText = styled.span<{ $hasSelection: boolean; theme: ThemeType }>`
  color: ${props => props.$hasSelection 
    ? props.theme.colors.text 
    : props.theme.colors.textSecondary};
  font-size: 16px;
`;

// 当前阵容名称高亮（使用黑色，更醒目）
const LineupName = styled.strong`
  color: #000000;
`;

// 选择操作按钮容器
const SelectionActions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 8px;
`;

// 操作按钮样式
const ActionButton = styled.button<{ theme: ThemeType }>`
  padding: 4px 12px;
  font-size: 14px;
  font-weight: 800;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.85;
  }
`;

// 英雄头像列表容器
const ChampionsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
  flex: 1;
`;

// 单个英雄容器（包含头像和名字）
const ChampionItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

// 英雄头像容器 - 带边框和星级标记
const ChampionAvatar = styled.div<{ $isCore: boolean; $cost?: number }>`
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  /* 核心棋子用金色边框，普通棋子用灰色边框 */
  /* isCore 暂时不作为边框颜色判断依据，保留参数备用 */
  /* border: 2px solid ${props => props.$isCore ? '#FFD700' : props.theme.colors.border}; */
  
  /* 根据英雄费用显示不同颜色的边框 */
  border: 2.5px solid ${props => {
      const cost = props.$cost;
      // @ts-ignore
      const color = props.theme.colors.championCost[cost];
      return color || props.theme.colors.championCost.default;
  }};
  
  background-color: ${props => props.theme.colors.elementBg};

  /* 核心棋子添加发光效果 */
  ${props => props.$isCore && `
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
  `}
`;

// 英雄头像图片
const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;



// 英雄名字
const ChampionName = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: ${props => props.theme.colors.textSecondary};
  text-align: center;
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// ==================== 展开面板样式 ====================

// 阵容卡片容器（包含主卡片和展开面板）
// 展开后整体都有 hover 效果，保持视觉统一
const LineupCardWrapper = styled.div<{ $expanded: boolean; theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  border-radius: ${props => props.theme.borderRadius};
  transition: all 0.2s ease-in-out;

  /* 展开状态下，整个容器有 hover 效果 */
  ${props => props.$expanded && `
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    &:hover > div {
      border-color: ${props.theme.colors.primary};
    }
  `}
`;

// 展开面板容器
const ExpandPanel = styled.div<{ $expanded: boolean; theme: ThemeType }>`
  overflow: hidden;
  max-height: ${props => props.$expanded ? '1000px' : '0'};
  opacity: ${props => props.$expanded ? 1 : 0};
  transition: all 0.3s ease-in-out;
  background-color: ${props => props.theme.colors.cardBg};
  border: 1.5px solid ${props => props.theme.colors.border};
  border-top: none;
  border-radius: 0 0 ${props => props.theme.borderRadius} ${props => props.theme.borderRadius};
  margin-top: -2px;
`;

// 单个等级行
const LevelRow = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  padding: ${props => props.theme.spacing.small};
  border-bottom: 1px solid ${props => props.theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

// 等级标签
const LevelLabel = styled.div<{ theme: ThemeType }>`
  min-width: 60px;
  padding: 4px 8px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  font-size: 14px;
  font-weight: 800;
  border-radius: 4px;
  text-align: center;
  margin-right: ${props => props.theme.spacing.medium};
`;

// 等级对应的英雄列表（小尺寸版本）
const LevelChampionsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  flex: 1;
`;

// 小尺寸英雄头像容器
const SmallChampionAvatar = styled.div<{ $cost?: number; theme: ThemeType }>`
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid ${props => {
    const cost = props.$cost;
    // @ts-ignore
    const color = props.theme.colors.championCost[cost];
    return color || props.theme.colors.championCost.default;
  }};
  background-color: ${props => props.theme.colors.elementBg};
`;

// 小尺寸头像图片
const SmallAvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// 占位提示
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.large};
  color: ${props => props.theme.colors.textSecondary};
  text-align: center;
`;

// 头像加载失败时的占位符
const AvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.colors.elementHover};
  color: ${props => props.theme.colors.textSecondary};
  font-size: 12px;
`;

// ==================== 子组件 ====================

/**
 * 英雄头像组件 Props
 */
interface ChampionAvatarProps {
    champion: ChampionConfig;
}

/**
 * 根据中文名获取头像 URL
 * @param cnName 棋子中文名
 */
const getAvatarUrl = (cnName: string): string => {
    // @ts-ignore
    const champion = TFT_16_CHAMPION_DATA[cnName];
    if (!champion) {
        console.warn(`未找到英雄 "${cnName}" 的数据`);
        return '';
    }
    const englishId = champion.englishId;
    return OPGG_AVATAR_BASE.replace('{englishId}', englishId);
};

/**
 * 英雄头像组件
 * 处理图片加载失败的情况
 */
const ChampionAvatarComponent: React.FC<ChampionAvatarProps> = ({champion}) => {
    const [imgError, setImgError] = useState(false);
    const avatarUrl = getAvatarUrl(champion.name);

    // 获取英雄费用
    // @ts-ignore
    const tftUnit = TFT_16_CHAMPION_DATA[champion.name];
    const cost = tftUnit ? tftUnit.price : 0;

    return (
        <ChampionItem>
            <ChampionAvatar 
                $isCore={champion.isCore} 
                $cost={cost}
            >
                {!imgError && avatarUrl ? (
                    <AvatarImg
                        src={avatarUrl}
                        alt={champion.name}
                        onError={() => setImgError(true)}
                        loading="lazy"  // 懒加载优化性能
                    />
                ) : (
                    <AvatarPlaceholder>{champion.name.slice(0, 2)}</AvatarPlaceholder>
                )}
            </ChampionAvatar>
            <ChampionName>{champion.name}</ChampionName>
        </ChampionItem>
    );
};

// ==================== 主组件 ====================

const LineupsPage: React.FC = () => {
    // 阵容列表状态
    const [lineups, setLineups] = useState<LineupConfig[]>([]);
    // 加载状态
    const [loading, setLoading] = useState(true);
    // 展开状态：记录每个阵容的展开状态，key 是阵容 id
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    // 已选中的阵容 ID 集合
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // 切换某个阵容的展开/收起状态
    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // 切换阵容选中状态（自由勾选，不限制数量）
    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止冒泡，避免触发展开
        
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // 获取选中的阵容名称（用于单选时显示）
    const getSelectedLineupName = (): string => {
        if (selectedIds.size !== 1) return '';
        const selectedId = Array.from(selectedIds)[0];
        const lineup = lineups.find(l => l.id === selectedId);
        return lineup?.name || '';
    };

    // 全选所有阵容
    const selectAll = () => {
        setSelectedIds(new Set(lineups.map(l => l.id)));
    };

    // 取消全部选择
    const clearAll = () => {
        setSelectedIds(new Set());
    };

    // 组件挂载时从后端加载阵容数据
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 并行获取阵容数据和选中状态
                const [lineupsData, savedSelectedIds] = await Promise.all([
                    window.lineup.getAll(),
                    window.lineup.getSelectedIds(),
                ]);
                setLineups(lineupsData || []);
                // 恢复之前保存的选中状态
                if (savedSelectedIds && savedSelectedIds.length > 0) {
                    setSelectedIds(new Set(savedSelectedIds));
                }
            } catch (error) {
                console.error('加载数据失败:', error);
                setLineups([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // 选中状态变化时，自动保存到本地（跳过初始加载阶段）
    useEffect(() => {
        // loading 为 true 时是初始加载，不保存
        if (loading) return;
        
        // 将 Set 转换为数组保存
        const idsArray = Array.from(selectedIds);
        window.lineup.setSelectedIds(idsArray).catch(err => {
            console.error('保存选中状态失败:', err);
        });
    }, [selectedIds, loading]);

    /**
     * 获取阵容的展示棋子列表
     * 优先显示 高level 的阵容（成型阵容）
     */
    const getDisplayChampions = (lineup: LineupConfig): ChampionConfig[] => {
        const stage =
            lineup.stages.level10 ||
            lineup.stages.level9 ||
            lineup.stages.level8 ||
            lineup.stages.level9 ||
            lineup.stages.level7 ||
            lineup.stages.level6;
        return stage?.champions || [];
    };

    /**
     * 获取所有可用的等级阵容
     * 返回一个数组，包含 [等级, 英雄列表] 的元组
     */
    const getAvailableLevels = (lineup: LineupConfig): [number, ChampionConfig[]][] => {
        const levels: [number, ChampionConfig[]][] = [];
        const stageKeys: (keyof LineupConfig['stages'])[] = [
            'level4', 'level5', 'level6', 'level7', 'level8', 'level9', 'level10'
        ];
        
        stageKeys.forEach((key) => {
            const stage = lineup.stages[key];
            if (stage && stage.champions.length > 0) {
                // 从 key 中提取等级数字，如 'level8' -> 8
                const level = parseInt(key.replace('level', ''), 10);
                levels.push([level, stage.champions]);
            }
        });
        
        return levels;
    };

    // 加载中状态
    if (loading) {
        return (
            <PageWrapper>
                <SelectionInfo $hasSelection={false}>
                    <SelectionText $hasSelection={false}>加载中...</SelectionText>
                </SelectionInfo>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            {/* 状态提示栏（常驻） */}
            <SelectionInfo $hasSelection={selectedIds.size > 0}>
                <SelectionText $hasSelection={selectedIds.size > 0}>
                    {selectedIds.size === 0 ? (
                        <>未选择阵容</>
                    ) : selectedIds.size === 1 ? (
                        <>当前阵容：<LineupName>{getSelectedLineupName()}</LineupName></>
                    ) : (
                        <>已勾选 <strong>{selectedIds.size}</strong> 个阵容，将根据开局情况智能选择最终阵容</>
                    )}
                </SelectionText>
                {/* 全选/取消按钮（智能切换） */}
                <SelectionActions>
                    {selectedIds.size === lineups.length ? (
                        <ActionButton onClick={clearAll}>全部取消</ActionButton>
                    ) : (
                        <ActionButton onClick={selectAll}>全部勾选</ActionButton>
                    )}
                </SelectionActions>
            </SelectionInfo>

            {lineups.length > 0 ? (
                <LineupsList>
                    {lineups.map((lineup) => {
                        const champions = getDisplayChampions(lineup);
                        const availableLevels = getAvailableLevels(lineup);
                        const isExpanded = expandedIds.has(lineup.id);
                        const isSelected = selectedIds.has(lineup.id);
                        
                        return (
                            <LineupCardWrapper key={lineup.id} $expanded={isExpanded}>
                                <LineupCard 
                                    $expanded={isExpanded}
                                    $selected={isSelected}
                                    onClick={() => toggleExpand(lineup.id)}
                                >
                                    {/* 选择复选框 */}
                                    <CheckboxWrapper onClick={(e) => toggleSelect(lineup.id, e)}>
                                        <Checkbox $checked={isSelected} />
                                    </CheckboxWrapper>
                                    
                                    <ChampionsList>
                                        {champions.map((champion, index) => (
                                            <ChampionAvatarComponent
                                                key={`${lineup.id}-${champion.name}-${index}`}
                                                champion={champion}
                                            />
                                        ))}
                                    </ChampionsList>
                                    <CardHeader>
                                        <CardTitle>{lineup.name}</CardTitle>
                                        <Arrow $expanded={isExpanded}>▼</Arrow>
                                    </CardHeader>
                                </LineupCard>
                                
                                {/* 展开面板：显示各等级阵容 */}
                                <ExpandPanel $expanded={isExpanded}>
                                    {availableLevels.map(([level, levelChampions]) => (
                                        <LevelRow key={`${lineup.id}-level-${level}`}>
                                            <LevelLabel>Lv.{level}</LevelLabel>
                                            <LevelChampionsList>
                                                {levelChampions.map((champion, idx) => {
                                                    // @ts-ignore
                                                    const tftUnit = TFT_16_CHAMPION_DATA[champion.name];
                                                    const cost = tftUnit ? tftUnit.price : 0;
                                                    const avatarUrl = getAvatarUrl(champion.name);
                                                    
                                                    return (
                                                        <SmallChampionAvatar 
                                                            key={`${lineup.id}-lv${level}-${champion.name}-${idx}`}
                                                            $cost={cost}
                                                            title={champion.name}
                                                        >
                                                            {avatarUrl && (
                                                                <SmallAvatarImg 
                                                                    src={avatarUrl} 
                                                                    alt={champion.name}
                                                                    loading="lazy"
                                                                />
                                                            )}
                                                        </SmallChampionAvatar>
                                                    );
                                                })}
                                            </LevelChampionsList>
                                        </LevelRow>
                                    ))}
                                </ExpandPanel>
                            </LineupCardWrapper>
                        );
                    })}
                </LineupsList>
            ) : (
                <EmptyState>
                    <p>暂无阵容配置</p>
                    <p>请在 public/lineups 目录下添加阵容 JSON 文件</p>
                </EmptyState>
            )}
        </PageWrapper>
    );
};

export default LineupsPage;
