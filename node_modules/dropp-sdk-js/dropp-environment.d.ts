export declare class DroppEnvironment {
    private readonly _name;
    private readonly _url;
    private static envBaseUrls;
    constructor(name: string, url: string);
    static get(envName: string): DroppEnvironment;
    get name(): string;
    get url(): string;
}
