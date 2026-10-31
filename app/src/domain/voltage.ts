export const VOLTAGE_CRITERION = "tensao";
export const VOLTAGES = [127, 220] as const;
export type Voltage = (typeof VOLTAGES)[number];

export function voltagePairs(value: unknown): string[] {
  return typeof value === "string" && value !== "" ? value.split(";") : [];
}

// Mirrors outlet_voltage in pipeline/coleta/fontes/aneel_tensoes.py; both must group the same way.
export function outletVoltage(pair: string): Voltage {
  const neutral = Math.min(...pair.split("/").map((part) => Number(part.replace(",", "."))));
  return Math.abs(neutral - 127) < Math.abs(neutral - 220) ? 127 : 220;
}
