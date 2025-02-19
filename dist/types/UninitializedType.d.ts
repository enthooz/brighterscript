import type { BscType } from './BscType';
export declare class UninitializedType implements BscType {
    isAssignableTo(targetType: BscType): boolean;
    isConvertibleTo(targetType: BscType): boolean;
    toString(): string;
    toTypeString(): string;
}
