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

        this.decryptedData = !encrypted ? Buffer.alloc(0) : decryptFile(this.entryData, this.iv);
        this.checksum = this.raw.subarray(this.charEntryOffset, this.charEntryOffset + 16);
    }


    //based on code in python https://github.com/jtesta/souls_givifier/blob/master/souls_givifier.py
    getOccupancySlots() {

        const profiles = profile[this.profile]; // ds3 or er

        const maxCharacterSlotCount = 10;
        const maxCharacterNameLength = 16;

        const entry = this.decryptedData //global constant for the function, so you don't have to change it all the time.

        const slotBytes = entry.subarray(profiles.slot_data_offset, profiles.slot_data_offset + maxCharacterSlotCount);
        
   
        const slotOccupancy = [];

        for (let i = 0; i < 10; i++) {

            if (slotBytes[i] !== 0x00) {
                const nameOffset = profiles.slot_data_offset + (profiles.slot_length * i);
                let nameBytes = entry.subarray(nameOffset, nameOffset + (maxCharacterNameLength * 2));
                
                const nullPos = nameBytes.indexOf(0x00);

                if (nullPos !== -1) {
                    nameBytes = nameBytes.subarray(0, nullPos);
                    
                }

                const characterName = nameBytes.toString('utf16le').replace(/\0/g, '');


                slotOccupancy[i] = characterName;
            }
        }


        return slotOccupancy;
    }
    

    getCharacters() {

        const chars: Character[] = [];
        //const slotsCount = Math.floor(this.decryptedData.length / profile[this.profile].slot_length);

        console.log(this.getOccupancySlots())

        if (this.profile === "ds3") {
            for (let i = 0; i <= this.index; i++) {
                const offset_name = profile[this.profile].slot_data_offset + 30 + i * profile[this.profile].slot_length;
                const offset_level = profile[this.profile].slot_data_offset + 30 + 34 + i * profile[this.profile].slot_length;
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
                const offset_level = profile[this.profile].slot_data_offset + 10 + 34 + i * profile[this.profile].slot_length;
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
       // console.log(e);
    });
}

const filePath = [
    "A:\\Projetos\\GitHub\\DK3\\DecryptedFile2.txt", // Decrypted DS3
    "C:\\Users\\guilh\\AppData\\Roaming\\EldenRing\\76561199002602391\\ER0000.sl2",
    "C:\\Users\\guilh\\AppData\\Roaming\\DarkSoulsIII\\011000013e20cb97\\DS30000.sl2" // Encrypted DS3
];

loadSL2(filePath[2], "ds3", true);
