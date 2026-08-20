<script setup>
defineProps({
  variant: {
    type: String,
    default: 'lockup',
    validator: (value) => ['lockup', 'app-icon'].includes(value),
  },
  size: {
    type: Number,
    default: 48,
  },
  showSubtitle: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <span
    class="brand-logo"
    :class="`brand-logo--${variant}`"
    :style="{ '--brand-logo-size': `${size}px` }"
    role="img"
    aria-label="BigIn Asset Management"
  >
    <svg
      class="brand-logo__graphic"
      :viewBox="variant === 'app-icon' ? '0 0 360 360' : '0 0 222 341'"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        v-if="variant === 'app-icon'"
        class="brand-logo__app-frame"
        x="10"
        y="10"
        width="340"
        height="340"
        rx="66"
      />

      <g :transform="variant === 'app-icon' ? 'translate(83.25 33) scale(.875)' : undefined">
        <path
          class="brand-logo__emblem"
          fill-rule="evenodd"
          d="M0 121 111 92l111 29v69c0 68-38 115-111 151C38 305 0 258 0 190Zm111-11-92 34v46c0 55 30 98 92 130 62-32 92-75 92-130v-46Z"
        />
        <path
          class="brand-logo__emblem"
          d="M56 106C53 84 60 68 79 51 100 33 111 16 113 0c11 29 1 52-21 72-16 14-27 27-36 34Z"
        />
        <path
          class="brand-logo__emblem"
          d="M88 103c16-11 28-27 34-44 6-14 7-25 3-31 17 20 12 42-2 58-8 10-20 15-35 17Z"
        />
        <path
          class="brand-logo__core"
          d="M100 125q11-7 22 0l53 31q9 6 9 18v61q0 12-10 19l-52 32q-11 7-22 0l-52-32q-10-7-10-19v-61q0-12 10-18Z"
        />
        <path class="brand-logo__antenna" d="M61 210 55.5 168.5M161 210l5.5-41.5" />
        <path
          class="brand-logo__helmet"
          d="M63 217v-11c0-27 20-44 48-44s48 17 48 44v11c0 27-19 44-48 44s-48-17-48-44Z"
        />
        <rect class="brand-logo__ear-pad" x="53.5" y="204" width="15" height="31" rx="7.5" />
        <rect class="brand-logo__ear-pad" x="153.5" y="204" width="15" height="31" rx="7.5" />
        <path
          class="brand-logo__visor"
          d="M77 209.5h68c6 0 9 5 9 12v6.5c0 11.5-7 18-18 18s-14-8.5-25-8.5S97 246 86 246s-18-6.5-18-18v-6.5c0-7 3-12 9-12Z"
        />
      </g>
    </svg>

    <span v-if="variant === 'lockup'" class="brand-logo__copy">
      <span class="brand-logo__name">BigIn Asset</span>
      <span v-if="showSubtitle" class="brand-logo__subtitle">Asset Management</span>
    </span>
  </span>
</template>

<style scoped>
.brand-logo {
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: calc(var(--brand-logo-size) * 0.2);
  min-width: 0;
}

.brand-logo__graphic {
  display: block;
  flex: 0 0 auto;
  height: var(--brand-logo-size);
  overflow: visible;
  width: calc(var(--brand-logo-size) * 0.651026);
}

.brand-logo__app-frame {
  fill: var(--bigin-surface-panel, #ffffff);
  stroke: var(--bigin-color-primary, #ff6b00);
  stroke-width: 8;
}

.brand-logo__emblem { fill: var(--bigin-color-primary, #ff6b00); }
.brand-logo__core { fill: #087ff5; }
.brand-logo__antenna { fill: none; stroke: #ffffff; stroke-linecap: round; stroke-width: 4.8; }
.brand-logo__helmet, .brand-logo__ear-pad { fill: #ffffff; }
.brand-logo__visor { fill: #087ff5; }

.brand-logo__copy {
  display: grid;
  gap: calc(var(--brand-logo-size) * 0.1);
  min-width: 0;
}

.brand-logo__name {
  color: var(--bigin-color-primary, #ff6b00);
  font-size: calc(var(--brand-logo-size) * 0.47);
  font-weight: 700;
  letter-spacing: -0.055em;
  line-height: 0.9;
  white-space: nowrap;
}

.brand-logo__subtitle {
  color: var(--bigin-brand-subtitle, #102a56);
  font-size: calc(var(--brand-logo-size) * 0.18);
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1.15;
  white-space: nowrap;
}

.brand-logo--app-icon { gap: 0; }
.brand-logo--app-icon .brand-logo__graphic { width: var(--brand-logo-size); }
</style>
