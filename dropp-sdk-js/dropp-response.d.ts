/**
 * Standard response from Dropp API calls.
 */
export declare class DroppResponse {
    readonly responseCode: number | string;
    readonly errors: string[];
    readonly data: any;
    constructor(responseCode: number | string, errors: string[], data: any);
}
