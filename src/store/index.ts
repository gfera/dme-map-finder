import { ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { AsideMap, EcuMap } from "../models/map";
import {
  calcChecksum8Bit,
  extractMaps,
  findPartNumber,
  getChecksum,
  getMapTablesAddress,
  mapGroups,
} from "../utils/map-base";
import { findRevLimiter, RevLimiter } from "../utils/rev-limiter";

interface LoadedFile {
  name: string;
  buffer: ArrayBuffer;
  buffer8Bit: Uint8Array;
  bytes: number[];
}

export const useMainStore = defineStore("main", () => {
  const loadedBin = shallowRef<LoadedFile>(null);
  const ecuNumber = ref("");
  const checksumCurrent = ref("");
  const checksumNew = ref("");
  const openedMaps = shallowRef<EcuMap[]>([]);
  const revLimiters = ref<RevLimiter[]>([]);
  const maps = shallowRef<EcuMap[]>([]);
  const addresses = ref<number[]>([]);
  const groups = ref(mapGroups);

  const loadFile = (payload: { name: string; buffer: ArrayBuffer }) => {
    const buffer8Bit = new Uint8Array(payload.buffer);
    loadedBin.value = Object.freeze({
      buffer: payload.buffer,
      buffer8Bit,
      bytes: Array.from(buffer8Bit),
      name: payload.name,
    });
    ecuNumber.value = findPartNumber(buffer8Bit);
    checksumCurrent.value = getChecksum(buffer8Bit);
    checksumNew.value = calcChecksum8Bit(buffer8Bit);
    addresses.value = getMapTablesAddress(loadedBin.value.bytes);
    maps.value = extractMaps(loadedBin.value.bytes, addresses.value);
    maps.value.push(...findRevLimiter(buffer8Bit));
    openedMaps.value = [];
    groups.value.forEach((group) => {
      group.items.splice(0, group.items.length);
      const list: AsideMap[] = maps.value
        .filter((map) => map.category === group.category)
        .map((m) => ({
          opened: false,
          map: m,
        }));
      group.items.push(...list);
    });
  };

  const toggleMap = (item: AsideMap) => {
    const maps = openedMaps.value;
    item.opened = !item.opened;
    const idx = maps.indexOf(item.map);
    if (idx === -1) {
      maps.push(item.map);
    } else {
      maps.splice(idx, 1);
    }
    openedMaps.value = maps.concat();
  };

  return {
    // State
    loadedBin,
    ecuNumber,
    checksumCurrent,
    checksumNew,
    openedMaps,
    revLimiters,
    maps,
    addresses,
    mapGroups,

    // Actions
    toggleMap,
    loadFile,
  };
});
