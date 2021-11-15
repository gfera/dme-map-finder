import {
  CAirMass,
  CAirTemperature,
  CCoolant,
  CIgnitionBTDC,
  CLoad,
  CRPM,
  CTPS,
  CVolts,
  UnitConverter,
} from "./unit-converters";

export interface MapDescriptor {
  name: string;
  value: number;
  conversion?: (raw: number) => number;
  unit: string;
  known: boolean;
}

const createDescriptor = (
  name: string,
  value: number,
  converter?: UnitConverter
): MapDescriptor => ({
  name,
  value,
  conversion: converter?.converter,
  unit: converter?.unit,
  known: true,
});

const allDescriptors = [
  createDescriptor("RPM", 0x3b, CRPM),
  createDescriptor("Speed", 0xb8),
  createDescriptor("Fuel Enrich", 0xb0),
  createDescriptor("Idle Fuel Trim", 0x03),
  createDescriptor("Short Term Fuel Trim", 0x0f),
  createDescriptor("TPS", 0x30, CTPS),
  createDescriptor("Injector constant", 0x3a),
  createDescriptor("O2 Volts Max", 0xc0),
  createDescriptor("O2 Volts Min", 0xc1),
  createDescriptor("O2", 0x79),
  createDescriptor("O2", 0x70),
  createDescriptor("CTS Linearization", 0x04),
  createDescriptor("Load", 0x40, CLoad),
  createDescriptor("Injection", 0x6f, CLoad),
  createDescriptor("RPM Constant", 0x50),
  createDescriptor("CTS", 0x38, CCoolant),
  createDescriptor("Volts", 0x36, CVolts),
  createDescriptor("IAT", 0x37, CAirTemperature),
  createDescriptor("IAC", 0x67),
  createDescriptor("IAC2", 0x49),
  createDescriptor("A/C Pressure", 0xc4),
  createDescriptor("Air Mass", 0xb3, CAirMass),
];

export const findDescriptor = (value: number): MapDescriptor =>
  allDescriptors.find((d) => d.value === value) ||
  createDescriptor("Unknown", value);
