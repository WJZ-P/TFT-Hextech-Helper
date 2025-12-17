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
    starTarget: 1 | 2 | 3;  // 目标星级
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

const PageHeader = styled.div`
  margin-bottom: ${props => props.theme.spacing.large};
`;

const Title = styled.h1<{ theme: ThemeType }>`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.small};
`;

const Subtitle = styled.p<{ theme: ThemeType }>`
  font-size: 1rem;
  color: ${props => props.theme.colors.textSecondary};
`;

// 阵容卡片容器（垂直列表布局）
const LineupsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
`;

// 单个阵容卡片 - 仿 OP.GG 风格
const LineupCard = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  background-color: ${props => props.theme.colors.cardBg};
  border: 1.5px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius};
  padding: ${props => props.theme.spacing.small};
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

// 卡片头部：阵容名称
const CardHeader = styled.div`
  flex: 1;
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  text-align: right;
  padding-right: ${props => props.theme.spacing.large};
`;

// 英雄头像列表容器
const ChampionsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
`;

// 单个英雄容器（包含头像和名字）
const ChampionItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

// 英雄头像容器 - 带边框和星级标记
const ChampionAvatar = styled.div<{ $isCore: boolean; $starTarget: number }>`
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  /* 核心棋子用金色边框，普通棋子用灰色边框 */
  border: 2px solid ${props => props.$isCore ? '#FFD700' : props.theme.colors.border};
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

// 星级标记 - 显示在头像右上角
const StarBadge = styled.div<{ $stars: number }>`
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  font-size: 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 根据星级显示不同颜色：3星金色，2星银色，1星铜色 */
  background-color: ${props =>
          props.$stars === 3 ? '#FFD700' :
                  props.$stars === 2 ? '#C0C0C0' :
                          '#CD7F32'
  };
  color: ${props => props.$stars === 2 ? '#333' : '#fff'};
  border: 1px solid rgba(0, 0, 0, 0.2);
`;

// 英雄名字
const ChampionName = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.textSecondary};
  text-align: center;
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

// 加载状态
const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.large};
  color: ${props => props.theme.colors.textSecondary};
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

    return (
        <ChampionItem>
            <ChampionAvatar $isCore={champion.isCore} $starTarget={champion.starTarget}>
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
                {/* 星级标记：只显示2星和3星 */}
                {champion.starTarget > 1 && (
                    <StarBadge $stars={champion.starTarget}>
                        {champion.starTarget}
                    </StarBadge>
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

    // 组件挂载时从后端加载阵容数据
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 并行获取阵容数据，提高加载效率
                const [lineupsData] = await Promise.all([
                    window.lineup.getAll(),
                ]);
                setLineups(lineupsData || []);
            } catch (error) {
                console.error('加载数据失败:', error);
                setLineups([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    /**
     * 获取阵容的展示棋子列表
     * 优先显示 level8 的阵容（成型阵容）
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

    // 加载中状态
    if (loading) {
        return (
            <PageWrapper>
                <PageHeader>
                    <Title>阵容搭配</Title>
                    <Subtitle>选择一个阵容开始自动下棋</Subtitle>
                </PageHeader>
                <LoadingState>加载中...</LoadingState>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <PageHeader>
                <Title>阵容搭配</Title>
                <Subtitle>选择一个阵容开始自动下棋（共 {lineups.length} 个阵容）</Subtitle>
            </PageHeader>

            {lineups.length > 0 ? (
                <LineupsList>
                    {lineups.map((lineup) => {
                        const champions = getDisplayChampions(lineup);
                        return (
                            <LineupCard key={lineup.id}>
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
                                </CardHeader>
                            </LineupCard>
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
