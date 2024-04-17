<template>
  <aside
    ref="asideRef"
    class="relative w-full max-w-xl flex-shrink-0 h-full shadow-2xl text-left flex flex-col bg-white dark:bg-gray-700 resize-x select-none "
    :style="asideStyle"
  >
    <div class="p-4 flex-shrink">
      <FileUpload
        mode="basic"
        :max-file-size="1000000"
        choose-label="Open Rom"

        @select="fileSelect"
      >
        <template #header="{ chooseCallback }">
          <Button
            label="Open file"
            @click="chooseCallback"
          />
        </template>
        <template #content />
      </FileUpload>

      <template v-if="ecuNumber">
        <h3><b>Potential maps found:</b> {{ maps.length }}</h3>
        <h3><b>ECU:</b>{{ ecuNumber }}</h3>
        <h3><b>Checksum:</b>{{ checksumNew }}</h3>
        <h3><b>Current Checksum:</b>{{ checksumCurrent }}</h3>
        <XDF />
      </template>
    </div>
    <h3 class="px-4 mb-0">
      <b>Maps</b>
    </h3>

    <ScrollPanel class="flex-grow w-full overflow-hidden">
      <Accordion
        :active-index="0"
        multiple
        class="overflow-hidden"
      >
        <AccordionTab
          v-for="group in groups"
          :key="group.name"
          :name="group.name"
          :header="group.name"
        >
          <AsideList :group="(group as any)" />
        </AccordionTab>
      </Accordion>
    </ScrollPanel>
    <div
      ref="resizeHandler"
      class="absolute top-0 -right-1 w-2 h-full hover:bg-gray-400 cursor-move z-10"
    />
  </aside>
</template>
<script lang="ts" setup>
import { computed, reactive, ref, watch } from "vue";

import { useMainStore } from "../store";

import AsideList from "./AsideList.vue";
import XDF from "@/components/xdf/Main.vue";
import { AsideMap } from "@/models/map";
import Accordion from "primevue/accordion";
import AccordionTab from "primevue/accordiontab";
import FileUpload, { FileUploadSelectEvent } from "primevue/fileupload";
import Button from "primevue/button";
import { useDraggable } from "@vueuse/core";
import { useResizer } from "@/composables/useResizer";
import ScrollPanel from "primevue/scrollpanel";

// Aside size
const asideRef = ref();
const resizeHandler = ref<HTMLElement>();
const asideStyle = reactive({width:'auto'});
const {isResizing,size} = useResizer(asideRef,{handle:{right:resizeHandler}})


const store = useMainStore();

// File opening
const fileSelect = (event: FileUploadSelectEvent) => {
  const file = [event.files].flat()[0];
  file.arrayBuffer().then((buffer) => {
    store.loadFile({ name: file.name, buffer });
  });
};

// BIN data
const ecuNumber = computed(() => store.ecuNumber);
const checksumCurrent = computed(() => store.checksumCurrent);
const checksumNew = computed(() => store.checksumNew);

// Map Groups
const groups = computed(() => store.mapGroups);

// Maps
const maps = computed(() => store.maps);
const toggleMap = (item: AsideMap) => {
  store.toggleMap(item);
};
</script>
