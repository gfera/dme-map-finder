import { EcuMap, MapCategories, MapGroup } from "../models/map";
import { findPattern } from "./misc";

/////////////////////////
// const mapTablesStart = 0x4590;
const mapTablesStart = 0x45d0;

export const getMapTablesAddress = (bytes: number[]) => {
  const buffer = bytes.slice(mapTablesStart, mapTablesStart + 0x400);
  const addresses = buffer.reduce((prev: number[], curr, position) => {
    const even = position % 2 === 0;
    if (!even) {
      const prevIdx = (position - 1) / 2;
      prev[prevIdx] += curr;
    } else {
      prev.push(curr << 8);
    }
    return prev;
  }, []);
  const romSize = bytes.length;
  return addresses
    .sort()
    .filter(
      (v, i, a) => a.indexOf(v) === i && v > mapTablesStart && v < romSize
    );
};

export const extractMaps = (bytes: number[], addresses: number[]) => {
  const maps: EcuMap[] = [];
  for (let i = 0, total = addresses.length; i < total; i++) {
    const nextMap = i + 1;
    const potentialMapSize =
      nextMap < total ? 2 + addresses[nextMap] - addresses[i] : Infinity;

    const map = new EcuMap(addresses[i], bytes, potentialMapSize);

    if (map.isValid) {
      if (map.createAxisMaps) {
        const axisMapX = new EcuMap(
          addresses[i],
          bytes,
          map.xAxis.count,
          map.xAxis
        );
        axisMapX.name = `[AXIS] ${map.name} - ${map.xAxis.descriptor.name}`;
        axisMapX.category = map.category;
        maps.push(axisMapX);

        if (map.yAxis.values.length > 0) {
          const axisMapY = new EcuMap(
            addresses[i],
            bytes,
            map.yAxis.count,
            map.yAxis
          );
          axisMapY.name = `[AXIS] ${map.name} - ${map.yAxis.descriptor.name}`;
          axisMapY.category = map.category;
          maps.push(axisMapY);
        }
      }
      maps.push(map);
    }
  }

  return maps;
};

export const findPartNumber = (buffer: Uint8Array) => {
  const pattern = [0x36, 0x32, 0x30]; // 620 in ASCII;
  const fragment = buffer.subarray(0, 0x2000);
  const location = findPattern(fragment, pattern);
  const end = location + 3;
  const start = end - 10;
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(fragment.slice(start, end).reverse());
};

export const getChecksum = (buffer: Uint8Array) => {
  return (
    buffer[0x1f00].toString(16).padStart(2, "0") +
    buffer[0x1f01].toString(16).padStart(2, "0")
  );
};

export const calcChecksum8Bit = (buffer: Uint8Array) => {
  // 0x0000 - 0x1EFF chk1
  // 0x2000 - 0x7fff chk2
  // 0x1F00 Chk location
  // Offset 0xB51F
  // Checksum1 + Checksum2 + 0xB51F

  const chk1 = buffer.subarray(0x0000, 0x1eff + 1).reduce((p, c) => p + c, 0);
  const chk2 = buffer.subarray(0x2000, 0x7fff + 1).reduce((p, c) => p + c, 0);
  const chkOffset = 0xb51f;
  const value = (chk1 + chk2 + chkOffset).toString(16);
  return value.substring(value.length - 4);
};

export const mapGroups: MapGroup[] = [
  {
    name: "Sensors",
    category: MapCategories.Sensors,
    items: [],
  },
  {
    name: "AFM",
    category: MapCategories.AFM,
    items: [],
  },
  {
    name: "Ignition",
    category: MapCategories.Ignition,
    items: [],
  },
  {
    name: "Injection",
    category: MapCategories.Injection,
    items: [],
  },
  {
    name: "Idle",
    category: MapCategories.Idle,
    items: [],
  },
  {
    name: "Rev Limiter",
    category: MapCategories.RevLimiter,
    items: [],
  },
  {
    name: "Map Axis",
    category: MapCategories.MapAxis,
    items: [],
  },
  {
    name: "Unknown",
    category: MapCategories.Unknown,
    items: [],
  },
];
