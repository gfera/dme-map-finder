<template>
  <XDFTABLE
    :uniqueid="map.dataAddressString"
    flags="0x30"
  >
    <title>{{ map.name }}</title>
    <CATEGORYMEM
      index="0"
      :category="map.category+1"
    />
    <CATEGORYMEM
      v-if="isAxis"
      index="0"
      :category="10"
    />
    <XDFAXIS
      id="x"
      :uniqueid="map.xAxis.addressString"
    >
      <EMBEDDEDDATA
        mmedelementsizebits="8"
        mmedmajorstridebits="0"
        mmedminorstridebits="0"
      />
      <units>{{ map.xAxis.descriptor?.unit || "?" }}</units>
      <indexcount>{{ map.xAxis.size }}</indexcount>
      <decimalpl>1</decimalpl>
      <outputtype>4</outputtype>
      <datatype>0</datatype>
      <unittype>0</unittype>
      <DALINK index="0" />
      <LABEL
        v-for="(lbl,index) in map.xAxis.values"
        :key="lbl"
        :index="index"
        :value="lbl"
      />
      <MATH equation="X">
        <VAR id="X" />
      </MATH>
    </XDFAXIS>
    <XDFAXIS
      id="y"
      :uniqueid="map.yAxis.addressString"
    >
      <EMBEDDEDDATA
        mmedelementsizebits="8"
        :mmedcolcount="map.yAxis.size"
        mmedmajorstridebits="0"
        mmedminorstridebits="0"
      />
      <units>{{ map.yAxis.descriptor?.unit || "?" }}</units>
      <indexcount>{{ map.yAxis.size }}</indexcount>
      <outputtype>4</outputtype>
      <datatype>0</datatype>
      <unittype>0</unittype>
      <DALINK index="0" />
      <LABEL
        v-for="(lbl,index) in map.yAxis.values"
        :key="lbl"
        :index="index"
        :value="lbl"
      />
      <MATH equation="X">
        <VAR id="X" />
      </MATH>
    </XDFAXIS>
    <XDFAXIS id="z">
      <EMBEDDEDDATA
        :mmedaddress="map.dataAddressString"
        mmedtypeflags="0x04"
        mmedelementsizebits="8"
        :mmedrowcount="map.yAxis.count"
        :mmedcolcount="map.xAxis.count"
        mmedmajorstridebits="0"
        mmedminorstridebits="0"
      />
      <decimalpl>2</decimalpl>
      <min>{{ map.minValue }}</min>
      <max>{{ map.maxValue }}</max>
      <outputtype>1</outputtype>
      <MATH :equation="map.converter.xdfconverter">
        <VAR id="X" />
      </MATH>
    </XDFAXIS>
  </XDFTABLE>
</template>
<script setup lang="ts">
import { PropType, computed } from 'vue';
import { EcuMap } from '../../models/map';
 defineProps({
  map: {
    type: Object as PropType<EcuMap>,
    required: true,
  },
  isAxis:{
    type:Boolean,
    default:false
  }
});
</script>