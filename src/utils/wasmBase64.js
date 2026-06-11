import init, { base64Encode, base64Decode } from '@/assets/wasm-base64/web_crypto.js'

let wasmReady = false

export async function initWasm() {
    if (!wasmReady) {
        console.log('WASM 初始化中...')
        await init()
        wasmReady = true
    }
}

export function encode(input) {
    if (!wasmReady) throw new Error('WASM 未初始化')
    return base64Encode(input)
}

export function decode(input) {
    if (!wasmReady) throw new Error('WASM 未初始化')
    return base64Decode(input)
}
