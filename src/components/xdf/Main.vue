<template>
  <div
    v-if="maps.length>0"
    ref="html"
    class="hidden"
  >
    <XDFFORMAT version="1.70">
      <XDFHEADER>
        <flags>0x1</flags>
        <description />
        <BASEOFFSET
          offset="0"
          subtract="0"
        />
        <DEFAULTS
          datasizeinbits="8"
          sigdigits="2"
          outputtype="1"
          signed="0"
          lsbfirst="0"
          float="0"
        />
        <REGION
          type="0xFFFFFFFF"
          startaddress="0x0"
          size="0x8000"
          regioncolor="0x0"
          regionflags="0x0"
          name="Binary File"
          desc="This region describes the bin file edited by this XDF"
        />
        <CATEGORY
          v-for="g in groups"
          :key="g.name"
          :index="`0x${g.category}`"
          :name="g.name"
        />
        <CATEGORY
          index="0x9"
          name="RpmMaps"
        />
      </XDFHEADER>
      <XDFMap 
        v-for="map in maps"
        :key="map.addressString"
        :map="map"
      />
    </XDFFORMAT>
  </div>
  
  <Button
    v-if="maps.length>0"
    class="mt-4 w-full"
    @click="generateXDF()"
  >
    Downlad XDF
  </Button>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMainStore } from '@/store';
import XDFMap from '@/components/xdf/Map.vue';
import { EcuMap } from '@/models/map';
import Button from 'primevue/button';


const store = useMainStore()
const maps = computed(() => store.maps as EcuMap[]);
const groups = computed(() => store.mapGroups);
const html = ref()


const generateXDF = () => {
  if(!html.value) {
    return;
  }

  

  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=latin-1,' + encodeURIComponent(html.value.innerHTML));
  element.setAttribute('download', `${store.loadedBin.name}.xdf`);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

</script>