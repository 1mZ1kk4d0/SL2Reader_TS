import { decryptFile } from "./utils/decryptor";
import { Character, formatTime } from "./utils/utils";
import fs from 'fs';

const profile = {
    er: {
        is_encrypted: false,
        character_name_max_length: 16,
        character_slots_count: 10,
        file_index: 10,
        slot_data_offset: 6494,
        slot_length: 588,
        slots_occupancy_offset: 6484
    },
    ds3: {
        is_encrypted: true,
        character_name_max_length: 16,
        character_slots_count: 10,
        file_index: 10,
        slot_data_offset: 4254,
        slot_length: 554,
        slots_occupancy_offset: 4244
    }
} as const;

type Profile = keyof typeof profile;

class BND4Entry {

    //Declations
    profile: Profile;
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

    constructor(raw: Buffer, profileKey: Profile) {

        this.raw = raw;
        this.profile = profileKey;
        
        this.size = raw.length;

        const entryHeaderOffset = 64;
        const entryHeaderLength = 32;
        const profileData = profile[profileKey];

        this.charEntryOffset = entryHeaderOffset + entryHeaderLength * profileData.file_index;
        this.charEntrySize = raw.readUInt32LE(this.charEntryOffset + 8);
        this.charEntryDataOffset = raw.readUInt32LE(this.charEntryOffset + 16);
        this.charEntryNameOffset = raw.readUInt32LE(this.charEntryOffset + 20);

        this.name = readNullTerminatedUTF16LEString(this.raw, this.charEntryNameOffset);
        this.iv = this.raw.subarray(this.charEntryDataOffset, this.charEntryDataOffset + 16);
        this.entryData = this.raw.subarray(this.charEntryDataOffset + 16, this.charEntryDataOffset + this.charEntrySize);

        this.decryptedData = !profileData.is_encrypted ? Buffer.alloc(0) : decryptFile(this.entryData, this.iv);
        this.checksum = this.raw.subarray(this.charEntryOffset, this.charEntryOffset + 16);
    }
    

    getCharacters() {

        const chars: Character[] = [];
  

        if (this.profile === "ds3") {

            const current_profile = profile[this.profile];
            const name_section_size = current_profile.character_name_max_length * 2 + 2;
            const checksum_with_padding_size = 16 + 4;

            const level_size = 4;

            for (let i = 0; i < current_profile.character_slots_count; i++) {
                const offset_name = current_profile.slot_data_offset + checksum_with_padding_size + i * current_profile.slot_length;
                const offset_level = current_profile.slot_data_offset + checksum_with_padding_size + name_section_size + i * current_profile.slot_length;
                const offset3_timestamp = current_profile.slot_data_offset + checksum_with_padding_size + name_section_size + level_size + i * current_profile.slot_length;
                const slot_unoccupied = this.decryptedData[current_profile.slots_occupancy_offset + checksum_with_padding_size + i] === 0;
                if (!slot_unoccupied) {
                    chars.push({
                        character_slot: i + 1,
                        character_name: readNullTerminatedUTF16LEString(this.decryptedData, offset_name),
                        character_level: readInt(this.decryptedData, offset_level),
                        character_time: readInt(this.decryptedData, offset3_timestamp),
                        character_time_format: formatTime(readInt(this.decryptedData, offset3_timestamp))
                    });
                }

            }
        }

        if(this.profile === "er") {
            const current_profile = profile[this.profile];

            const name_section_size = current_profile.character_name_max_length * 2 + 2;

            const level_size = 4;
            for (let i = 0; i < current_profile.character_slots_count; i++) {

                const offset_name = current_profile.slot_data_offset + i * current_profile.slot_length;
                const offset_level = current_profile.slot_data_offset + name_section_size + i * current_profile.slot_length;
                const offset3_timestamp = current_profile.slot_data_offset + name_section_size + level_size + i * current_profile.slot_length;
                const slot_unoccupied = this.entryData[current_profile.slots_occupancy_offset + i] === 0;

                if (!slot_unoccupied) {
                    chars.push({
                        character_slot: i + 1,
                        character_name: readNullTerminatedUTF16LEString(this.entryData, offset_name),
                        character_level: readInt(this.entryData, offset_level),
                        character_time: readInt(this.entryData, offset3_timestamp),
                        character_time_format: formatTime(readInt(this.entryData, offset3_timestamp))
                    });
                }
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

async function loadSL2(filePath: string, profile: Profile) {

    const raw = fs.readFileSync(filePath);
    const entry = new BND4Entry(raw, profile);
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

loadSL2(filePath[1], "er");
