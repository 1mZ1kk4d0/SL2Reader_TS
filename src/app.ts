import { formatTime } from "./utils/utils";
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
    decrypted: boolean;
    charEntryDataOffset: number;
    charEntryNameOffset: number;

    constructor(raw: Buffer, index: number, profile: Profile) {


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
        this.iv = this.raw.subarray(this.charEntryOffset, this.charEntryDataOffset + 16);
        this.entryData = this.raw.subarray(this.charEntryDataOffset + 16, this.charEntryDataOffset + this.charEntrySize);

        this.decryptedData = Buffer.alloc(0);
        this.checksum = this.raw.subarray(this.charEntryOffset, this.charEntryOffset + 16);
        this.decrypted = false;
    }

    getCharacters() {

        const chars: {
            character_name: string;
            character_level?: number;
            character_time?: number;
            character_time_format?: string;
        }[] = [];



        if (this.profile === "ds3") {
            for (let i = 0; i <= this.index; i++) {
                const offset_name = profile[this.profile].slot_data_offset + 10 + i * profile[this.profile].slot_length;
                chars.push({
                    character_name: readNullTerminatedUTF16LEString(this.entryData, offset_name)
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

function loadSL2(filePath: string, profile: Profile) {

    const raw = fs.readFileSync(filePath);
    const entry = new BND4Entry(raw, 10, profile);
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

loadSL2(filePath[0], "ds3");
