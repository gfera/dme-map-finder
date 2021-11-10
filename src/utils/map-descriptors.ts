import {
  CAirMass,
  CAirTemperature,
  CCoolant,
  CRPM,
  CVolts,
  UnitConverter,
} from "./unit-converters";

export interface MapDescriptor {
  name: string;
  value: number;
  conversion?: (raw: number) => number;
  unit: string;
}

const createDescriptor = (
  name: string,
  value: number,
  converter?: UnitConverter
) => ({
  name,
  value,
  conversion: converter?.converter,
  unit: converter?.unit,
});

const allDescriptors = [
  createDescriptor("RPM", 0x3b, CRPM),
  createDescriptor("TPS?", 0x30),
  createDescriptor("Injector constant?", 0x3a),
  createDescriptor("CTS Linearization", 0x04),
  createDescriptor("Load", 0x40),
  createDescriptor("RPM Constant", 0x50),
  createDescriptor("CTS", 0x38, CCoolant),
  createDescriptor("Volts", 0x36, CVolts),
  createDescriptor("IAT", 0x37, CAirTemperature),
  createDescriptor("Air Mass", 0xb3, CAirMass),
];

export const findDescriptor = (value: number): MapDescriptor =>
  allDescriptors.find((d) => d.value === value) ||
  createDescriptor("Unknown", value);
