import { Map, MapAxis, MapCategories } from "../models/map";
import { findPattern } from "./misc";

const LimiterConversionFactor = 7500000;

export class RevLimiter {
  private factor: number;
  constructor(
    public location: number,
    public byte1: number,
    public byte2: number
  ) {
    this.factor = Math.pow(2, this.byte2);
  }

  get toRPM() {
    return Math.round(LimiterConversionFactor / (this.byte1 * this.factor));
  }
  update(rpm: number) {
    this.byte1 = Math.round(LimiterConversionFactor / rpm / this.factor);
  }
}

export const findRevLimiter = (buffer: Uint8Array): Map[] => {
  // Pre limiter pattern: ffff020101[????][RPM][03]
  const maps: Map[] = [];
  const bytes = [0xff, 0xff, 0x02, 0x01, 0x01];
  const location = findPattern(buffer, bytes);
  const firstLimiter = location > 0 ? location + 7 : -1;
  const secondLimiter =
    firstLimiter > 0 ? findPattern(buffer, bytes, firstLimiter) + 7 : -1;

  const limiter1: RevLimiter =
    firstLimiter !== -1
      ? new RevLimiter(
          firstLimiter,
          buffer[firstLimiter],
          buffer[firstLimiter + 1]
        )
      : null;
  const limiter2: RevLimiter = limiter1
    ? new RevLimiter(
        secondLimiter,
        buffer[secondLimiter],
        buffer[secondLimiter + 1]
      )
    : null;
  if (limiter1) {
    const map = new Map(limiter1.location, [limiter1.byte1], 1);
    map.name = "Rev Limiter 1";
    map.category = MapCategories.RevLimiter;
    map.xAxis = new MapAxis(0, null, 1, []);
    map.yAxis = new MapAxis(0, null, 1, []);
    map.rawValues = [limiter1.byte1];
    map.values = [limiter1.toRPM];
    maps.push(map);
  }
  if (limiter2) {
    const map = new Map(limiter2.location, [limiter2.byte1], 1);
    map.name = "Rev Limiter 2";
    map.category = MapCategories.RevLimiter;
    map.xAxis = new MapAxis(0, null, 1, []);
    map.yAxis = new MapAxis(0, null, 1, []);
    map.rawValues = [limiter2.byte1];
    map.values = [limiter2.toRPM];
    maps.push(map);
  }
  return maps;
};
