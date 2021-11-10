import { findDescriptor, MapDescriptor } from "../utils/map-descriptors";
import { CAFR, CIgnitionBTDC } from "../utils/unit-converters";

export class MapAxis {
  public values!: number[];
  public allValues!: number[];
  constructor(
    public address: number,
    public descriptor: MapDescriptor | null,
    public count: number,
    public rawValues: number[]
  ) {
    this.calcValues();
  }
  get totalSize() {
    return this.count > 1 ? this.count + 2 : 0;
  }
  get isRPM() {
    return this.descriptor?.name === "RPM";
  }
  get isLoad() {
    return this.descriptor?.name === "Load";
  }
  get isCoolant() {
    return this.descriptor?.name === "CTS";
  }
  get isIAT() {
    return this.descriptor?.name === "IAT";
  }
  get isSensor() {
    const str = this.descriptor?.name.toLowerCase() || "";
    return str.indexOf("linearization") >= 0 || str.indexOf("constant") >= 0;
  }
  private calcValues() {
    this.values = this.rawValues.map((_, i) => {
      return this.rawValues.reduceRight((prev, next, idx) => {
        return idx >= i ? prev - next : prev;
      }, 256);
    });
    if (!this.descriptor) return;
    const { conversion } = this.descriptor;
    if (conversion) {
      this.values = this.values.map((v) => conversion(v));
    }
  }
}

export class Map {
  public dataAddress: number = 0;
  public xAxis: MapAxis;
  public yAxis: MapAxis;
  public rawValues: number[];
  public values: number[];
  public name: string = "Unknown";
  public category: MapCategories = MapCategories.Unknown;
  private _isValid: boolean = true;

  constructor(
    public address: number,
    public bytes: number[],
    private potentialSize: number
  ) {
    this.findAxis();
    if (this.isValid) {
      this.findData();
      this.clasifyMap();
    }
  }

  private analyzeAxis(address: number, array: number[]) {
    const descriptor = findDescriptor(array[0]);
    const count = array[1];
    const values = array.slice(2, count + 2);
    return count > 16 ? null : new MapAxis(address, descriptor, count, values);
  }

  get isValid() {
    return this._isValid;
  }

  private findAxis() {
    const { address, bytes, potentialSize } = this;
    const xAxis: MapAxis | null = this.analyzeAxis(
      address,
      bytes.slice(address)
    );
    if (!xAxis) {
      this._isValid = false;
      return null;
    }
    this.xAxis = xAxis;

    const mapSize = xAxis.totalSize + xAxis.count;
    const yAxisAddress = address + xAxis.totalSize;

    if (mapSize < potentialSize) {
      this.yAxis = this.analyzeAxis(
        yAxisAddress,
        bytes.slice(yAxisAddress, yAxisAddress + 14)
      );
    } else {
      this.yAxis = new MapAxis(-1, null, 1, []);
    }
    if (this.xAxis.count < 3 || !this.yAxis) {
      this._isValid = false;
    }
  }

  private findData() {
    const { xAxis, yAxis } = this;
    if (!xAxis) {
      this._isValid = false;
      return;
    }
    const dataSize = xAxis.count * (yAxis?.count || 1);
    this.dataAddress = this.address + xAxis.totalSize + (yAxis?.totalSize || 0);
    this.rawValues = this.bytes.slice(
      this.dataAddress,
      this.dataAddress + dataSize
    );
    if (
      this.rawValues.filter((v, i, arr) => arr.indexOf(v) === i).length === 1
    ) {
      // Means all values are equal. Discard.
      this._isValid = false;
    }
  }
  private clasifyMap() {
    const xSize = this.xAxis.count;
    const ySize = this.yAxis?.count || 1;
    const max = Math.max(...this.rawValues);
    const min = Math.min(...this.rawValues);
    let prefix = Math.min(...this.yAxis.values) < 40 ? "Low" : "High";

    // Default unknown
    this.values = this.rawValues;
    this.name = `? ${this.xAxis.descriptor?.name}`;
    if (ySize > 1) {
      this.name += ` vs ${this.yAxis.descriptor?.name}`;
    }

    // Detect patterns
    const around128Values = min >= 100 && max <= 150;
    const RPMVsLoad = this.xAxis.isRPM && this.yAxis.isLoad;
    const bigMap = xSize >= 12 && xSize < 16 && ySize >= 6 && ySize <= 16;
    const wotMap = xSize >= 14;
    const idleMap =
      this.xAxis.isCoolant &&
      xSize === 4 &&
      (this.rawValues[0] === 120 || this.rawValues[0] === 110);

    if ((RPMVsLoad && bigMap) || wotMap) {
      prefix = xSize >= 16 && ySize === 1 ? "WOT" : prefix;
      if (max < 120) {
        this.values = this.rawValues.map(CIgnitionBTDC.converter);
        this.name = `${prefix} Ignition (BTDC)`;
        this.category = MapCategories.Ignition;
      } else if (min > 0 && max < 200) {
        this.values = this.rawValues.map(CAFR.converter);
        this.category = MapCategories.Injection;
        this.name = `${prefix} Injection (AFR)`;
      }
    } else if (idleMap) {
      this.category = MapCategories.Idle;
      this.name = `Idle speed`;
    } else if (this.xAxis.isRPM && this.yAxis.isIAT && around128Values) {
      this.category = MapCategories.Injection;
      this.name = `Fuel Enrichment vs IAT`;
    } else if (this.xAxis.isSensor) {
      this.category = MapCategories.Sensors;
    }
  }
}

export interface AsideMap {
  map: Map;
  opened: boolean;
}

export interface MapGroup {
  name: string;
  category: MapCategories;
  items: AsideMap[];
}

export enum MapCategories {
  Sensors,
  Ignition,
  Injection,
  Idle,
  RevLimiter,
  Unknown,
}
