/**
 * 阵容搭配页面
 * @description 展示和管理 TFT 阵容配置，仿 OP.GG 风格
 */

import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {ThemeType} from '../../styles/theme';

// ==================== 类型定义 ====================

/**
 * 棋子配置（从后端获取）
 */
interface ChampionConfig {
    name: string;           // 中文名
    isCore: boolean;        // 是否核心棋子
    starTarget: 1 | 2 | 3;  // 目标星级
    items?: {
        core: string[];       // 核心装备
        alternatives?: string[];
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

/**
 * 英雄数据（用于获取英文ID）
 */
interface TFTUnit {
    displayName: string;
    englishId: string;
    price: number;
}

// ==================== 常量 ====================

/**
 * OP.GG 头像 API 基础 URL
 * 将 {englishId} 替换为英雄英文ID即可获取头像
 */
const OPGG_AVATAR_BASE = 'https://c-tft-api.op.gg/img/set/16/tft-champion/tiles/{englishId}.tft_set16.png?image=q_auto:good,f_webp&v=1765176243';

/**
 * 中文名到英文ID的映射（核心英雄）
 * 完整映射在后端 TFTProtocol.ts 中，这里只放常用的
 */
const CN_TO_EN_ID: Record<string, string> = {
    // 1费
    "俄洛伊": "TFT16_Illaoi", "贝蕾亚": "TFT16_Briar", "艾尼维亚": "TFT16_Anivia",
    "嘉文四世": "TFT16_JarvanIV", "烬": "TFT16_Jhin", "凯特琳": "TFT16_Caitlyn",
    "克格莫": "TFT16_KogMaw", "璐璐": "TFT16_Lulu", "奇亚娜": "TFT16_Qiyana",
    "兰博": "TFT16_Rumble", "慎": "TFT16_Shen", "娑娜": "TFT16_Sona",
    "佛耶戈": "TFT16_Viego", "布里茨": "TFT16_Blitzcrank",
    // 2费
    "厄斐琉斯": "TFT16_Aphelios", "艾希": "TFT16_Ashe", "科加斯": "TFT16_ChoGath",
    "崔斯特": "TFT16_TwistedFate", "艾克": "TFT16_Ekko", "格雷福斯": "TFT16_Graves",
    "妮蔻": "TFT16_Neeko", "奥莉安娜": "TFT16_Orianna", "波比": "TFT16_Poppy",
    "雷克塞": "TFT16_RekSai", "赛恩": "TFT16_Sion", "提莫": "TFT16_Teemo",
    "崔丝塔娜": "TFT16_Tristana", "蔚": "TFT16_Vi", "亚索": "TFT16_Yasuo",
    "约里克": "TFT16_Yorick", "赵信": "TFT16_XinZhao", "佐伊": "TFT16_Zoe",
    // 3费
    "阿狸": "TFT16_Ahri", "巴德": "TFT16_Bard", "德莱文": "TFT16_Draven",
    "德莱厄斯": "TFT16_Darius", "格温": "TFT16_Gwen", "金克丝": "TFT16_Jinx",
    "凯南": "TFT16_Kennen", "可酷伯与悠米": "TFT16_KoobAndYuumi", "乐芙兰": "TFT16_Leblanc",
    "洛里斯": "TFT16_Loris", "玛尔扎哈": "TFT16_Malzahar", "米利欧": "TFT16_Milio",
    "诺提勒斯": "TFT16_Nautilus", "普朗克": "TFT16_Gangplank", "瑟庄妮": "TFT16_Sejuani",
    "薇恩": "TFT16_Vayne", "蒙多医生": "TFT16_DrMundo", "菲兹": "TFT16_Fizz",
    // 4费
    "安蓓萨": "TFT16_Ambessa", "卑尔维斯": "TFT16_Belveth", "布隆": "TFT16_Braum",
    "黛安娜": "TFT16_Diana", "盖伦": "TFT16_Garen", "卡莉丝塔": "TFT16_Kalista",
    "卡莎": "TFT16_KaiSa", "蕾欧娜": "TFT16_Leona", "丽桑卓": "TFT16_Lissandra",
    "拉克丝": "TFT16_Lux", "厄运小姐": "TFT16_MissFortune", "内瑟斯": "TFT16_Nasus",
    "奈德丽": "TFT16_Nidalee", "雷克顿": "TFT16_Renekton", "萨勒芬妮": "TFT16_Seraphine",
    "辛吉德": "TFT16_Singed", "斯卡纳": "TFT16_Skarner", "斯维因": "TFT16_Swain",
    "孙悟空": "TFT16_MonkeyKing", "塔里克": "TFT16_Taric", "维迦": "TFT16_Veigar",
    "沃里克": "TFT16_Warwick", "永恩": "TFT16_Yone", "芸阿娜": "TFT16_Yuumi",
    // 5费
    "亚托克斯": "TFT16_Aatrox", "安妮": "TFT16_Annie", "阿兹尔": "TFT16_Azir",
    "费德提克": "TFT16_Fiddlesticks", "吉格斯": "TFT16_Ziggs", "加里奥": "TFT16_Galio",
    "基兰": "TFT16_Zilean", "千珏": "TFT16_Kindred", "卢锡安与赛娜": "TFT16_Lucian",
    "梅尔": "TFT16_Mel", "奥恩": "TFT16_Ornn", "瑟提": "TFT16_Sett",
    "希瓦娜": "TFT16_Shyvana", "塔姆": "TFT16_TahmKench", "锤石": "TFT16_Thresh",
    "沃利贝尔": "TFT16_Volibear",
    // 7费特殊
    "奥瑞利安·索尔": "TFT16_AurelionSol", "纳什男爵": "TFT16_BaronNashor",
    "瑞兹": "TFT16_Ryze", "亚恒": "TFT16_Xayah", "海克斯霸龙": "TFT16_THex",
};

/**
 * 根据中文名获取头像 URL
 */
const getAvatarUrl = (cnName: string): string => {
    const englishId = CN_TO_EN_ID[cnName];
    if (!englishId) {
        console.warn(`未找到英雄 "${cnName}" 的英文ID`);
        return '';
    }
    return OPGG_AVATAR_BASE.replace('{englishId}', englishId);
};

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
  background-color: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius};
  padding: ${props => props.theme.spacing.medium};
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

// 卡片头部：阵容名称
const CardHeader = styled.div`
  margin-bottom: ${props => props.theme.spacing.small};
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
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
 * 英雄头像组件
 * 处理图片加载失败的情况
 */
const ChampionAvatarComponent: React.FC<{ champion: ChampionConfig }> = ({champion}) => {
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
        const fetchLineups = async () => {
            try {
                const data = await window.lineup.getAll();
                setLineups(data || []);
            } catch (error) {
                console.error('加载阵容失败:', error);
                setLineups([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLineups();
    }, []);

    /**
     * 获取阵容的展示棋子列表
     * 优先显示 level8 的阵容（成型阵容）
     */
    const getDisplayChampions = (lineup: LineupConfig): ChampionConfig[] => {
        // 优先使用 level8，这是大多数阵容的成型点
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
                                <CardHeader>
                                    <CardTitle>{lineup.name}</CardTitle>
                                </CardHeader>
                                <ChampionsList>
                                    {champions.map((champion, index) => (
                                        <ChampionAvatarComponent
                                            key={`${lineup.id}-${champion.name}-${index}`}
                                            champion={champion}
                                        />
                                    ))}
                                </ChampionsList>
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
