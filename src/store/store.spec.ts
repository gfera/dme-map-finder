import { describe, it, expect, vi, beforeEach } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMainStore } from './index';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMainStore } from './index';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMainStore } from './index';
// Import types and actual MapCategories for use *outside* the problematic mock factory
import { type EcuMap, MapCategories, type AsideMap } from '../models/map';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMainStore } from './index';
// Import types and actual MapCategories for use *outside* the problematic mock factory
import { type EcuMap, MapCategories, type AsideMap } from '../models/map';

// Mock utilities from map-base
vi.mock('../utils/map-base', () => ({ // Arrow function with implicit return of the object literal
  mapGroups: [ 
    { name: "Sensors", category: 0 /* MapCategories.Sensors */, items: [] },
    { name: "AFM", category: 6 /* MapCategories.AFM */, items: [] },
    { name: "Ignition", category: 1 /* MapCategories.Ignition */, items: [] },
    { name: "Injection", category: 2 /* MapCategories.Injection */, items: [] },
    { name: "Idle", category: 3 /* MapCategories.Idle */, items: [] },
    { name: "Rev Limiter", category: 4 /* MapCategories.RevLimiter */, items: [] },
    { name: "Map Axis", category: 5 /* MapCategories.MapAxis */, items: [] },
    { name: "Unknown", category: 7 /* MapCategories.Unknown */, items: [] },
  ],
  findPartNumber: vi.fn(),
  getChecksum: vi.fn(),
    calcChecksum8Bit: vi.fn(), // Added missing comma from previous attempt
    getMapTablesAddress: vi.fn(),
    extractMaps: vi.fn()
  };
});

// Mock utilities from rev-limiter
vi.mock('../utils/rev-limiter', () => ({
  findRevLimiter: vi.fn(),
}));

// Mock utilities from afm (using relative path as @ might be tricky in default Vitest setup)
vi.mock('../utils/afm', () => ({
  findAFMMaps: vi.fn(),
}));

// Helper to create a basic EcuMap mock
const createMockEcuMap = (address: number, name: string, category: MapCategories): EcuMap => ({
  address,
  name,
  category,
  // Add other EcuMap properties if they are accessed by the store logic being tested
  // For loadFile, category is important for grouping. For toggleMap, address and object identity.
  bytes: [],
  potentialSize: 0,
  baseAxisMap: null,
  dataAddress: 0,
  xAxis: null as any, // Cast to any for mock simplicity
  yAxis: null as any,
  rawValues: [],
  values: [],
  converter: null as any,
  converters: [],
  createAxisMaps: false,
  _minRawValue: 0,
  _maxRawValue: 0,
  _minValue: 0,
  _maxValue: 0,
  _isValid: true,
  addressString: `0x${address.toString(16)}`,
  dataAddressString: '',
  minValue: 0,
  maxValue: 0,
  minRawValue: 0,
  maxRawValue: 0,
  isValid: true,
  custProps: null,
  // Mock methods if called, though unlikely for store tests
  initAxis: vi.fn(),
  init: vi.fn(),
  analyzeAxis: vi.fn(),
  findAxis: vi.fn(),
  findData: vi.fn(),
  clasifyMap: vi.fn(),
  checkValues: vi.fn(),
  couldBeIgnition: vi.fn(),
  couldBeFuel: vi.fn(),
  setAsIgnitionMap: vi.fn(),
  setAsFuelMap: vi.fn(),
} as EcuMap); // Cast to EcuMap to satisfy type, acknowledging it's a partial mock


