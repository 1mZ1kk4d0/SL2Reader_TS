import { decryptFile } from "./utils/decryptor";
import { Character, formatTime } from "./utils/utils";
import fs from 'fs';

const profile = {
    er: {
        slot_data_offset: 6484,
        slot_length: 588
    },
    ds3: {
        slot_data_offset: 4244,
        slot_length: 554
    }
} as const;

type Profile = keyof typeof profile;

class BND4Entry {

    //Declations
    profile: Profile;
    index: number;
    raw: Buffer;
    size: number;
    charEntryOffset: number;
    charEntrySize: number;
    name: string;
    iv: Buffer;
    entryData: Buffer;
    decryptedData: Buffer;
    checksum: Buffer;
    charEntryDataOffset: number;
    charEntryNameOffset: number;

    constructor(raw: Buffer, index: number, profile: Profile, encrypted: boolean) {


        this.profile = profile;
        this.raw = raw;
        this.index = index;
        this.size = raw.length;

        const entryHeaderOffset = 64;
        const entryHeaderLength = 32;

        this.charEntryOffset = entryHeaderOffset + entryHeaderLength * this.index;
        this.charEntrySize = raw.readUInt32LE(this.charEntryOffset + 8);
        this.charEntryDataOffset = raw.readUInt32LE(this.charEntryOffset + 16);
        this.charEntryNameOffset = raw.readUInt32LE(this.charEntryOffset + 20);

        this.name = readNullTerminatedUTF16LEString(this.raw, this.charEntryNameOffset);
        this.iv = this.raw.subarray(this.charEntryDataOffset, this.charEntryDataOffset + 16);
        this.entryData = this.raw.subarray(this.charEntryDataOffset + 16, this.charEntryDataOffset + this.charEntrySize);

        this.decryptedData = !encrypted ? Buffer.alloc(0) : decryptFile(this.entryData, this.iv); //if encrypted I Decrypt
        this.checksum = this.raw.subarray(this.charEntryOffset, this.charEntryOffset + 16);
    }
    

    getCharacters() {

        console.log(this.iv)

        const chars: Character[] = [];



        if (this.profile === "ds3") {
            for (let i = 0; i <= this.index; i++) {
                const offset_name = profile[this.profile].slot_data_offset + 30 + i * profile[this.profile].slot_length;
                const offset_level = profile[this.profile].slot_data_offset + 30 + 34 + (i * profile[this.profile].slot_length);
                const offset3_timestamp = profile[this.profile].slot_data_offset + 30 + 38 + i * profile[this.profile].slot_length;
                chars.push({
                    character_name: readNullTerminatedUTF16LEString(this.decryptedData, offset_name),
                    character_level: readInt(this.decryptedData, offset_level),
                    character_time: readInt(this.decryptedData, offset3_timestamp),
                    character_time_format: formatTime(readInt(this.decryptedData, offset3_timestamp))
                });
            }
        }

        if(this.profile === "er") {

            for (let i = 0; i <= this.index; i++) {

                const offset_name = profile[this.profile].slot_data_offset + 10 + i * profile[this.profile].slot_length;
                const offset_level = profile[this.profile].slot_data_offset + 10 + 34 + (i * profile[this.profile].slot_length);
                const offset3_timestamp = profile[this.profile].slot_data_offset + 10 + 38 + i * profile[this.profile].slot_length;
    
                chars.push({
                    character_name: readNullTerminatedUTF16LEString(this.entryData, offset_name),
                    character_level: readInt(this.entryData, offset_level),
                    character_time: readInt(this.entryData, offset3_timestamp),
                    character_time_format: formatTime(readInt(this.entryData, offset3_timestamp))
                });
            }
        }



        return chars;

    }

}

function readNullTerminatedUTF16LEString(buffer: Buffer, offset: number) {
    let endOffset = offset;
    while (endOffset < buffer.length) {
        if (buffer.readUInt16LE(endOffset) === 0x0000) {
            break;
        }
        endOffset += 2;
    }
    return buffer.toString('utf16le', offset, endOffset);
}

function readInt(buffer: Buffer, offset: number) {
    return buffer.readInt32LE(offset);
}

async function loadSL2(filePath: string, profile: Profile, encrypted: boolean) {



    const raw = fs.readFileSync(filePath);
    const entry = new BND4Entry(raw, 10, profile, true);
    const characters = entry.getCharacters();

    characters.forEach(e => {
        console.log(e);
    });
}

const filePath = [
    "A:\\Projetos\\GitHub\\DK3\\DecryptedFile2.txt", // Decrypted DS3
    "C:\\Users\\guilh\\AppData\\Roaming\\EldenRing\\76561199002602391\\ER0000.sl2",
    "C:\\Users\\guilh\\AppData\\Roaming\\DarkSoulsIII\\011000013e20cb97\\DS30000.sl2" // Encrypted DS3
];

loadSL2(filePath[2], "ds3", true);
