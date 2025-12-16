export interface IInvoice {
    readonly merchantAccount: string;
    readonly reference: string;
    readonly amount: number;
    readonly currency: string;
    readonly details?: string;
    readonly thumbnail?: string;
    readonly successURL?: string;
    readonly failureURL?: string;
    readonly successMessage?: string;
    readonly lowerLimit?: number;
    readonly upperLimit?: number;
    readonly purchaseExpiration?: number;
    readonly referralFee?: number;
    readonly referralAccount?: string;
    readonly distribution?: string;
    readonly offerCode?: string;
    readonly discountedAmount?: number;
    readonly userId?: string;
    readonly walletAddress?: string;
    readonly qrCodeUUID?: string;
    readonly acceptPaymentDelay?: boolean;
}
export interface Signatures {
    payer?: string;
    merchant?: string;
    dropp?: string;
    droppMerchant?: string;
}
export interface IDistribution {
    [x: string]: number;
}
export interface IPromiseToPay {
    readonly payer: string;
    readonly invoiceBytes: string;
    readonly timeStamp: number;
    readonly signatures: Signatures;
    readonly encodedHHTransfer?: string;
    distributionBytes?: string;
    purchaseURL?: string;
    shareURL?: string;
    walletCurrency?: string;
    exchangeRate?: number;
    droppCredits?: number;
    droppCreditsInInvoiceCurrency?: number;
    droppCreditsInWalletCurrency?: number;
}
export interface RecurringPaymentPayload {
    readonly signatures: Signatures;
    dataInBase64?: string;
    data?: string;
}
export interface RecurringPaymentData {
    readonly merchantId?: string;
    readonly merchantAccount: string;
    readonly payerAccount: string;
    readonly payerCurrency: string;
    readonly createdOn: Date;
    readonly updatedOn: Date;
    readonly merchantName?: string;
    readonly maxAmount?: number;
    readonly fixAmount?: number;
    readonly currency: string;
    readonly country: string;
    readonly thumbnail?: string;
    readonly reference?: string;
    readonly details: string;
    readonly title?: string;
    readonly type?: string;
    readonly start: Date;
    readonly expiry: Date;
    readonly frequency: "NONE" | "HALF_HOURLY" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    readonly status?: "ACTIVE" | "SUSPENDED" | "CANCELLED";
    readonly encodedHHUpdateAccount?: string;
    readonly useDroppCredit?: boolean;
}
export interface RecurringDueData {
    readonly merchantAccountId: string;
    readonly amount: number;
    readonly recurringToken: string;
}
export declare class PromiseToPay implements IPromiseToPay {
    payer: string;
    invoiceBytes: string;
    timeStamp: number;
    signatures: Signatures;
    distributionBytes?: string;
    encodedHHTransfer?: string;
    purchaseURL?: string;
    shareURL?: string;
    walletCurrency?: string;
    exchangeRate?: number;
    droppCredits?: number;
    droppCreditsInInvoiceCurrency?: number;
    droppCreditsInWalletCurrency?: number;
    constructor(p2p: IPromiseToPay);
    decodeDistributionBytes(): IDistribution | undefined;
    decodeInvoiceBytes(): IInvoice;
}
