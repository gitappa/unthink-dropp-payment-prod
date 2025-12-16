import { DroppResponse } from "./dropp-response";
import { DroppClient } from "./dropp-client";
import { DroppRefundData } from "./dropp-refund-data";
export declare class DroppRefundRequest {
    protected droppClient: DroppClient;
    constructor(droppHttpClient: DroppClient);
    submit(refundData: DroppRefundData, signingKey: string): Promise<DroppResponse>;
}
