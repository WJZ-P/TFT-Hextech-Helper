const EQUIPMENT_NAME_ALIASES: Record<string, string> = {
    反曲弓: "反曲之弓",
};

export function normalizeEquipmentName(value: string): string {
    const trimmed = value.trim();
    return EQUIPMENT_NAME_ALIASES[trimmed] ?? trimmed;
}

export function equipmentNamesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
    if (!left || !right) {
        return left === right;
    }

    return normalizeEquipmentName(left) === normalizeEquipmentName(right);
}
