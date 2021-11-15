export class UnitConverter {
  constructor(
    public name: string,
    public converter: (v: number) => number,
    public xdfconverter: string,
    public unit: string = ""
  ) {}
}

export const CIgnitionBTDC = new UnitConverter(
  "Ignition",
  (v: number) => v * 0.75 - 22.5,
  "(X*0.75)-22.5"
);

export const CLoad = new UnitConverter(
  "Load",
  (v: number) => Math.round(v * 0.05 * 10) / 10,
  "(X*0.05)",
  "ms"
);

export const CTPS = new UnitConverter(
  "TPS",
  (v: number) => v * 0.41667 - 5.34,
  "(X*0.41667 - 5.34)"
);

export const CRPM = new UnitConverter(
  "RPM",
  (v: number) => parseFloat((v * 40).toFixed(1)),
  "X*40"
);

export const CAirTemperature = new UnitConverter(
  "Air Temp",
  (v: number) => parseFloat((v * 0.65 - 33.5).toFixed(1)),
  "X*0.65-33.5",
  "c"
);
export const CVolts = new UnitConverter(
  "Volts",
  (v: number) => parseFloat((v * 0.0681).toFixed(1)),
  "X*0.0681",
  "v"
);
export const CCoolant = new UnitConverter(
  "Coolant",
  (v: number) => parseFloat((v * 0.65 - 33.5).toFixed(1)),
  "X*0.65-32.5",
  "c"
);

export const CAFR = new UnitConverter(
  "AFR",
  (v: number) => parseFloat((1881.6 / v).toFixed(1)),
  "1881.6/X",
  "λ"
);

export const CAirMass = new UnitConverter(
  "AirMass",
  (v: number) => parseFloat((v * 0.2).toFixed(1)),
  "X*.02",
  "Kg/h"
);
