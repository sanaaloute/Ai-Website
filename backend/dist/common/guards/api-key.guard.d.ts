import { CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { ProviderKeysService } from "../../modules/profile/provider-keys.service";
export declare class AiWebsiteApiKeyException extends HttpException {
    constructor();
}
export declare class ApiKeyGuard implements CanActivate {
    private readonly providerKeys;
    constructor(providerKeys: ProviderKeysService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
