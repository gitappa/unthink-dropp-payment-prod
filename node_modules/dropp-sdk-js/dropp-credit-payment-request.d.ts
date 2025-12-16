import { DroppResponse } from "./dropp-response";
import { DroppRedemptionData } from "./dropp-redemption-data";
import { DroppClient } from "./dropp-client";
export declare class DroppCreditPaymentRequest {
    private droppClient;
    constructor(droppHttpClient: DroppClient);
    submit(redemptionData: DroppRedemptionData, signingKey: string): Promise<DroppResponse>;
}
