import { ethers } from "./setup";

//техническая функция для перевода строк в шестибайтовые переменные
export function toBytes6(str: string): `0x${string}` {
    const bytes = ethers.toUtf8Bytes(str);
    if (bytes.length > 6) {
        throw new Error("String too long for bytes6");
    }
    return ethers.hexlify(ethers.zeroPadValue(bytes, 6)) as `0x${string}`;
}    