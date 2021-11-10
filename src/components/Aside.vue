<template>
  <aside
    class="
      w-60
      flex-shrink-0
      h-full
      shadow-2xl
      text-left
      flex flex-col
      dark:bg-gray-700
    "
  >
    <div class="p-4 flex-shrink">
      <h3><b>Potential maps found:</b> {{ maps.length }}</h3>
      <h3><b>ECU:</b>{{ ecuNumber }}</h3>
      <h3><b>Checksum:</b>{{ checksumNew }}</h3>
      <h3><b>Current Checksum:</b>{{ checksumCurrent }}</h3>
    </div>
    <h3 class="px-4 mb-0"><b>Maps</b></h3>
    <div
      class="
        bg-gray-100
        border-8 border-white
        p-2
        shadow-inner
        flex-grow
        overflow-auto
        dark:bg-gray-800 dark:border-gray-700
      "
    >
      <AsideList v-for="group in groups" :key="group.name" :group="group" />
    </div>
  </aside>
</template>
<script lang="ts">
import { computed, defineComponent } from "vue";
import { useMainStore } from "../store";
import AsideList from "./AsideList.vue";

export default defineComponent({
  components: {
    AsideList,
  },
  setup() {
    const store = useMainStore();

    const maps = computed(() => store.maps);
    const groups = computed(() => store.mapGroups);
    const ecuNumber = computed(() => store.ecuNumber);
    const checksumCurrent = computed(() => store.checksumCurrent);
    const checksumNew = computed(() => store.checksumNew);

    return {
      maps,
      groups,
      ecuNumber,
      checksumCurrent,
      checksumNew,
    };
  },
});
</script>
