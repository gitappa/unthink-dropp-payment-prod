export interface APINetworkMembersRequest {
    from: string;
    to?: string;
    offset?: number;
    limit?: number;
    timestamp?: string;
}
export interface APINetworkMembersResponseMember {
    accountId: string;
    displayName: string;
    email: string;
    initialAssociationTime: string;
    lastAssociationTime: string;
    lastUpdatedTime: string;
    status: string;
}
export interface APINetworkMembersResponseData {
    parentMerchantId: string;
    queryFrom: string;
    queryTo: string;
    total: number;
    members: APINetworkMembersResponseMember[];
}
export interface APINetworkMembersResponse {
    responseCode: number | string;
    errors: string[] | null;
    data: APINetworkMembersResponseData | null;
    messageType?: string | null;
}
