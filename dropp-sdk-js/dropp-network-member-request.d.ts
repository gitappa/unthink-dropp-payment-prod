import { DroppResponse } from "./dropp-response";
import { APINetworkMembersRequest } from "./network-member-request-data";
import { DroppClient } from "./dropp-client";
export declare class DroppNetworkMemberRequest {
    protected droppClient: DroppClient;
    constructor(droppHttpClient: DroppClient);
    getNetworkMembers(requestParameters: APINetworkMembersRequest, parentMerchantAccountId: string, signingKey: string): Promise<DroppResponse>;
    private fetchNetworkMembers;
}
