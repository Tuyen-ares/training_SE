<script setup>
import { computed } from 'vue'

import { getStatusMeta } from '../../constants/status-meta'

const props = defineProps({
  status: {
    type: [String, Number],
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
})

const meta = computed(() => getStatusMeta(props.status))
const text = computed(() => props.label || meta.value.label)
</script>

<template>
  <a-tag :color="meta.color">{{ text }}</a-tag>
</template>
