export declare const USER_STATUSES: readonly ["Active", "Inactive", "Suspended"];
export declare class UpdateUserStatusDto {
    status: (typeof USER_STATUSES)[number];
}
