export interface DroppRedemptionData {
    merchantAccountId: string;
    userAccountId: string;
    amount: number;
    currency: string;
    creditReference?: string;
    ipAddress?: string;
}
