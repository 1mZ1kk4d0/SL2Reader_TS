const fs = require('fs');

class BND4Entry {

    constructor(raw, index) {
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
        this.iv = this.raw.slice(this.charEntryDataOffset, this.charEntryDataOffset + 16);
        this.entryData = this.raw.slice(this.charEntryDataOffset + 16, this.charEntryDataOffset + this.charEntrySize);

        this.decryptedData = Buffer.alloc(0);
        this.checksum = this.raw.slice(this.dataOffset, this.dataOffset + 16);
        this.decrypted = false;
        this.decryptedDataLength = 0;
    }

    getCharacterNames(){
        let names = [];
        for (let i = 0; i <= this.index; i++) {
            let offset = 6484 + 10 + i * 588;
            names.push(readNullTerminatedUTF16LEString(this.entryData, offset));
        }
        return names;
    }
}

function readNullTerminatedUTF16LEString(buffer, offset) {
    let endOffset = offset;
    while (endOffset < buffer.length) {
        if (buffer.readUInt16LE(endOffset) === 0x0000) {
        break;
        }
        endOffset += 2;
    }
    return buffer.toString('utf16le', offset, endOffset);
}

function readSL2File(filePath) {
    const raw = fs.readFileSync(filePath);
    const entry = new BND4Entry(raw, 10);
    const characterNames = entry.getCharacterNames();
    characterNames.forEach(characterName => {
        console.log(characterName);
    });
}

GAME = 'er';

const filePath = [
    "C:\\Users\\mi5hmash\\Downloads\\TESTTEST\\ER0000.sl2", //Elden
];

readSL2File(filePath[0]);