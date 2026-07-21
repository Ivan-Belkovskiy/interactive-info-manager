export class ClientCrypto {
    private static readonly SALT = new TextEncoder().encode("VilkiElense_2026_New_Salt");
    private static readonly ITERATIONS = 100000;

    private static async generateKey(masterPassword: string): Promise<CryptoKey> {
        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(masterPassword);

        const baseKey = await window.crypto.subtle.importKey(
            "raw",
            passwordBytes,
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: this.SALT,
                iterations: this.ITERATIONS,
                hash: "SHA-256",
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    public static async encrypt(text: string, masterPassword: string): Promise<string> {
        const key = await this.generateKey(masterPassword);

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encodedText = new TextEncoder().encode(text);

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encodedText
        );

        const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
        const encryptedHex = Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        return `${ivHex}:${encryptedHex}`;
    }

    public static async decrypt(encryptedData: string, masterPassword: string): Promise<{
        success: false;
        error: string;
    } | {
        success: true;
        data: string;
    }> {
        try {
            const [ivHex, dataHex] = encryptedData.split(":");
            if (!ivHex || !dataHex) return { success: false, error: "Incorrect encrypted data format!" };
            // if (!ivHex || !dataHex) throw new Error("Incorrect encrypted data format!");

            const key = await this.generateKey(masterPassword);

            const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
            const encryptedBuffer = new Uint8Array(dataHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                encryptedBuffer
            );

            return {
                success: true,
                data: new TextDecoder().decode(decryptedBuffer)
            };
        } catch (error) {
            return { success: false, error: "Encryption error!" };
            // throw new Error("Encryption error!");
        }
    }

    public static async isEncrypted(data: string) {
        const [ivHex, dataHex] = data.split(":");
        return (ivHex && dataHex);
    }
}