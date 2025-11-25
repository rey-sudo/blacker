export type RSAKeyPair = {
    privateKeyB64: string;
    publicKeyB64: string;
};
export declare function generateRSA(): Promise<RSAKeyPair>;
