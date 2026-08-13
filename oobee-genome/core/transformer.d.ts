import type { OobeeOptions } from './options';

export interface SourcePosition {
    line: number;
    column: number;
}

export declare function getPosition(str: string, index: number): SourcePosition;

export declare function injectDNA(
    code: string,
    filePath: string,
    options?: OobeeOptions
): string;

export declare function shouldTransform(
    filePath: string,
    options?: OobeeOptions
): boolean;
