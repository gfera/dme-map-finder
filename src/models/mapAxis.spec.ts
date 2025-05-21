import { describe, it, expect } from 'vitest';
import { MapAxis } from './map'; // Assuming EcuMap and MapAxis are in map.ts
import type { MapDescriptor } from '../utils/map-descriptors'; // For type only

// Minimal mock for MapDescriptor for testing purposes
const createMockDescriptor = (name: string, conversion?: (val: number) => number): MapDescriptor => ({
  name,
  conversion,
  known: true,
  // Add other properties if MapAxis relies on them, otherwise keep minimal
  converter: { // Assuming MapDescriptor needs a converter property based on EcuMap usage
    name: 'mock',
    units: 'mock',
    converter: (val: number) => val, // identity
    formatter: (val: number) => val.toString(),
  }
});

describe('MapAxis', () => {
  describe('constructor and basic properties', () => {
    const mockRawValues = [10, 20, 30];
    const mockDescriptor = createMockDescriptor('RPM');
    const axis = new MapAxis(0x1000, mockDescriptor, mockRawValues.length, mockRawValues);

    it('should initialize basic properties correctly', () => {
      expect(axis.address).toBe(0x1000);
      expect(axis.descriptor).toBe(mockDescriptor);
      expect(axis.count).toBe(mockRawValues.length);
      expect(axis.rawValues).toEqual(mockRawValues);
    });

    it('should calculate totalSize correctly', () => {
      expect(axis.totalSize).toBe(mockRawValues.length + 2); // count + 2
      const singleValueAxis = new MapAxis(0x1000, null, 1, [10]);
      expect(singleValueAxis.totalSize).toBe(0); // count > 1 is false
    });

    it('should calculate size correctly', () => {
      expect(axis.size).toBe(mockRawValues.length);
    });

    it('should format addressString correctly', () => {
      expect(axis.addressString).toBe('0x1000');
      const anotherAxis = new MapAxis(0xff, null, 3, [1, 2, 3]);
      expect(anotherAxis.addressString).toBe('0x00ff');
    });

    it('should identify RPM axis', () => {
      expect(axis.isRPM).toBe(true);
      const nonRpmAxis = new MapAxis(0x1000, createMockDescriptor('LOAD'), 3, [1,2,3]);
      expect(nonRpmAxis.isRPM).toBe(false);
    });

    it('should identify Load axis', () => {
      const loadAxis = new MapAxis(0x1000, createMockDescriptor('Load'), 3, [1,2,3]);
      expect(loadAxis.isLoad).toBe(true);
      expect(axis.isLoad).toBe(false);
    });

    it('should identify Coolant axis (CTS)', () => {
      const ctsAxis = new MapAxis(0x1000, createMockDescriptor('CTS'), 3, [1,2,3]);
      expect(ctsAxis.isCoolant).toBe(true);
      expect(axis.isCoolant).toBe(false);
    });

    it('should identify IAT axis', () => {
      const iatAxis = new MapAxis(0x1000, createMockDescriptor('IAT'), 3, [1,2,3]);
      expect(iatAxis.isIAT).toBe(true);
      expect(axis.isIAT).toBe(false);
    });

    it('should identify TPS axis', () => {
      const tpsAxis = new MapAxis(0x1000, createMockDescriptor('TPS'), 3, [1,2,3]);
      expect(tpsAxis.isTPS).toBe(true);
      expect(axis.isTPS).toBe(false);
    });
    
    it('should identify Sensor axis', () => {
      const sensorAxis1 = new MapAxis(0x1000, createMockDescriptor('Something Linearization'),3,[1,2,3]);
      expect(sensorAxis1.isSensor).toBe(true);
      const sensorAxis2 = new MapAxis(0x1000, createMockDescriptor('Some Constant'),3,[1,2,3]);
      expect(sensorAxis2.isSensor).toBe(true);
      expect(axis.isSensor).toBe(false);
    });
  });

  describe('calcValues', () => {
    it('should handle empty rawValues', () => {
      const axis = new MapAxis(0x2000, null, 0, []);
      expect(axis.values).toEqual([]);
      expect(axis.minRawValue).toBe(Infinity); // Math.min() behavior
      expect(axis.maxRawValue).toBe(-Infinity); // Math.max() behavior
      expect(axis.minValue).toBe(0); // Default from _minValue
      expect(axis.maxValue).toBe(0); // Default from _maxValue
    });

    it('should calculate values correctly without descriptor conversion', () => {
      const raw = [10, 20, 30]; // Expected: [256-30-20-10, 256-30-20, 256-30] = [196, 206, 226]
      const axis = new MapAxis(0x2000, null, raw.length, raw);
      expect(axis.values).toEqual([196, 206, 226]);
      expect(axis.minRawValue).toBe(10);
      expect(axis.maxRawValue).toBe(30);
      // Without conversion, _minValue and _maxValue are not updated from defaults by map/reduce on values
      expect(axis.minValue).toBe(0); 
      expect(axis.maxValue).toBe(0);
    });

    it('should calculate values for a single rawValue', () => {
      const raw = [56]; // Expected: [256-56] = [200]
      const axis = new MapAxis(0x2000, null, raw.length, raw);
      expect(axis.values).toEqual([200]);
      expect(axis.minRawValue).toBe(56);
      expect(axis.maxRawValue).toBe(56);
      expect(axis.minValue).toBe(0);
      expect(axis.maxValue).toBe(0);
    });
    
    it('should apply descriptor conversion and update min/max values', () => {
      const mockDescriptorWithConversion = createMockDescriptor('Test', v => v * 2);
      const raw = [10, 20, 30]; // Original calculated: [196, 206, 226]
                               // Converted: [392, 412, 452]
      const axis = new MapAxis(0x2000, mockDescriptorWithConversion, raw.length, raw);
      expect(axis.values).toEqual([392, 412, 452]);
      expect(axis.minRawValue).toBe(10);
      expect(axis.maxRawValue).toBe(30);
      expect(axis.minValue).toBe(392);
      expect(axis.maxValue).toBe(452);
    });

    it('should handle conversion that changes order for min/max values', () => {
      // Conversion makes the smallest raw value the largest converted value
      const mockDescriptorWithConversion = createMockDescriptor('Test', v => 1000 - (v * 10));
      const raw = [10, 50]; // Original calculated: [256-50-10, 256-50] = [196, 206]
                             // Converted: [1000-1960, 1000-2060] = [-960, -1060]
      const axis = new MapAxis(0x2000, mockDescriptorWithConversion, raw.length, raw);
      expect(axis.values).toEqual([-960, -1060]);
      expect(axis.minRawValue).toBe(10);
      expect(axis.maxRawValue).toBe(50);
      expect(axis.minValue).toBe(-1060);
      expect(axis.maxValue).toBe(-960);
    });

    it('should correctly set min/max for converted values if all are same', () => {
        const mockDescriptorWithConversion = createMockDescriptor('Test', v => v + 5);
        const raw = [10, 10, 10]; // Original calculated: [256-10-10-10, 256-10-10, 256-10] = [226, 236, 246]
                                 // Converted: [231, 241, 251]
        const axis = new MapAxis(0x2000, mockDescriptorWithConversion, raw.length, raw);
        expect(axis.values).toEqual([231, 241, 251]);
        expect(axis.minRawValue).toBe(10);
        expect(axis.maxRawValue).toBe(10);
        expect(axis.minValue).toBe(231);
        expect(axis.maxValue).toBe(251);
      });
  });
});
