import type { GameStageType, TFTMode } from "../TFTProtocol";

export type RecognitionChampionRegion = "SHOP" | "BENCH" | "BOARD";
export type RecognitionSource = "OCR" | "TEMPLATE" | "NONE";
export type StaticRecognitionSource = "OCR" | "TEMPLATE" | "UNITS" | "FIXTURE" | "NONE";

export interface AndroidRecognitionStageFixture {
    imagePath?: string;
    ocrText: string;
    expectedText: string;
    expectedType: GameStageType;
    note?: string;
}

export interface AndroidRecognitionChampionFixture {
    id: string;
    region: RecognitionChampionRegion;
    slot?: string;
    expectedName: string | null;
    expectedSource?: RecognitionSource;
    ocrText?: string;
    imagePath?: string;
    note?: string;
}

export interface AndroidRecognitionStaticUnitFixture {
    slot: string;
    expectedName: string;
    starLevel?: number;
    items?: string[];
    note?: string;
}

export interface AndroidRecognitionStaticEquipFixture {
    slot: string;
    expectedName: string | null;
    imagePath?: string;
    note?: string;
}

export interface AndroidRecognitionStaticTraitFixture {
    name: string;
    expectedCount: number;
    expectedActive: boolean;
    expectedText?: string;
    imagePath?: string;
    note?: string;
}

export interface AndroidRecognitionStaticSnapshotFixture {
    framePath: string;
    boardUnits: AndroidRecognitionStaticUnitFixture[];
    benchUnits: AndroidRecognitionStaticUnitFixture[];
    equipments?: AndroidRecognitionStaticEquipFixture[];
    expectedTraits?: AndroidRecognitionStaticTraitFixture[];
    note?: string;
}

export interface AndroidRecognitionReplayFixture {
    id: string;
    label: string;
    description: string;
    mode: TFTMode;
    referenceScenarioId?: string;
    notes?: string[];
    stage?: AndroidRecognitionStageFixture;
    champions: AndroidRecognitionChampionFixture[];
    staticSnapshot?: AndroidRecognitionStaticSnapshotFixture;
}

export interface AndroidRecognitionStageResult {
    rawText: string;
    extractedText: string;
    expectedText: string;
    recognizedType: GameStageType;
    expectedType: GameStageType;
    imagePath?: string;
    note?: string;
    passed: boolean;
}

export interface AndroidRecognitionChampionResult {
    id: string;
    region: RecognitionChampionRegion;
    slot?: string;
    expectedName: string | null;
    expectedSource?: RecognitionSource;
    ocrText?: string;
    normalizedOcrText: string;
    recognizedName: string | null;
    recognizedSource: RecognitionSource;
    confidence: number | null;
    imagePath?: string;
    note?: string;
    passed: boolean;
}

export interface AndroidRecognitionStaticOccupancyResult {
    region: Exclude<RecognitionChampionRegion, "SHOP">;
    slot: string;
    expectedOccupied: boolean;
    recognizedOccupied: boolean;
    meanDifference: number | null;
    passed: boolean;
}

export interface AndroidRecognitionStaticEquipResult {
    slot: string;
    expectedName: string | null;
    recognizedName: string | null;
    recognizedSource: StaticRecognitionSource;
    confidence: number | null;
    passed: boolean;
    note?: string;
}

export interface AndroidRecognitionStaticTraitResult {
    name: string;
    expectedCount: number;
    recognizedCount: number;
    expectedActive: boolean;
    recognizedActive: boolean;
    expectedText?: string;
    recognizedText?: string;
    imagePath?: string;
    recognizedSource: StaticRecognitionSource;
    passed: boolean;
    note?: string;
}

export interface AndroidRecognitionStaticSnapshotResult {
    framePath: string;
    note?: string;
    boardOccupancyResults: AndroidRecognitionStaticOccupancyResult[];
    benchOccupancyResults: AndroidRecognitionStaticOccupancyResult[];
    equipmentResults: AndroidRecognitionStaticEquipResult[];
    traitResults: AndroidRecognitionStaticTraitResult[];
    passed: boolean;
}

export interface AndroidRecognitionReplaySummary {
    allPassed: boolean;
    stagePassed: boolean;
    championPassedCount: number;
    championCount: number;
    ocrHitCount: number;
    templateHitCount: number;
    staticSnapshotPassed: boolean;
}

export interface AndroidRecognitionReplayResult {
    fixture: AndroidRecognitionReplayFixture;
    stageResult: AndroidRecognitionStageResult | null;
    championResults: AndroidRecognitionChampionResult[];
    staticSnapshotResult: AndroidRecognitionStaticSnapshotResult | null;
    summary: AndroidRecognitionReplaySummary;
}
