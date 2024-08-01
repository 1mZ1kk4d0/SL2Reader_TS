const fs = require('fs');
const crypto = require('crypto');

const DSR_KEY = Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10]);
const DS2_KEY = Buffer.from([0x59, 0x9f, 0x9b, 0x69, 0x96, 0x40, 0xa5, 0x52, 0x36, 0xee, 0x2d, 0x70, 0x83, 0x5e, 0xc7, 0x44]);
const DS3_KEY = Buffer.from([0xfd, 0x46, 0x4d, 0x69, 0x5e, 0x69, 0xa3, 0x9a, 0x10, 0xe3, 0x19, 0xa7, 0xac, 0xe8, 0xb7, 0xfa]);

class BND4Entry {
    constructor(raw, index, size, dataOffset, nameOffset) {
        this.raw = raw;
        this.index = index;
        this.size = size;
        this.dataOffset = dataOffset;
        this.nameOffset = nameOffset;

        this.name = this.raw.slice(this.nameOffset, this.nameOffset + 24).toString('utf16le');
        this.iv = this.raw.slice(this.dataOffset, this.dataOffset + 16);
        this.encryptedData = this.raw.slice(this.dataOffset + 16, this.dataOffset + this.size);
        this.decryptedData = Buffer.alloc(0);

        this.checksum = this.raw.slice(this.dataOffset, this.dataOffset + 16);
        this.decrypted = false;
        this.decryptedDataLength = 0;
    }

    decrypt() {
        let key = DSR_KEY;
        if (GAME === 'ds2') {
            key = DS2_KEY;
        } else if (GAME === 'ds3') {
            key = DS3_KEY;
        }

        console.log('IV:', this.iv);
        console.log('Encrypted Data Length:', this.encryptedData.length);

        const decipher = crypto.createDecipheriv('aes-128-cbc', key, this.iv);
        let decrypted = Buffer.concat([decipher.update(this.encryptedData), decipher.final()]);

        console.log('Decrypted Data Length:', decrypted.length);

        this.decryptedDataLength = decrypted.readInt32LE(16);
        this.decryptedData = decrypted.slice(20, 20 + this.decryptedDataLength);
        console.log('Decrypted Data Slice Length:', this.decryptedData.length);
        this.decrypted = true;
    }

    getSlotOccupancy() {
        if (this.index !== 10) {
            throw new Error("getSlotOccupancy() can only be called on entry #10!");
        }

        if (!this.decrypted) {
            this.decrypt();
        }

        const slotOccupancy = {};
        let slotBytes, slotDataOffset, slotLength, nameMaxLen;

        if (GAME === 'dsr') {
            slotBytes = this.decryptedData.slice(176, 186);
            slotDataOffset = 192;
            slotLength = 400;
            nameMaxLen = 13;
        } else if (GAME === 'ds3') {
            slotBytes = this.decryptedData.slice(4244, 4254);
            slotDataOffset = 4254;
            slotLength = 554;
            nameMaxLen = 16;
        } else if (GAME === 'er') {
            slotBytes = this.decryptedData.slice(6484, 6494);
            slotDataOffset = 6494;
            slotLength = 588;
            nameMaxLen = 16;
        } else {
            throw new Error('Game type not supported!');
        }

        for (let i = 0; i < 10; i++) {
            if (slotBytes[i] !== 0x00) {
                const nameOffset = slotDataOffset + (slotLength * i);
                let nameBytes = this.decryptedData.slice(nameOffset, nameOffset + (nameMaxLen * 2));
                const nullPos = nameBytes.indexOf('\x00\x00');
                if (nullPos !== -1) {
                    nameBytes = nameBytes.slice(0, nullPos + 1);
                }
                const characterName = nameBytes.toString('utf16le').replace(/\0/g, '');
                slotOccupancy[i] = characterName;
            }
        }

        console.log("getSlotOccupancy() returning:", slotOccupancy);
        return slotOccupancy;
    }
}

function readSL2File(filePath) {
    const raw = fs.readFileSync(filePath);
    const entry = new BND4Entry(raw, 10, raw.length, 0, 0);
    const slotOccupancy = entry.getSlotOccupancy();
    console.log('Slot Occupancy:', slotOccupancy);
}

GAME = 'ds3';

const filePath = [
    "C:\\Users\\guilh\\AppData\\Roaming\\EldenRing\\76561199002602391\\ER0000.sl2", // Elden Ring
    "C:\\Users\\guilh\\AppData\\Roaming\\DarkSoulsIII\\011000013e20cb97\\DS30000.sl2" // Dark Souls 3
];

readSL2File(filePath[1]);
