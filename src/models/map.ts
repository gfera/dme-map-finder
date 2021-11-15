import { findDescriptor, MapDescriptor } from "../utils/map-descriptors";
import { CAFR, CIgnitionBTDC } from "../utils/unit-converters";

export class MapAxis {
  public values!: number[];
  public allValues!: number[];
  private _minRawValue: number = 0;
  private _maxRawValue: number = 0;
  private _minValue: number = 0;
  private _maxValue: number = 0;
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
      this._maxValue = Math.max(...this.values);
      this._minValue = Math.min(...this.values);
    }
    this._minRawValue = Math.min(...this.rawValues);
    this._maxRawValue = Math.max(...this.rawValues);
  }

  get minValue() {
    return this._minValue;
  }
  get maxValue() {
    return this._maxValue;
  }
  get minRawValue() {
    return this._minRawValue;
  }
  get maxRawValue() {
    return this._maxRawValue;
  }
}

export class Map {
  public dataAddress: number = 0;
  public xAxis: MapAxis;
  public yAxis: MapAxis;
  public rawValues: number[] = [];
  public values: number[] = [];
  //
  private _minRawValue: number = 0;
  private _maxRawValue: number = 0;
  private _minValue: number = 0;
  private _maxValue: number = 0;
  //

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

  private analyzeAxis(
    address: number,
    array: number[],
    currMapSize: number,
    potentialSize: number
  ) {
    const descriptor = findDescriptor(array[0]);
    const count = array[1];
    const values = array.slice(2, count + 2);
    const yAxisFits = currMapSize < potentialSize;
    return count > 16 || !descriptor.known || !yAxisFits
      ? new MapAxis(-1, descriptor, 1, [])
      : new MapAxis(address, descriptor, count, values);
  }

  get minValue() {
    return this._minValue;
  }
  get maxValue() {
    return this._maxValue;
  }
  get minRawValue() {
    return this._minRawValue;
  }
  get maxRawValue() {
    return this._maxRawValue;
  }
  get isValid() {
    return this._isValid;
  }

  private findAxis() {
    const { address, bytes, potentialSize } = this;
    const xAxis: MapAxis | null = this.analyzeAxis(
      address,
      bytes.slice(address),
      0,
      potentialSize
    );
    if (!xAxis || !xAxis.descriptor.known) {
      this._isValid = false;
      return null;
    }
    this.xAxis = xAxis;

    const mapSize = xAxis.totalSize + xAxis.count;
    const yAxisAddress = address + xAxis.totalSize;

    this.yAxis = this.analyzeAxis(
      yAxisAddress,
      bytes.slice(yAxisAddress, yAxisAddress + 14),
      mapSize,
      potentialSize
    );
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
    this._minRawValue = Math.min(...this.rawValues);
    this._maxRawValue = Math.max(...this.rawValues);
    if (
      this.rawValues.filter((v, i, arr) => arr.indexOf(v) === i).length === 1
    ) {
      // Means all values are equal. Discard.
      this._isValid = false;
    }
  }

  private checkValues(values: number[]) {
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((p, v) => p + v, 0) / values.length,
    };
  }

  private fuelOrIgnition(prefix: string) {
    const ignitionValues = this.checkValues(
      this.rawValues.map(CIgnitionBTDC.converter)
    );
    const fuelValues = this.checkValues(this.rawValues.map(CAFR.converter));
    this.custProps = {
      ...this.custProps,
      ignitionValues,
      fuelValues,
    };
    if (ignitionValues.max < 60) {
      this.values = this.rawValues.map(CIgnitionBTDC.converter);
      this.name = `${prefix} Ignition (BTDC)`;
      this.category = MapCategories.Ignition;
    } else if (fuelValues.min > 8 && fuelValues.max <= 25) {
      this.values = this.rawValues.map(CAFR.converter);
      this.category = MapCategories.Injection;
      this.name = `${prefix} Injection (AFR)`;
    }
  }

  public custProps = null;

  private clasifyMap() {
    const xSize = this.xAxis.count;
    const ySize = this.yAxis?.count || 1;
    this._maxRawValue = Math.max(...this.rawValues);
    this._minRawValue = Math.min(...this.rawValues);

    // Default unknown
    this.values = this.rawValues;
    this.name = `${xSize}x${ySize} ${this.xAxis.descriptor.name}`;
    if (ySize > 1) {
      this.name += ` vs ${this.yAxis.descriptor.name}`;
    }

    // Detect patterns
    const around128Values = this.minRawValue >= 100 && this.maxRawValue <= 150;
    const RPMVsLoad = this.xAxis.isRPM && this.yAxis.isLoad;
    const bigMap = xSize >= 12 && xSize <= 16 && ySize >= 6 && ySize <= 16;
    const wotMap = xSize >= 16 && ySize === 1;
    const idleMap =
      this.xAxis.isCoolant &&
      xSize === 4 &&
      this.maxRawValue <= 120 &&
      this.minRawValue >= 60;

    this.custProps = {
      around128Values,
      RPMVsLoad,
      bigMap,
      wotMap,
      idleMap,
    };
    if (wotMap) {
      this.fuelOrIgnition("WOT");
    } else if (RPMVsLoad && bigMap && this.maxRawValue < 250) {
      const partType = this.yAxis.minValue < 3 ? "Low " : "High ";
      this.fuelOrIgnition(partType);
    } else if (idleMap) {
      this.category = MapCategories.Idle;
      this.name = `Idle speed`;
    } else if (this.xAxis.isRPM && this.yAxis?.isIAT && around128Values) {
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
