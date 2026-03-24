import * as droppSdk from './dropp-sdk-js';
import { ServerResponse } from 'http';
import { DroppResponse } from './dropp-sdk-js/dropp-response';
import { APINetworkMembersRequest } from './dropp-sdk-js/network-member-request-data';

// Callback type
type CallbackFunction = (returnValue: DroppResponse, res: ServerResponse) => void;

function getNetworkMembersApi(request: APINetworkMembersRequest, res: ServerResponse, callback: CallbackFunction): void {
    const droppClient = new droppSdk.DroppClient(process.env.DROPP_ENVIRONMENT!);
    const signingKey = process.env.DROPP_MERCHANT_SIGNING_KEY!;
    const primaryMerchantAccountId = process.env.DROPP_MERCHANT_ID!;
    new droppSdk.DroppNetworkMemberRequest(droppClient).getNetworkMembers(request, primaryMerchantAccountId, signingKey)
     .then(function (response: DroppResponse) {
            callback(response, res);
        })
        .catch(function (error: any) {
            console.log(`networkMembersError: ${error}`);
            callback(error, res);
        });
}

export { getNetworkMembersApi };
