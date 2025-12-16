import { DroppResponse } from "./dropp-response";
export declare class _DroppHttpClient {
    private environment;
    private readonly axiosInstance;
    constructor(env: string);
    private static isRpsAuthApi;
    private static transformRpsAuthResponse;
    private static isRpsP2pApi;
    private static transformRpsP2pResponse;
    private generateUserAgentString;
    postToDroppService(url: string, postData: any): Promise<DroppResponse>;
    getStatusForUUID(url: string): Promise<DroppResponse>;
}
