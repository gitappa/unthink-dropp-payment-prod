/**
 * Standard response from Dropp API calls.
 */
export declare class DroppResponse {
    readonly responseCode: number;
    readonly errors: string[];
    readonly data: any;
    constructor(responseCode: number, errors: string[], data: any);
}
