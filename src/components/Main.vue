<template>
  <main
    class="
      w-full
      flex-grow
      bg-surface-300
      flex flex-row
      overflow-hidden
      dark:bg-gray-800 dark:text-white
    "
  >
    <Aside class="flex-grow-0" />
    
    <div
      class="p-4 overflow-auto w-full flex flex-col items-center"
    >
      <div
        v-if="maps.length > 0"
        class="w-full grid grid-cols-1 auto-rows-min grid-rows-none xl:grid-cols-2 gap-4 mt-4 flex-grow"
      >
        <Map
          v-for="map in maps"
          :key="map.address"
          :map="map"
        />
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed } from "vue";

import { useMainStore } from "@/store";
import { EcuMap } from "@/models/map";

import Map from "@/components/Map.vue";
import Aside from "@/components/Aside.vue";

const store = useMainStore();

const maps = computed(() => store.openedMaps as EcuMap[]);


</script>