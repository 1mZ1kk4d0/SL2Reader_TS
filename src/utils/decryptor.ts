import { createDecipheriv } from 'crypto'


const KEY = Buffer.from([
    0xfd, 0x46, 0x4d, 0x69, 0x5e, 0x69, 0xa3, 0x9a, 0x10, 0xe3, 0x19, 0xa7, 0xac, 0xe8, 0xb7, 0xfa,
]);


export async function decryptFile(raw: Buffer): Promise<Buffer> {


    try {

        const iv = raw.subarray(0, 16);
        const encryptedData = raw.slice(32);

        const decipher = createDecipheriv('aes-128-cbc', KEY, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

        return decrypted;
    } catch (error) {
        console.error('Error decrypting file:', error);
        throw error;
    }
}