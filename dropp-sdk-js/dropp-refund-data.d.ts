export interface DroppRefundData {
    amount: number;
    ipAddress?: string;
    merchantAccount: string;
    paymentReference?: string;
    refundRef?: string;
    refundReason?: string;
    readonly timeStamp: number;
    transactionReference?: string;
}
