<script setup>
import {
  SafetyCertificateFilled,
  ThunderboltFilled,
} from '@ant-design/icons-vue'

defineProps({
  wide: {
    type: Boolean,
    default: false,
  },
})

</script>

<template>
  <main class="auth-layout" data-theme="light">
    <a-layout class="auth-layout__frame">
      <a-layout-sider class="auth-layout__context" :width="512" theme="light">
        <div class="auth-layout__context-top">
          <div class="auth-layout__brand">
            <div>
              <div class="auth-layout__brand-name">BigIn Asset<span>.</span></div>
              <div class="auth-layout__brand-label">Management</div>
            </div>
          </div>

          <div class="auth-layout__context-copy">
            <h1 class="auth-layout__title">Smart Enterprise Asset Management System.</h1>
            <p class="auth-layout__description">
              Optimize the process of tracking, maintaining, and allocating internal equipment.
              Providing accurate data and comprehensive control for modern enterprise environments.
            </p>
          </div>
        </div>

        <div class="auth-layout__benefits">
          <div class="auth-layout__benefit"><SafetyCertificateFilled /><span>Enterprise-grade Security</span></div>
          <div class="auth-layout__benefit"><ThunderboltFilled /><span>High Operational Performance</span></div>
        </div>
      </a-layout-sider>

      <a-layout-content class="auth-layout__content">
        <section class="auth-layout__form-region" :class="{ 'auth-layout__form-region--wide': wide }">
          <div class="auth-layout__mobile-brand">
            <div>
              <div class="auth-layout__brand-name">BigIn Asset<span>.</span></div>
              <div class="auth-layout__brand-label">Management</div>
            </div>
          </div>
          <slot />
        </section>
      </a-layout-content>
    </a-layout>
  </main>
</template>

<style scoped>
.auth-layout, .auth-layout__frame { min-height: 100vh; min-height: 100svh; }
.auth-layout { color-scheme: light; }
.auth-layout__context { display: flex; flex: 0 0 45% !important; flex-direction: column; justify-content: space-between; max-width: 45% !important; min-width: 0 !important; padding: 48px 56px; width: 45% !important; background: var(--bigin-surface-primary-soft) !important; color: var(--bigin-text-primary); }
.auth-layout__context :deep(.ant-layout-sider-children) { display: flex; flex: 1; flex-direction: column; justify-content: space-between; }
.auth-layout__brand, .auth-layout__mobile-brand { align-items: center; display: flex; gap: 12px; }
.auth-layout__brand-name { font-size: 18px; font-weight: 700; line-height: 24px; }
.auth-layout__brand-name span { color: var(--ant-color-primary); }
.auth-layout__brand-label { color: var(--bigin-text-secondary); font-size: 8px; font-weight: 700; letter-spacing: 0.16em; line-height: 12px; text-transform: uppercase; }
.auth-layout__context-copy { margin-top: 86px; max-width: 360px; }
.auth-layout__title { font-size: 27px; font-weight: 700; letter-spacing: -0.02em; line-height: 35px; margin: 0; }
.auth-layout__description { color: var(--bigin-text-secondary); font-size: 13px; line-height: 20px; margin: 18px 0 0; max-width: 350px; }
.auth-layout__benefits { background: var(--bigin-surface-panel); border: 1px solid var(--bigin-border-warning); border-radius: 6px; display: inline-flex; flex-direction: column; gap: 9px; padding: 12px 14px; width: fit-content; }
.auth-layout__benefit { align-items: center; display: flex; font-size: 11px; font-weight: 600; gap: 8px; line-height: 16px; }
.auth-layout__benefit :deep(.anticon) { color: var(--ant-color-primary); font-size: 13px; }
.auth-layout__content { align-items: center; background: var(--bigin-surface-panel); display: flex; justify-content: center; min-width: 0; padding: 32px 56px; }
.auth-layout__form-region { max-width: 344px; width: 100%; }
.auth-layout__form-region--wide { max-width: 344px; }
.auth-layout__mobile-brand { display: none; margin-bottom: 32px; }
@media (max-width: 992px) { .auth-layout__context { display: none; }.auth-layout__content { min-height: 100svh; padding: 32px 24px; }.auth-layout__mobile-brand { display: flex; justify-content: center; } }
</style>