describe('Pinia Store: main', () => {
  let store: ReturnType<typeof useMainStore>;
  let findPartNumber: any, getChecksum: any, calcChecksum8Bit: any, getMapTablesAddress: any, extractMaps: any;
  let findRevLimiter: any;
  let findAFMMaps: any;


  beforeEach(async () => {
    // Import mocked functions here
    const mapBaseUtils = await import('../utils/map-base');
    findPartNumber = mapBaseUtils.findPartNumber;
    getChecksum = mapBaseUtils.getChecksum;
    calcChecksum8Bit = mapBaseUtils.calcChecksum8Bit;
    getMapTablesAddress = mapBaseUtils.getMapTablesAddress;
    extractMaps = mapBaseUtils.extractMaps;

    const revLimiterUtils = await import('../utils/rev-limiter');
    findRevLimiter = revLimiterUtils.findRevLimiter;

    const afmUtils = await import('../utils/afm');
    findAFMMaps = afmUtils.findAFMMaps;

    setActivePinia(createPinia());
    store = useMainStore();

    // Reset mocks before each test
    vi.resetAllMocks();

    // Provide default return values for mocks
    vi.mocked(findPartNumber).mockReturnValue('TestECU123');
    vi.mocked(getChecksum).mockReturnValue('CS1234');
    vi.mocked(calcChecksum8Bit).mockReturnValue('CN1234');
    vi.mocked(getMapTablesAddress).mockReturnValue([0x1000, 0x2000]);
    vi.mocked(extractMaps).mockReturnValue([
      createMockEcuMap(0x1000, 'Map1', MapCategories.Ignition),
      createMockEcuMap(0x2000, 'Map2', MapCategories.Injection),
    ]);
    vi.mocked(findRevLimiter).mockReturnValue([createMockEcuMap(0x3000, 'RevLimiterMap', MapCategories.RevLimiter)]);
    vi.mocked(findAFMMaps).mockReturnValue([createMockEcuMap(0x4000, 'AFMMap', MapCategories.AFM)]);
  });

  describe('loadFile action', () => {
    const mockFile = {
      name: 'test.bin',
      buffer: new ArrayBuffer(8), // Simple buffer
    };

    it('should successfully load a file and populate store state', () => {
      store.loadFile(mockFile);

      expect(store.loadedBin).not.toBeNull();
      expect(store.loadedBin?.name).toBe('test.bin');
      expect(store.loadedBin?.buffer).toBe(mockFile.buffer);
      expect(store.loadedBin?.bytes.length).toBe(8);

      expect(findPartNumber).toHaveBeenCalledTimes(1);
      expect(store.ecuNumber).toBe('TestECU123');

      expect(getChecksum).toHaveBeenCalledTimes(1);
      expect(store.checksumCurrent).toBe('CS1234');

      expect(calcChecksum8Bit).toHaveBeenCalledTimes(1);
      expect(store.checksumNew).toBe('CN1234');

      expect(getMapTablesAddress).toHaveBeenCalledTimes(1);
      expect(store.addresses).toEqual([0x1000, 0x2000]);

      expect(extractMaps).toHaveBeenCalledTimes(1);
      expect(findRevLimiter).toHaveBeenCalledTimes(1);
      expect(findAFMMaps).toHaveBeenCalledTimes(1);
      
      expect(store.maps.length).toBe(4); // 2 from extractMaps, 1 from revLimiter, 1 from AFM
      expect(store.maps[0].name).toBe('Map1');
      expect(store.maps[1].name).toBe('Map2');
      expect(store.maps[2].name).toBe('RevLimiterMap');
      expect(store.maps[3].name).toBe('AFMMap');

      expect(store.openedMaps).toEqual([]);

      // Check groups (assuming initial groups are from mapGroups in map-base)
      // The store copies mapGroups and then populates items.
      // We need to ensure mapGroups is available in the test context if it's used by the store.
      // For now, let's check a couple of groups if they got populated.
      const ignitionGroup = store.groups.find(g => g.category === MapCategories.Ignition);
      expect(ignitionGroup?.items.length).toBe(1);
      expect(ignitionGroup?.items[0].map.name).toBe('Map1');

      const injectionGroup = store.groups.find(g => g.category === MapCategories.Injection);
      expect(injectionGroup?.items.length).toBe(1);
      expect(injectionGroup?.items[0].map.name).toBe('Map2');
      
      const revLimiterGroup = store.groups.find(g => g.category === MapCategories.RevLimiter);
      expect(revLimiterGroup?.items.length).toBe(1);
      
      const afmGroup = store.groups.find(g => g.category === MapCategories.AFM);
      expect(afmGroup?.items.length).toBe(1);
    });

    it('should handle errors during file loading and reset state', () => {
      const loadFileError = new Error('Failed to extract maps');
      vi.mocked(extractMaps).mockImplementationOnce(() => {
        throw loadFileError;
      });

      expect(() => store.loadFile(mockFile)).toThrow(loadFileError);

      expect(store.loadedBin).toBeNull();
      expect(store.ecuNumber).toBe('');
      expect(store.checksumCurrent).toBe('');
      expect(store.checksumNew).toBe('');
      expect(store.addresses).toEqual([]);
      expect(store.maps).toEqual([]);
      expect(store.openedMaps).toEqual([]);
      store.groups.forEach(group => {
        expect(group.items.length).toBe(0);
      });
    });
  });

  describe('toggleMap action', () => {
    let mockMap1: EcuMap;
    let asideMap1: AsideMap;

    beforeEach(() => {
      mockMap1 = createMockEcuMap(0x100, 'Test Map 1', MapCategories.Ignition);
      // Ensure store.maps has this map if toggleMap relies on it (it doesn't directly)
      // store.maps = [mockMap1]; 
      asideMap1 = { map: mockMap1, opened: false };
    });

    it('should add a map to openedMaps if not already opened', () => {
      expect(store.openedMaps.length).toBe(0);
      
      store.toggleMap(asideMap1);

      expect(asideMap1.opened).toBe(true);
      expect(store.openedMaps.length).toBe(1);
      expect(store.openedMaps[0]).toBe(mockMap1); // unshift adds to beginning
    });

    it('should remove a map from openedMaps if already opened', () => {
      // First, add the map
      store.toggleMap(asideMap1);
      expect(asideMap1.opened).toBe(true);
      expect(store.openedMaps.length).toBe(1);

      // Then, toggle again to remove
      store.toggleMap(asideMap1);
      
      expect(asideMap1.opened).toBe(false);
      expect(store.openedMaps.length).toBe(0);
    });

    it('should add new maps to the beginning of openedMaps', () => {
      const mockMap2 = createMockEcuMap(0x200, 'Test Map 2', MapCategories.Injection);
      const asideMap2: AsideMap = { map: mockMap2, opened: false };

      store.toggleMap(asideMap1); // map1 added
      store.toggleMap(asideMap2); // map2 added

      expect(store.openedMaps.length).toBe(2);
      expect(store.openedMaps[0]).toBe(mockMap2); // map2 should be at the beginning
      expect(store.openedMaps[1]).toBe(mockMap1);
    });

    it('should correctly toggle the opened state of the AsideMap item', () => {
      store.toggleMap(asideMap1);
      expect(asideMap1.opened).toBe(true);

      store.toggleMap(asideMap1);
      expect(asideMap1.opened).toBe(false);
    });
  });
});
