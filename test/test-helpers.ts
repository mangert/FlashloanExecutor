import { ethers } from "./setup";

//техническая функция для перевода строк в восьмибайтовые переменные
export function toBytes8(str: string): `0x${string}` {
    const bytes = ethers.toUtf8Bytes(str);
    if (bytes.length > 8) {
        throw new Error("String too long for bytes8");
    }
    return ethers.hexlify(ethers.zeroPadValue(bytes, 8)) as `0x${string}`;
}    