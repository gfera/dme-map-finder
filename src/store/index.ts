import { defineStore } from "pinia";
import { AsideMap, Map } from "../models/map";
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

export const useMainStore = defineStore("main", {
  state: () => {
    return {
      loadedBin: null as unknown as LoadedFile,
      ecuNumber: "",
      checksumCurrent: "",
      checksumNew: "",
      openedMaps: [] as Map[],
      revLimiters: [] as RevLimiter[],
      maps: [] as Map[],
      mapGroups,
      addresses: [] as number[],
    };
  },
  actions: {
    loadFile(payload: { name: string; buffer: ArrayBuffer }) {
      const buffer8Bit = new Uint8Array(payload.buffer);
      this.loadedBin = Object.freeze({
        buffer: payload.buffer,
        buffer8Bit,
        bytes: Array.from(buffer8Bit),
        name: payload.name,
      });
      this.ecuNumber = findPartNumber(buffer8Bit);
      this.checksumCurrent = getChecksum(buffer8Bit);
      this.checksumNew = calcChecksum8Bit(buffer8Bit);
      this.addresses = getMapTablesAddress(this.loadedBin.bytes);
      this.maps = extractMaps(this.loadedBin.bytes, this.addresses);
      this.maps.push(...findRevLimiter(buffer8Bit));
      this.openedMaps = [];
      this.mapGroups.forEach((group) => {
        group.items = this.maps
          .filter((map) => map.category === group.category)
          .map((m) => ({
            opened: false,
            map: m,
          }));
      });
    },
    toggleMap(item: AsideMap) {
      item.opened = !item.opened;
      const idx = this.openedMaps.indexOf(item.map);
      if (idx === -1) {
        this.openedMaps.push(item.map);
      } else {
        this.openedMaps.splice(idx, 1);
      }
    },
  },
});
