import { RecurringPaymentPayload, RecurringDueData } from "./dropp-payloads";
import { DroppClient } from "./dropp-client";
import { DroppResponse } from "./dropp-response";
export declare class DroppRecurringPaymentRequest {
    private droppClient;
    constructor(droppHttpClient: DroppClient);
    submitForAuthorization(payload: RecurringPaymentPayload, signingKey: string): Promise<DroppResponse>;
    submitForPayment(paymentDueData: RecurringDueData, signingKey: string): Promise<DroppResponse>;
    private submit;
}
