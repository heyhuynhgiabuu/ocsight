import { OpenCodeData } from "../types/index";
export declare function getDefaultOpenCodePath(): string;
export declare function findOpenCodeDataDirectory(customPath?: string): Promise<string>;
export declare function findSessionFiles(dataDir: string): Promise<string[]>;
export declare function findMessageFiles(dataDir: string): Promise<string[]>;
export declare function loadOpenCodeData(options?: {
    limit?: number;
    cache?: boolean;
}): Promise<OpenCodeData>;
export declare function loadAllData(options?: {
    limit?: number;
    cache?: boolean;
}): Promise<OpenCodeData>;
//# sourceMappingURL=data.d.ts.map