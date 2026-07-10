export declare class EncryptionService {
    private readonly logger;
    private readonly key;
    constructor();
    encrypt(plainText: string): string;
    decrypt(cipherText: string): string | null;
}
