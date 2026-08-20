<script setup>
import { computed } from 'vue'
import { DEFAULT_ASSET_IMAGE } from '../../constants/media'
import { assetInitial, displayAssetValue } from '../../utils/asset-identity'

const props = defineProps({
  identity: {
    type: Object,
    default: () => ({ modelName: null, assetCode: null, serialNumber: null, imageUrl: null }),
  },
  variant: {
    type: String,
    default: 'table',
    validator: (value) => ['inventory', 'table', 'detail'].includes(value),
  },
  showImage: { type: Boolean, default: false },
})

const showSerial = computed(() => props.variant !== 'inventory')
const modelName = computed(() => displayAssetValue(props.identity.modelName))
const assetCode = computed(() => displayAssetValue(props.identity.assetCode))
const serialNumber = computed(() => displayAssetValue(props.identity.serialNumber))
const initial = computed(() => assetInitial(props.identity))
</script>

<template>
  <div class="asset-identity" :class="`asset-identity--${variant}`">
    <a-avatar v-if="showImage" shape="square" :src="identity.imageUrl || DEFAULT_ASSET_IMAGE" class="asset-identity__avatar">
      {{ initial }}
    </a-avatar>
    <div class="asset-identity__copy">
      <strong class="asset-identity__model">{{ modelName }}</strong>
      <span class="asset-identity__code">Code: {{ assetCode }}</span>
      <span v-if="showSerial" class="asset-identity__serial">Seri: {{ serialNumber }}</span>
    </div>
  </div>
</template>

<style scoped>
.asset-identity { align-items: center; display: flex; gap: 10px; min-width: 0; }
.asset-identity__copy { display: grid; gap: 3px; min-width: 0; }
.asset-identity__model, .asset-identity__code, .asset-identity__serial { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-identity__model { color: var(--bigin-text-primary); font-size: 13px; }
.asset-identity__code, .asset-identity__serial { color: var(--bigin-text-secondary); font-size: 12px; }
.asset-identity__serial { color: var(--bigin-text-tertiary); font-size: 11px; }
.asset-identity__avatar { background: var(--bigin-surface-primary-soft); border: 1px solid var(--bigin-border-secondary); flex: 0 0 auto; }
.asset-identity--detail .asset-identity__model { font-size: 15px; }
.asset-identity--detail .asset-identity__code, .asset-identity--detail .asset-identity__serial { font-size: 13px; }
</style>
