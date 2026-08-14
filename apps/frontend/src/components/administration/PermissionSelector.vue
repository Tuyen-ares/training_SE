<script setup>
import { computed } from 'vue'

const props = defineProps({
  permissions: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
  disabled: Boolean,
})
const emit = defineEmits(['update:modelValue'])

const groups = computed(() => {
  const grouped = new Map()
  props.permissions.filter((permission) => permission.code !== 'role.delete').forEach((permission) => {
    const key = permission.code.split('.')[0]
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(permission)
  })
  return [...grouped.entries()].map(([key, items]) => ({
    key,
    label: key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    items,
  }))
})

function toggle(permissionId, checked) {
  const next = new Set(props.modelValue)
  if (checked) next.add(permissionId)
  else next.delete(permissionId)
  emit('update:modelValue', [...next])
}
</script>

<template>
  <div class="permission-groups">
    <section v-for="group in groups" :key="group.key" class="permission-group">
      <h3>{{ group.label }}</h3>
      <label v-for="permission in group.items" :key="permission.id" class="permission-option">
        <a-checkbox
          :checked="modelValue.includes(permission.id)"
          :disabled="disabled"
          @change="toggle(permission.id, $event.target.checked)"
        />
        <span><strong>{{ permission.name }}</strong><code>{{ permission.code }}</code><small>{{ permission.description }}</small></span>
      </label>
    </section>
  </div>
</template>

<style scoped>
.permission-groups { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.permission-group { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-secondary); border-radius: 8px; overflow: hidden; }
.permission-group h3 { background: var(--bigin-surface-subtle); border-bottom: 1px solid var(--bigin-border-secondary); font-size: 14px; margin: 0; padding: 12px 16px; }
.permission-option { align-items: flex-start; border-bottom: 1px solid var(--bigin-border-subtle); display: flex; gap: 10px; padding: 12px 16px; }
.permission-option:last-child { border-bottom: 0; }.permission-option > span { display: grid; flex: 1; gap: 3px; }
.permission-option strong { font-size: 13px; }.permission-option code { color: var(--bigin-color-primary-strong); font-size: 11px; }
.permission-option small { color: var(--bigin-text-muted); line-height: 1.4; }
@media (max-width: 767px) { .permission-groups { grid-template-columns: 1fr; } }
</style>
