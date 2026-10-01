// lib/secureStorage.ts
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800; // iOS SecureStore value limit is ~2048 bytes

function chunkKey(key: string, index: number) {
  return `${key}__chunk_${index}`;
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const meta = await SecureStore.getItemAsync(key);
    if (meta == null) return null;
    const count = Number(meta);
    if (!Number.isFinite(count) || count <= 0) {
      // Legacy value stored directly
      return meta;
    }
    let out = '';
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part == null) return null;
      out += part;
    }
    return out;
  },

  async setItem(key: string, value: string): Promise<void> {
    await secureStorage.removeItem(key);
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(key, String(chunks.length));
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]!);
    }
  },

  async removeItem(key: string): Promise<void> {
    const meta = await SecureStore.getItemAsync(key);
    if (meta == null) return;
    const count = Number(meta);
    if (Number.isFinite(count) && count > 0) {
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i)).catch(() => {});
      }
    }
    await SecureStore.deleteItemAsync(key).catch(() => {});
  },
};