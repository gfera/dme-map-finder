import { EcuMap, MapAxis, MapCategories } from "../models/map";
import { findPattern } from "./misc";

export const findAFMMaps = (buffer: Uint8Array, bytes: number[]): EcuMap[] => {
  // Post AFM  pattern: ffff020101[????][RPM][03]
  const maps: EcuMap[] = [];
  const pattern = [0x00, 0x01, 0x02];
  const location = findPattern(buffer, pattern);
  const firstMapLocation = location > 0 ? location - 13 : -1;
  const secondMapLocation = firstMapLocation + 8;
  const thridMapLocation = secondMapLocation + 8;

  if (firstMapLocation === -1) return [];

  {
    // 1st Map
    const map = new EcuMap(firstMapLocation, bytes, 8);
    map.name = "AFM Scale Factor";
    map.dataAddress = firstMapLocation;
    map.category = MapCategories.AFM;
    map.xAxis = new MapAxis(0, null, 8, []);
    map.yAxis = new MapAxis(0, null, 1, []);
    map.rawValues = bytes.slice(firstMapLocation, firstMapLocation + 8);
    map.values = bytes.slice(firstMapLocation, firstMapLocation + 8);
    maps.push(map);
  }

  {
    // 2nd Map
    const map = new EcuMap(secondMapLocation, bytes, 8);
    map.name = "AFM 2";
    map.dataAddress = secondMapLocation;
    map.category = MapCategories.AFM;
    map.xAxis = new MapAxis(0, null, 8, []);
    map.yAxis = new MapAxis(0, null, 1, []);
    map.rawValues = bytes.slice(secondMapLocation, secondMapLocation + 8);
    map.values = [...map.rawValues];
    maps.push(map);
  }
  {
    // 3rd Map
    const map = new EcuMap(thridMapLocation, bytes, 32);
    map.dataAddress = thridMapLocation;
    map.name = "AFM Voltage Transfer";
    map.category = MapCategories.AFM;
    map.xAxis = new MapAxis(0, null, 32, []);
    map.yAxis = new MapAxis(0, null, 1, []);
    map.rawValues = bytes.slice(thridMapLocation, thridMapLocation + 32);
    map.values = [...map.rawValues];
    maps.push(map);
  }

  return maps;
};
