import { DroppResponse } from "./dropp-response";
import PaymentRequestData from "./payment-request-data";
/**
 * The main entry point
 */
export declare class DroppClient {
    private droppHttpClient;
    private env;
    /**
     * @param env SANDBOX/PROD/.. from DroppEnvironment
     */
    constructor(env: string);
    postToDroppService(url: string, postData: any): Promise<DroppResponse>;
    generateUUID(paymentRequestData: PaymentRequestData): Promise<DroppResponse>;
    waitForCompletion(uuid: string, retries?: number, interval?: number): Promise<DroppResponse>;
    getUrlForSubMerchantAuthorization(parentMerchantAccountId: string): string;
    private pollForCompletion;
    private getMPSUrl;
}
