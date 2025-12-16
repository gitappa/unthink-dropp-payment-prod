export declare class DroppSignatureGenerator {
    static generateMerchantSignature(dataToSignInHex: string | undefined, signingKey: string): string;
    static generateSignatureForData(dataToSignInJSON: Record<string, unknown>, signingKey: string): string;
    private static removeKeyPrefix;
}
