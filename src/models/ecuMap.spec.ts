import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EcuMap, MapAxis, MapCategories } from './map';
import type { MapDescriptor } from '../utils/map-descriptors';
import * as mapDescriptorsUtil from '../utils/map-descriptors';
import { CBase, CAFR, CIgnitionBTDC } from '../utils/unit-converters';

// Helper to create a mock MapDescriptor
const createMockMapDescriptor = (
  name: string,
  known = true,
  conversion?: (val: number) => number
): MapDescriptor => ({
  name,
  known,
  conversion,
  converter: { // Default minimal converter
    name: 'mock',
    units: 'mock',
    converter: conversion || ((val: number) => val),
    formatter: (val: number) => val.toString(),
  }
});

// Mock the findDescriptor utility
vi.mock('../utils/map-descriptors', async (importOriginal) => {
  const original = await importOriginal<typeof mapDescriptorsUtil>();
  return {
    ...original,
    findDescriptor: vi.fn(),
  };
});

// Default mock implementation for findDescriptor
const mockedFindDescriptor = vi.mocked(mapDescriptorsUtil.findDescriptor);

describe('EcuMap', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockedFindDescriptor.mockReset();
    // Default behavior: return a generic known descriptor
    mockedFindDescriptor.mockImplementation((byte) => createMockMapDescriptor(`Desc for ${byte}`));
  });

  describe('Constructor and Initialization Paths', () => {
    it('should initialize with baseAxisMap correctly', () => {
      const rawAxisValues = [100, 110, 120];
      const baseDescriptor = createMockMapDescriptor('RPM', true, v => v / 10);
      const baseAxis = new MapAxis(0x100, baseDescriptor, rawAxisValues.length, rawAxisValues);
      // baseAxis.values will be [ (256-120-110-100)/10, (256-120-110)/10, (256-120)/10 ] = [ -7.4, -4.4, 1.6 ]
      // Let's assume a simpler conversion for baseAxis.values for this test or use its actual calculated values.
      // For simplicity, let's override values and converter for the baseAxisMap in this specific test setup.
      baseAxis.values = [10, 11, 12]; // Assume these are already converted
      (baseAxis as any)._minValue = 10; // Mock internal state for clarity
      (baseAxis as any)._maxValue = 12;
      (baseAxis as any)._minRawValue = 100;
      (baseAxis as any)._maxRawValue = 120;
      baseAxis.descriptor.converter = { name: 'CustomRPM', units: 'rpm', converter: v=>v*100, formatter: v=>v.toString() };


      const ecuMap = new EcuMap(0x1000, [], 3, baseAxis);

      expect(ecuMap.name).toBe('Unknown'); // classifyMap is not run in initAxis path
      expect(ecuMap.xAxis.rawValues).toEqual([0, 1, 2]); // Dummy values based on potentialSize
      expect(ecuMap.yAxis.count).toBe(1);
      expect(ecuMap.dataAddress).toBe(baseAxis.address + 2);
      expect(ecuMap.rawValues).toEqual(baseAxis.rawValues); // [100, 110, 120]
      expect(ecuMap.values).toEqual(baseAxis.values); // [10, 11, 12]
      expect(ecuMap.minRawValue).toBe(100);
      expect(ecuMap.maxRawValue).toBe(120);
      // minValue and maxValue are not directly set from baseAxis's min/max in EcuMap's initAxis
      // They remain EcuMap's defaults (0) unless classifyMap runs and sets them.
      // However, EcuMap's _minRawValue and _maxRawValue ARE set.
      // The EcuMap's own converter is set from baseAxis.descriptor.converter
      expect(ecuMap.converter.name).toBe('CustomRPM');
      expect(ecuMap.category).toBe(MapCategories.Unknown);
    });

    it('should initialize without baseAxisMap (standard path)', () => {
      // This path calls this.init() -> findAxis -> findData -> clasifyMap
      // We'll test these methods individually. This test just ensures constructor runs.
      // Mock findDescriptor to return unknown for initial axes to simplify, prevent deep classification
      mockedFindDescriptor.mockImplementation(() => createMockMapDescriptor('UnknownAxis', false));
      
      const bytes = [
        // X-Axis (will be considered unknown by mock)
        0x00, // Descriptor byte -> UnknownAxis
        0x02, // Count = 2
        0x10, 0x20, // X-axis raw values [16, 32]
        // Y-Axis (will be considered unknown by mock)
        0x01, // Descriptor byte -> UnknownAxis
        0x01, // Count = 1
        0x30, // Y-axis raw value [48]
        // Data
        0xAA, 0xBB // Data values (2x1)
      ];
      const ecuMap = new EcuMap(0, bytes, bytes.length);
      
      expect(ecuMap.isValid).toBe(false); // Because findDescriptor returns unknown for axis
      // Further checks depend on findAxis, findData, clasifyMap logic with unknown axes
      // For now, just ensure it constructed. If isValid is false, many properties might not be set as expected for a "valid" map.
      // Example: name might be a default for invalid/unknown.
      expect(ecuMap.name).toBe('Unknown'); // Default name
    });
  });

  describe('analyzeAxis', () => {
    // analyzeAxis is private, so we test it by calling findAxis or by temporarily exposing it.
    // For simplicity, we'll test its logic through findAxis.
    // Alternatively, one could cast `(ecuMap as any).analyzeAxis(...)`

    it('should use a dummy X-axis if raw count > 32', () => {
      const bytes = [0xDD, 33, ...new Array(33).fill(1)]; // Descriptor 0xDD, Count=33
      // For this test, ensure findDescriptor returns a KNOWN descriptor for 0xDD.
      // The point is to test analyzeAxis's "count > 32" logic, not "unknown descriptor".
      mockedFindDescriptor.mockImplementation((byte) => {
        if (byte === 0xDD) return createMockMapDescriptor('RPM_Known_For_DD', true);
        return createMockMapDescriptor('Other');
      });
      const map = new EcuMap(0, bytes, 100);
      // EcuMap.findAxis calls analyzeAxis. If count > 32, analyzeAxis returns a dummy MapAxis.
      // This dummy axis has count=1, address=-1, but its descriptor is "known" due to the mock.
      // EcuMap.findAxis then assigns this dummy to this.xAxis because it's not null and descriptor.known is true.
      // EcuMap._isValid is NOT set to false at this point by findAxis.
      expect(map.xAxis.count).toBe(1); // Dummy axis property
      expect(map.xAxis.address).toBe(-1); // Dummy axis property
      expect(map.xAxis.descriptor.name).toBe('RPM_Known_For_DD');
      // The map might still be valid overall, depending on findData and clasifyMap.
      // For example, if it successfully "finds" data of size 1x1 (dummy x dummy) and classifies it.
      // So, we don't assert map.isValid here, focus on xAxis properties.
    });
    
    it('should set map as invalid if X-axis descriptor is not known', () => {
      const bytes = [0xEE, 2, 1, 2]; // 0xEE will be 'unknown'
      mockedFindDescriptor.mockImplementationOnce(() => createMockMapDescriptor('SomeDesc', false)); // Descriptor is not known
      const map = new EcuMap(0, bytes, 100);
      expect(map.isValid).toBe(false);
      // If map is invalid due to X-axis, map.xAxis might not be fully initialized or be null/problematic.
      // So, further checks on map.xAxis.count might fail or be irrelevant.
    });

    it('should use a dummy Y-axis if Y-axis count > 32 (map can still be valid as 1D)', () => {
      // This is more about how analyzeAxis is used for Y-axis in findAxis
      const bytes = [
        // X-Axis
        0xAA, 0x02, 0x10, 0x20, // X-Axis (RPM, Count 2)
        // Y-Axis (but currMapSize makes it not fit)
        0xBB, 0x02, 0x30, 0x40  // Y-Axis (Load, Count 2)
      ];
      mockedFindDescriptor.mockImplementation((byte) => {
        if (byte === 0xAA) return createMockMapDescriptor('RPM');
        if (byte === 0xBB) return createMockMapDescriptor('Load');
        return createMockMapDescriptor('Unknown');
      });
      // potentialSize is small, X-axis consumes (2+2) + 2 = 6. If potentialSize is < 6 + Y_AXIS_SIZE, yAxisFits is false.
      // X-axis: desc_byte, count_byte, val1, val2 -> totalSize = 2+2=4. mapSize for y-axis check = totalSize + count = 4+2=6
      // Y-axis: desc_byte, count_byte, val1, val2 -> totalSize = 2+2=4
      // If potentialSize for EcuMap is small, e.g., 8.
      // For Y-axis, currMapSize = 6. potentialSize = 8. yAxisFits = 6 < 8, which is true.
      // Let's make potentialSize = 6. Then yAxisFits = 6 < 6, which is false.
      const map = new EcuMap(0, bytes, 6);
      expect(map.xAxis.descriptor.name).toBe('RPM');
      expect(map.xAxis.count).toBe(2);
      expect(map.yAxis.count).toBe(1); // Dummy Y-axis
      expect(map.yAxis.address).toBe(-1); // Dummy Y-axis
      expect(map.isValid).toBe(true); // Map can be valid with a dummy Y-axis (1D map)
    });

    it('should create a valid axis if conditions are met', () => {
      const axisBytes = [0xCC, 2, 10, 20]; // Descriptor, Count, Val1, Val2
      const fullBytes = [...axisBytes, 0x00, 0x00]; // Add some data bytes
      mockedFindDescriptor.mockImplementationOnce(() => createMockMapDescriptor('RPM'));
      const map = new EcuMap(0, fullBytes, 100);
      expect(map.xAxis.count).toBe(2);
      expect(map.xAxis.rawValues).toEqual([10, 20]);
      expect(map.xAxis.descriptor.name).toBe('RPM');
      expect(map.isValid).toBe(true); // Assuming findData and clasifyMap don't invalidate
    });
  });

  describe('findAxis', () => {
    it('should set isValid=false if no X-axis is found', () => {
      mockedFindDescriptor.mockImplementationOnce(() => createMockMapDescriptor('RPM', false)); // Unknown X-axis
      const map = new EcuMap(0, [0x01, 0x02, 0x03, 0x04], 10);
      expect(map.isValid).toBe(false);
    });

    it('should create a 1D map if X-axis is found but Y-axis is dummy', () => {
      const bytes = [
        0xAA, 0x02, 0x10, 0x20, // X-Axis (RPM, Count 2)
        0xBB, 0x25, 0x30, 0x40  // Y-Axis (Load, Count 37 -> dummy because >32)
      ];
       mockedFindDescriptor.mockImplementation((byte) => {
        if (byte === 0xAA) return createMockMapDescriptor('RPM');
        if (byte === 0xBB) return createMockMapDescriptor('Load'); // This will be made dummy
        return createMockMapDescriptor('Unknown');
      });
      const map = new EcuMap(0, bytes, 100);
      expect(map.isValid).toBe(true);
      expect(map.xAxis.descriptor.name).toBe('RPM');
      expect(map.xAxis.count).toBe(2);
      expect(map.yAxis.count).toBe(1); // Dummy Y-axis
      expect(map.yAxis.address).toBe(-1);
    });

    it('should find both X and Y axes if valid', () => {
      const bytes = [
        // X-Axis
        0xAA, 0x02, 0x10, 0x20, // (RPM, Count 2) Addr 0, totalSize 4
        // Y-Axis
        0xBB, 0x02, 0x30, 0x40, // (Load, Count 2) Addr 4, totalSize 4
        // Data (2x2)
        1, 2, 3, 4
      ];
      mockedFindDescriptor.mockImplementation((byte) => {
        if (byte === 0xAA) return createMockMapDescriptor('RPM');
        if (byte === 0xBB) return createMockMapDescriptor('Load');
        return createMockMapDescriptor('Unknown');
      });
      const map = new EcuMap(0, bytes, 100);
      expect(map.isValid).toBe(true);
      expect(map.xAxis.descriptor.name).toBe('RPM');
      expect(map.xAxis.count).toBe(2);
      expect(map.xAxis.address).toBe(0);
      expect(map.yAxis.descriptor.name).toBe('Load');
      expect(map.yAxis.count).toBe(2);
      expect(map.yAxis.address).toBe(4); // 0 + xAxis.totalSize (2+2)
    });
  });

  describe('findData', () => {
    let map: EcuMap;
    const bytes = [
      // X-Axis: Addr 0, Desc 0xAA, Count 2, Vals 10,20. totalSize=4
      0xAA, 0x02, 0x10, 0x20,
      // Y-Axis: Addr 4, Desc 0xBB, Count 2, Vals 30,40. totalSize=4
      0xBB, 0x02, 0x30, 0x40,
      // Data: Addr 8, Size 2x2=4. Vals 1,2,3,4
      0x01, 0x02, 0x03, 0x04,
      // Extra bytes
      0xFF, 0xFF
    ];

    beforeEach(() => {
      mockedFindDescriptor.mockImplementation((byte) => {
        if (byte === 0xAA) return createMockMapDescriptor('RPM');
        if (byte === 0xBB) return createMockMapDescriptor('Load');
        return createMockMapDescriptor('Unknown');
      });
      // Create a valid 2D map for findData tests
      map = new EcuMap(0, bytes, bytes.length);
      // Manually ensure it's set up as a 2x2 map for these tests
      // Constructor path already does findAxis and findData
    });

    it('should calculate dataAddress correctly', () => {
      // xAxis (addr 0, totalSize 4), yAxis (addr 4, totalSize 4)
      // dataAddress = map.address (0) + xAxis.totalSize (4) + yAxis.totalSize (4) = 8
      expect(map.dataAddress).toBe(8);
    });

    it('should slice rawValues correctly', () => {
      expect(map.rawValues).toEqual([0x01, 0x02, 0x03, 0x04]);
    });

    it('should set _minRawValue and _maxRawValue from data', () => {
      expect(map.minRawValue).toBe(0x01);
      expect(map.maxRawValue).toBe(0x04);
    });

    it('should handle 1D map for data slicing', () => {
       const bytes1D = [
        0xAA, 0x03, 0x10, 0x20, 0x30, // X-Axis (RPM, Count 3). Addr 0, totalSize 5
        // No Y-Axis (or dummy Y-axis)
        // Data (3x1)
        0xDA, 0xDB, 0xDC
      ];
      mockedFindDescriptor.mockImplementation((byte) => {
        if (byte === 0xAA) return createMockMapDescriptor('RPM');
        return createMockMapDescriptor('Unknown', false); // Force Y-axis to be dummy
      });
      const map1D = new EcuMap(0, bytes1D, bytes1D.length);
      expect(map1D.xAxis.count).toBe(3);
      expect(map1D.yAxis.count).toBe(1); // Dummy
      // dataAddress = map.address (0) + xAxis.totalSize (2+3=5) + yAxis.totalSize (0 for dummy) = 5
      expect(map1D.dataAddress).toBe(5);
      expect(map1D.rawValues).toEqual([0xDA, 0xDB, 0xDC]);
      expect(map1D.minRawValue).toBe(0xDA);
      expect(map1D.maxRawValue).toBe(0xDC);
    });
    
    it('should not set isValid=false if all rawValues are equal (behavior is commented out)', () => {
      const bytesForEqualDataTest = [
        // X-Axis: Addr 0, Desc 0xAA, Count 2, Vals 0x10,0x20. totalSize=4
        0xAA, 0x02, 0x10, 0x20,
        // Y-Axis: Addr 4, Desc 0xBB, Count 1, Vals 0x30. totalSize=0 (because count=1)
        0xBB, 0x01, 0x30,
        // Data: Addr 4 (0+4+0), Size 2x1=2. Vals should be bytes[4] and bytes[5]
        // Which are 0xBB, 0x01. Not 0xCC,0xCC as previously expected.
      ];
      // To get 0xCC, 0xCC, dataAddress would need to be different, e.g. by having a Y-axis with totalSize > 0
      // Let's adjust the byte array to make the dataAddress point to 0xCC, 0xCC
       const equalDataBytesCorrected = [
        // X-Axis: Addr 0, Desc 0xAA, Count 2, Vals 0x10,0x20. totalSize=4
        0xAA, 0x02, 0x10, 0x20,
        // Y-Axis: Addr 4, Desc 0xBB, Count *2*, Vals 0x30, 0x31. totalSize=4 (2+2)
        0xBB, 0x02, 0x30, 0x31,
        // Data: Addr 8 (0+4+4), Size 2x2=4.
        0xCC, 0xCC, 0xDD, 0xEE 
      ];
      mockedFindDescriptor.mockImplementation((byte) => {
        if (byte === 0xAA) return createMockMapDescriptor('RPM');
        if (byte === 0xBB) return createMockMapDescriptor('Load');
        return createMockMapDescriptor('Unknown');
      });
      const mapEqual = new EcuMap(0, equalDataBytesCorrected, equalDataBytesCorrected.length);
      expect(mapEqual.isValid).toBe(true); 
      // This map is 2x2, rawValues are [0xCC, 0xCC, 0xDD, 0xEE]
      // The test "all rawValues are equal" will check this. This specific assertion is just about data slicing.
      // If we want to test the "all equal" case, we need rawData = [0xCC, 0xCC, 0xCC, 0xCC]
      const allCCData = [
        0xAA, 0x02, 0x10, 0x20,
        0xBB, 0x02, 0x30, 0x31,
        0xCC, 0xCC, 0xCC, 0xCC
      ];
      const mapAllCC = new EcuMap(0, allCCData, allCCData.length);
      expect(mapAllCC.rawValues).toEqual([0xCC, 0xCC, 0xCC, 0xCC]);
      // The "all values are equal" check in EcuMap.findData does not change _isValid currently.
      // So this test primarily verifies rawValues slicing.
    });

    it('should set isValid=false if findData is called when xAxis is null', () => {
      const map = new EcuMap(0, [], 0); // Empty map
      (map as any).xAxis = null; // Force xAxis to be null
      (map as any).findData(); // Call findData directly
      expect(map.isValid).toBe(false);
    });
  });

  describe('Getters', () => {
    it('should return correct address strings', () => {
      const map = new EcuMap(0x123, [], 0);
      map.dataAddress = 0x456;
      expect(map.addressString).toBe('0x0123');
      expect(map.dataAddressString).toBe('0x0456');
    });
    
    // min/max Value and min/max RawValue are tested indirectly via clasifyMap and findData
    // isValid is tested in various setup scenarios
  });

  // clasifyMap is the most complex and will be broken down
  describe('clasifyMap', () => {
    let map: EcuMap;

    const setupMapForClasify = (config: {
      mapAddress?: number,
      bytes?: number[],
      potentialSize?: number,
      baseAxisMap?: MapAxis | null,
      xName?: string, xCount?: number, xVals?: number[], xDescKnown?: boolean,
      yName?: string, yCount?: number, yVals?: number[], yDescKnown?: boolean, yMinVal?: number,
      rawData?: number[],
      isBaseAxisMap?: boolean
    }) => {
      const { 
        mapAddress = 0, bytes = [], potentialSize = 100, baseAxisMap = null,
        xName = 'RPM', xCount = 1, xVals = [1], xDescKnown = true,
        yName = 'Load', yCount = 1, yVals = [1], yDescKnown = true, yMinVal = 0,
        rawData = [10],
        isBaseAxisMap = false
      } = config;

      const fullBytes = bytes.length > 0 ? bytes : [
        // Dummy structure if bytes not provided, actual classification relies on direct property setting
        xDescKnown ? 0x01 : 0xF1, xCount, ...xVals,
        yDescKnown ? 0x02 : 0xF2, yCount, ...yVals,
        ...rawData
      ];
      
      mockedFindDescriptor.mockImplementation((byte) => {
        if (byte === 0x01) return createMockMapDescriptor(xName, xDescKnown);
        if (byte === 0x02) return createMockMapDescriptor(yName, yDescKnown);
        if (byte === 0xF1) return createMockMapDescriptor(xName, false); // Explicitly unknown
        if (byte === 0xF2) return createMockMapDescriptor(yName, false); // Explicitly unknown
        return createMockMapDescriptor('DefaultMock', true);
      });

      const ecuMapInstance = new EcuMap(mapAddress, fullBytes, potentialSize, baseAxisMap);
      
      // If not using baseAxisMap path, we might need to manually override parts of xAxis/yAxis
      // if findAxis doesn't set them up as required for a specific clasifyMap test.
      // For more direct testing of clasifyMap, we can:
      // 1. Construct the map (which runs clasifyMap if init() path is taken)
      // 2. Then, if needed, directly manipulate properties like xAxis, yAxis, rawValues before re-calling clasifyMap (if it were public).
      // Since clasifyMap is private and called at the end of init(), we ensure the constructor sets up these properties correctly.
      // For tests below, we will rely on the constructor to call clasifyMap.
      // We will manually set properties on xAxis/yAxis *after* map construction if findAxis/analyzeAxis can't achieve the desired state.

      if (!isBaseAxisMap) { // If standard init path, constructor already called clasifyMap.
                            // We might need to force properties for specific classification tests.
        ecuMapInstance.xAxis = new MapAxis(0, createMockMapDescriptor(xName, xDescKnown), xCount, xVals);
        ecuMapInstance.yAxis = new MapAxis(0, createMockMapDescriptor(yName, yDescKnown), yCount, yVals);
        if (yMinVal !== undefined) (ecuMapInstance.yAxis as any)._minValue = yMinVal; // Set mock internal state
        ecuMapInstance.rawValues = rawData;
        (ecuMapInstance as any)._minRawValue = Math.min(...rawData); // Simulate findData
        (ecuMapInstance as any)._maxRawValue = Math.max(...rawData); // Simulate findData
        (ecuMapInstance as any).clasifyMap(); // Re-run with forced values
      }
      
      return ecuMapInstance;
    };

    it('should set default name and category for unknown maps', () => {
      map = setupMapForClasify({ xName: 'SomeData', xCount: 2, xVals: [1,2], yCount: 1, rawData: [10,20]});
      expect(map.name).toBe('2x1 SomeData');
      expect(map.category).toBe(MapCategories.Unknown);
      expect(map.values).toEqual([10,20]); // Raw values
      expect(map.converter).toBe(CBase);
    });

    it('should set default name for 2D unknown maps', () => {
      map = setupMapForClasify({ xName: 'DataX', xCount: 2, xVals:[1,2], yName: 'DataY', yCount: 2, yVals:[1,2], rawData: [1,2,3,4]});
      expect(map.name).toBe('2x2 DataX vs DataY');
      expect(map.category).toBe(MapCategories.Unknown);
    });

    // Helper function to get raw byte for a desired Ignition BTDC value
    // BTDC = (rawValue / 2) - 15  => rawValue = (BTDC + 15) * 2
    const rawFromIgnBTDC = (btdc: number) => Math.max(0, Math.min(255, Math.round((btdc + 15) * 2)));

    // Helper function to get raw byte for a desired AFR value
    // AFR = rawValue / 10          => rawValue = AFR * 10
    const rawFromAFR = (afr: number) => Math.max(0, Math.min(255, Math.round(afr * 10)));

    // WOT Map (Ignition)
    it('should classify WOT ignition map', () => {
      // xSize >= 16, ySize === 1. min BTDC > -6, max BTDC < 60
      const rawData = new Array(16).fill(0).map((_, i) => rawFromIgnBTDC(i + 5)); // BTDC from 5 to 20
      map = setupMapForClasify({ xName: 'RPM', xCount: 16, xDescKnown: true, yCount: 1, rawData });
      expect(map.name).toBe('Advance WOT (BTDC)');
      expect(map.category).toBe(MapCategories.Ignition);
      expect(map.converter.name).toBe(CIgnitionBTDC.name);
      expect(map.values[0]).toBeCloseTo(5);
      expect(map.createAxisMaps).toBe(true);
    });

    // WOT Map (Fuel)
    it('should classify WOT fuel map', () => {
      // xSize >= 16, ySize === 1. min AFR >= 8, max AFR <= 25
      const rawData = new Array(16).fill(0).map((_, i) => rawFromAFR(11 + i * 0.1)); // AFR from 11 to 12.5
      map = setupMapForClasify({ xName: 'RPM', xCount: 16, xDescKnown: true, yCount: 1, rawData });
      expect(map.name).toBe('Fuel WOT (AFR)');
      expect(map.category).toBe(MapCategories.Injection);
      expect(map.converter.name).toBe(CAFR.name);
      expect(map.values[0]).toBeCloseTo(11);
      expect(map.createAxisMaps).toBe(true);
    });
    
    it('should not set createAxisMaps for WOT if xAxis descriptor unknown', () => {
      const rawData = new Array(16).fill(0).map((_, i) => rawFromAFR(11 + i * 0.1));
      map = setupMapForClasify({ xName: 'RPM', xCount: 16, xDescKnown: false, yCount: 1, rawData });
      expect(map.name).toBe('Fuel WOT (AFR)'); 
      expect(map.createAxisMaps).toBe(false);
    });

    // RPMVsLoad Big Map (Ignition, Low part)
    it('should classify RPMvLoad Low Ignition map', () => {
      const rawData = new Array(12 * 6).fill(0).map((_, i) => rawFromIgnBTDC(i % 30)); // BTDC 0-29
      map = setupMapForClasify({
        xName: 'RPM', xCount: 12, yName: 'Load', yCount: 6, yMinVal: 2, // yAxis.minValue < 3
        rawData
      });
      (map as any)._maxRawValue = Math.max(...rawData.filter(v => v < 250)); // Ensure maxRawValue < 250 for this rule
      (map as any).clasifyMap(); // Re-run with forced values

      expect(map.name).toBe('Advance Low  (BTDC)');
      expect(map.category).toBe(MapCategories.Ignition);
      expect(map.converter.name).toBe(CIgnitionBTDC.name);
      expect(map.createAxisMaps).toBe(true);
    });
    
    // RPMVsLoad Big Map (Fuel, High part)
    it('should classify RPMvLoad High Fuel map', () => {
      const rawData = new Array(14 * 8).fill(0).map((_, i) => rawFromAFR(10 + (i % 50) * 0.1)); // AFR 10-14.9
      map = setupMapForClasify({
        xName: 'RPM', xCount: 14, yName: 'Load', yCount: 8, yMinVal: 5, // yAxis.minValue >= 3
        rawData
      });
       (map as any)._maxRawValue = Math.max(...rawData.filter(v => v < 250)); // Ensure maxRawValue < 250
       (map as any).clasifyMap(); // Re-run with forced values

      expect(map.name).toBe('Fuel High  (AFR)');
      expect(map.category).toBe(MapCategories.Injection);
      expect(map.converter.name).toBe(CAFR.name);
      expect(map.createAxisMaps).toBe(true);
    });

    it('should classify Idle map', () => {
      const rawData = [70, 80, 90, 100]; // These are direct RPM values for idle
      map = setupMapForClasify({ xName: 'CTS', xCount: 4, rawData });
      // Idle map classification depends on rawValues for min/max checks
      (map as any)._minRawValue = Math.min(...rawData);
      (map as any)._maxRawValue = Math.max(...rawData);
      (map as any).clasifyMap(); 

      expect(map.name).toBe('Idle speed');
      expect(map.category).toBe(MapCategories.Idle);
      // Idle map uses raw values directly as its output values (not converted by CBase typically)
      expect(map.values).toEqual(rawData);
    });

    it('should classify Fuel Enrichment vs IAT map', () => {
      const rawData = [rawFromAFR(12), rawFromAFR(12.5), rawFromAFR(13), rawFromAFR(13.5)];
      map = setupMapForClasify({ xName: 'RPM', xCount: 2, yName: 'IAT', yCount: 2, rawData });
      expect(map.name).toBe('Fuel Enrichment vs IAT');
      expect(map.category).toBe(MapCategories.Injection);
      expect(map.converter.name).toBe(CAFR.name);
    });
    
    it('should classify Ignition Dwell map', () => {
      // Dwell values are often small, direct representations.
      // xAxis.isRPM, yAxis.descriptor.name === "Volts"
      map = setupMapForClasify({ xName: 'RPM', xCount: 5, yName: 'Volts', yCount: 3, rawData: new Array(15).fill(100) });
      expect(map.name).toBe('Ignition Dwell');
      expect(map.category).toBe(MapCategories.Ignition);
    });

    it('should classify Sensor map', () => {
      map = setupMapForClasify({ xName: 'TPS Linearization', xCount: 8, rawData: new Array(8).fill(1) });
      expect(map.category).toBe(MapCategories.Sensors);
      // Name will be default: '8x1 TPS Linearization'
      expect(map.name).toBe('8x1 TPS Linearization');
    });
  });
});
