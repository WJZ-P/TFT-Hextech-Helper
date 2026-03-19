export interface TftChampionData {
    id: string;
    name: string;
    englishId?: string;
    cost: number;
    traits: string[];
    imageUrl?: string;
}

export interface TftItemData {
    id: string;
    name: string;
    englishName?: string;
    imageUrl?: string;
    formula?: string;
}

export interface TftTraitData {
    id: string;
    name: string;
    type: "origins" | "classes";
    breakpoints: number[];
    imageUrl?: string;
}

export interface TftLineupData {
    id: string;
    name: string;
    season?: string;
    quality?: string;
    updatedAt?: string;
    champions: string[];
    coreChampions: string[];
    recommendedItems: string[];
    notes?: string[];
}

export type TftOcrCorrectionContext = "all" | "stage" | "shop" | "equipment";

export interface TftOcrCorrectionEntry {
    incorrect: string;
    correct: string;
    context?: TftOcrCorrectionContext;
}

export interface TftDataVersionInfo {
    chess?: string;
    equip?: string;
    race?: string;
    job?: string;
    hex?: string;
    lineup?: string;
}

export interface TftDataSnapshot {
    fetchedAt: string;
    source: "remote" | "cache" | "fallback" | "season-pack";
    versions: TftDataVersionInfo;
    champions: TftChampionData[];
    items: TftItemData[];
    traits: TftTraitData[];
    lineups: TftLineupData[];
    ocrCorrections?: TftOcrCorrectionEntry[];
}
