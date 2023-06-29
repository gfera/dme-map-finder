<template>
  <header
    class="
      w-full
      bg-white
      shadow-lg
      flex flex-row
      items-center
      px-4
      py-2
      z-10
      dark:bg-gray-800 dark:text-warmGray-200
    "
  >
    <h1 class="text-xl font-bold">
      Motronic Map Finder
    </h1>
    <CButton
      class="ml-4"
      @click="fileRef.click()"
    >
      Open file
    </CButton>
    <input
      ref="fileRef"
      class="hidden"
      type="file"
      @change="fileSelect($event)"
    >
  </header>
  <main
    class="
      w-full
      flex-grow
      bg-warmGray-300
      flex flex-row
      overflow-hidden
      dark:bg-gray-800 dark:text-white
    "
  >
    <Aside class="flex-grow-0" />
    
    <div
      class="p-4 overflow-auto w-full flex flex-col items-center"
    >
      <XDF />
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
<script lang="ts" setup>
import { computed, ref } from "vue";

import { useMainStore } from "./store";

import Map from "@/components/Map.vue";
import CButton from "@/components/Button.vue";
import Aside from "@/components/Aside.vue";
import { EcuMap } from "./models/map";
import XDF from "@/components/xdf/Main.vue";
const store = useMainStore();

const fileSelect = async (event:Event) => {
  const file = (event.target as HTMLInputElement).files[0]
  const buffer = await file.arrayBuffer();
  store.loadFile({ name: file.name, buffer });
};
const maps = computed(() => store.openedMaps as EcuMap[]);

const fileRef= ref(null)

</script>

<style>
#app {
  font-family: monospace;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  display: flex;
  flex-direction: column;
}
body,
html,
#app {
  width: 100%;
  height: 100%;
}
</style>
