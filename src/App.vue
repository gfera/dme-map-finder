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
    <h1 class="text-xl font-bold">Motronic Map Finder</h1>
    <CButton class="ml-4" @click="fileRef.click()">Open file</CButton>
    <input
      class="hidden"
      type="file"
      ref="fileRef"
      @change="fileSelect($event.target.files[0])"
    />
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
    <div v-if="maps.length > 0" class="p-4 overflow-auto w-full">
      <div class="w-full grid grid-cols-2 gap-4">
        <Map v-for="map in maps" :key="map.address" :map="map" />
      </div>
    </div>
  </main>
</template>
<script lang="ts">
import { computed, defineComponent, ref, watch } from "@vue/runtime-core";

import { useMainStore } from "./store";

import MapComponent from "./components/Map.vue";
import CButton from "./components/Button.vue";
import Aside from "./components/Aside.vue";

export default defineComponent({
  components: {
    Map: MapComponent,
    CButton,
    Aside,
  },
  setup() {
    const store = useMainStore();

    const files = [
      "/bertone.bin",
      "/m43b18_982.bin",
      "/m43b18_661.bin",
      "./m42b18_070.bin",
    ];

    const loadFile = (filePath: string) => {
      fetch(filePath)
        .then((answer) => answer.arrayBuffer())
        .then((buffer) => store.loadFile({ name: filePath, buffer }));
    };

    const fileSelect = async (file: File) => {
      const buffer = await file.arrayBuffer();
      store.loadFile({ name: file.name, buffer });
    };
    const maps = computed(() => store.openedMaps);
    const mapGroups = computed(() => store.mapGroups);

    return {
      maps,
      fileSelect,
      fileRef: ref(null),
      mapGroups,
    };
  },
});
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
