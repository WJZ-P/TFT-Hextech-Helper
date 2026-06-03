package com.tfthextech.helper.protocol

enum class ActionType {
    BUY,
    SELL,
    USE_ANVIL,
    ROLL,
    LEVEL_UP,
    MOVE,
    EQUIP,
    PICK_AUGMENT,
    PICK_LOOT,
    OPEN_MODE_ROOM,
    START_GAME,
    START_UPDATE,
    SELECT_MODE,
    ACCEPT_QUEUE,
    DISMISS_DIALOG,
    RETURN_HOME,
    EXIT_RESULT,
    RECOVER_BACK,
    RESTART_TFT,
    NOOP
}

data class PointF01(
    val x: Float,
    val y: Float
)

data class ObservedUnit(
    val id: String,
    val name: String,
    val star: Int = 1,
    val cost: Int? = null,
    val location: String? = null,
    val items: List<String> = emptyList(),
    val traits: List<String> = emptyList()
)

data class ShopOffer(
    val slot: Int,
    val unit: ObservedUnit? = null,
    val cost: Int? = null
)

data class AugmentOffer(
    val slot: Int,
    val name: String,
    val score: Int? = null
)

data class ObservedState(
    val timestamp: Long = System.currentTimeMillis(),
    val stageText: String = "",
    val stageType: String = "UNKNOWN",
    val level: Int = 1,
    val currentXp: Int = 0,
    val totalXp: Int = 0,
    val gold: Int = 0,
    val hp: Int? = null,
    val streak: Int? = null,
    val bench: List<ObservedUnit> = emptyList(),
    val board: List<ObservedUnit> = emptyList(),
    val shop: List<ShopOffer> = emptyList(),
    val items: List<String> = emptyList(),
    val augments: List<AugmentOffer> = emptyList(),
    val metadata: Map<String, String> = emptyMap()
)

data class ActionPlan(
    val tick: Int,
    val type: ActionType,
    val payload: Map<String, String> = emptyMap(),
    val priority: Int,
    val reason: String
)

data class ExecutionStep(
    val index: Int,
    val type: ActionType,
    val point: PointF01? = null,
    val from: PointF01? = null,
    val to: PointF01? = null,
    val description: String,
    val reason: String
)

data class AutomationSnapshot(
    val enabled: Boolean,
    val dryRun: Boolean,
    val lastState: ObservedState?,
    val plannedActions: List<ActionPlan>,
    val executionSteps: List<ExecutionStep>,
    val status: String
)
