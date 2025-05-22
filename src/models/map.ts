import { findDescriptor, MapDescriptor } from "../utils/map-descriptors";
import {
  CAFR,
  CBase,
  CIgnitionBTDC,
  UnitConverter,
} from "../utils/unit-converters";

export class MapAxis {
  public values!: number[];
  public allValues!: number[];
  private _minRawValue = 0;
  private _maxRawValue = 0;
  private _minValue = 0;
  private _maxValue = 0;
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
  get size() {
    return this.count;
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
  get isTPS() {
    return this.descriptor?.name === "TPS";
  }
  get isSensor() {
    const str = this.descriptor?.name.toLowerCase() || "";
    return str.indexOf("linearization") >= 0 || str.indexOf("constant") >= 0;
  }
  get addressString() {
    const valStr = this.address.toString(16);
    return "0x" + valStr.padStart(4, "0");
  }

  private calcValues() {
    if (this.rawValues.length === 0) {
      this.values = [];
    } else {
      const suffixSums: number[] = new Array(this.rawValues.length);
      suffixSums[this.rawValues.length - 1] = this.rawValues[this.rawValues.length - 1];
      for (let i = this.rawValues.length - 2; i >= 0; i--) {
        suffixSums[i] = this.rawValues[i] + suffixSums[i + 1];
      }
      this.values = this.rawValues.map((_, i) => 256 - suffixSums[i]);
    }

    // _minRawValue and _maxRawValue should always be calculated from rawValues
    this._minRawValue = this.rawValues.length > 0 ? Math.min(...this.rawValues) : Infinity;
    this._maxRawValue = this.rawValues.length > 0 ? Math.max(...this.rawValues) : -Infinity;

    if (this.descriptor && this.descriptor.conversion) {
      const { conversion } = this.descriptor;
      this.values = this.values.map((v) => conversion(v));
      // Ensure values is not empty before trying to spread into Math.max/min for converted values
      if (this.values.length > 0) {
        this._maxValue = Math.max(...this.values);
        this._minValue = Math.min(...this.values);
      } else {
        // If values array is empty after conversion (unlikely but possible if rawValues was empty)
        // then _minValue and _maxValue should reflect this, e.g., 0 or specific defaults.
        // They are already initialized to 0, so this might be fine.
      }
    }
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

export class EcuMap {
  public dataAddress = 0;
  public xAxis: MapAxis;
  public yAxis: MapAxis;
  public rawValues: number[] = [];
  public values: number[] = [];
  public converter = CBase;
  public converters!: UnitConverter[];
  public createAxisMaps = false;
  //
  private _minRawValue = 0;
  private _maxRawValue = 0;
  private _minValue = 0;
  private _maxValue = 0;
  //

  public name = "Unknown";
  public category: MapCategories = MapCategories.Unknown;
  private _isValid = true;

  constructor(
    public address: number,
    public bytes: number[],
    private potentialSize: number,
    public baseAxisMap: MapAxis = null
  ) {
    if (this.baseAxisMap) {
      this.initAxis();
    } else {
      this.init();
    }
  }

  private initAxis() {
    const { address, potentialSize, baseAxisMap } = this;
    const dummyDescriptor = findDescriptor(0);
    const converter = baseAxisMap.descriptor.converter;
    const values = new Array(potentialSize).fill(0).map((v, i) => i);
    this.xAxis = new MapAxis(
      address,
      dummyDescriptor,
      this.potentialSize,
      values
    );
    this.yAxis = new MapAxis(address, dummyDescriptor, 1, []);
    this.dataAddress = baseAxisMap.address + 2;
    this.rawValues = baseAxisMap.rawValues;
    this.values = baseAxisMap.values;
    this._minRawValue = baseAxisMap.minRawValue;
    this._maxRawValue = baseAxisMap.maxRawValue;
    this.converter = converter;
  }

  private init() {
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

    return count > 32 || !descriptor.known || !yAxisFits
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
  get addressString() {
    const valStr = this.address.toString(16);
    return "0x" + valStr.padStart(4, "0");
  }

  get dataAddressString() {
    const valStr = this.dataAddress.toString(16);
    return "0x" + valStr.padStart(4, "0");
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

    if (this.rawValues.length > 1) {
      let allEqual = true;
      for (let i = 1; i < this.rawValues.length; i++) {
        if (this.rawValues[i] !== this.rawValues[0]) {
          allEqual = false;
          break;
        }
      }
      if (allEqual) {
        // Means all values are equal. Discard.
        // this._isValid = false;
      }
    }
  }

  private checkValues(values: number[]) {
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((p, v) => p + v, 0) / values.length,
    };
  }

  private couldBeIgnition() {
    const values = this.rawValues.map(CIgnitionBTDC.converter);
    const { min, max } = this.checkValues(values);
    return {
      is: min > -6 && max < 60 && values.length > 2,
      values,
    };
  }

  private couldBeFuel() {
    const values = this.rawValues.map(CAFR.converter);
    const { min, max } = this.checkValues(values);
    return {
      is: min >= 8 && max <= 25 && values.length > 2,
      values,
    };
  }
  private setAsIgnitionMap(prefix: string) {
    this.converter = CIgnitionBTDC;
    this.values = this.rawValues.map(CIgnitionBTDC.converter);
    this.name = `Advance ${prefix} (BTDC)`;
    this.category = MapCategories.Ignition;
  }
  private setAsFuelMap(prefix: string) {
    this.converter = CAFR;
    this.values = this.rawValues.map(CAFR.converter);
    this.category = MapCategories.Injection;
    this.name = `Fuel ${prefix} (AFR)`;
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
    const RPMVsLoad = this.xAxis.isRPM && this.yAxis.isLoad;
    const couldBeIgnition = this.couldBeIgnition();
    const couldBeFuel = this.couldBeFuel();
    const bigMap = xSize >= 12 && xSize <= 16 && ySize >= 6 && ySize <= 16;
    const wotMap = xSize >= 16 && ySize === 1;
    const idleMap =
      this.xAxis.isCoolant &&
      xSize === 4 &&
      this.maxRawValue <= 150 &&
      this.minRawValue >= 60;

    if (wotMap && !this.baseAxisMap) {
      if (couldBeIgnition.is) {
        this.setAsIgnitionMap("WOT");
      } else if (couldBeFuel.is) {
        this.setAsFuelMap("WOT");
      }
      if (this.xAxis.descriptor.known) {
        this.createAxisMaps = true;
      }
    } else if (RPMVsLoad && bigMap && this.maxRawValue < 250) {
      const partType = this.yAxis.minValue < 3 ? "Low " : "High ";
      if (couldBeIgnition.is) {
        this.setAsIgnitionMap(partType);
      } else if (couldBeFuel.is) {
        this.setAsFuelMap(partType);
      }
      this.createAxisMaps = true;
    } else if (idleMap) {
      this.category = MapCategories.Idle;
      this.name = `Idle speed`;
    } else if (this.xAxis.isRPM && this.yAxis?.isIAT && couldBeFuel.is) {
      this.setAsFuelMap("");
      this.name = `Fuel Enrichment vs IAT`;
    } else if (this.xAxis.isRPM && this.yAxis?.descriptor.name === "Volts") {
      this.category = MapCategories.Ignition;
      this.name = `Ignition Dwell`;
    } else if (this.xAxis.isSensor) {
      this.category = MapCategories.Sensors;
    }
  }
}

export interface AsideMap {
  map: EcuMap;
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
  MapAxis,
  AFM,
  Unknown,
}
