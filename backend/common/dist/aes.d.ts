export interface EncryptedData {
    readonly salt: string;
    readonly iv: string;
    readonly authTag: string;
    readonly ciphertext: string;
}
export declare function encryptAESGCM(plaintext: string, password: string): Promise<EncryptedData>;
export declare function decryptAESGCM(encrypted: EncryptedData, password: string): Promise<string>;
