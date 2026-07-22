<script setup>
defineProps({
  wide: {
    type: Boolean,
    default: false,
  },
})

const currentYear = new Date().getFullYear()
</script>

<template>
  <main class="auth-shell">
    <aside class="auth-shell__context" aria-label="Giới thiệu hệ thống">
      <RouterLink class="auth-brand" :to="{ name: 'login' }" aria-label="BigIn Asset">
        <span class="auth-brand__mark" aria-hidden="true">BI</span>
        <span class="auth-brand__text">
          <strong>BigIn Asset</strong>
          <small>Internal workspace</small>
        </span>
      </RouterLink>

      <div class="auth-shell__context-copy">
        <p class="auth-shell__eyebrow">QUẢN LÝ TÀI SẢN NỘI BỘ</p>
        <h1>Một nơi để quản lý toàn bộ vòng đời thiết bị.</h1>
        <p>
          Theo dõi tài sản, yêu cầu mượn trả và lịch sử sửa chữa trong cùng một
          không gian làm việc.
        </p>

        <ul class="auth-shell__benefits" aria-label="Tính năng chính">
          <li>Thông tin tài sản rõ ràng và nhất quán</li>
          <li>Quy trình bàn giao dễ theo dõi</li>
          <li>Trạng thái cập nhật theo từng nghiệp vụ</li>
        </ul>
      </div>

      <p class="auth-shell__context-footer">BigIn SE · Asset Management</p>
    </aside>

    <section class="auth-shell__form-panel">
      <div
        class="auth-shell__form-wrap"
        :class="{ 'auth-shell__form-wrap--wide': wide }"
      >
        <slot />
      </div>

      <p class="auth-shell__legal">
        © {{ currentYear }} BigIn SE. Dành cho người dùng được cấp quyền.
      </p>
    </section>
  </main>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  min-height: 100svh;
  display: grid;
  grid-template-columns: minmax(340px, 42%) minmax(0, 1fr);
  background: #ffffff;
  color: #182421;
}

.auth-shell__context {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: clamp(2rem, 5vw, 4.75rem);
  color: #f7fbf9;
  background: #173f3a;
}

.auth-brand {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  color: inherit;
  text-decoration: none;
}

.auth-brand__mark {
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 0.65rem;
  background: rgba(255, 255, 255, 0.1);
  font-size: 0.9rem;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.auth-brand__text {
  display: grid;
  line-height: 1.2;
}

.auth-brand__text strong {
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.auth-brand__text small {
  margin-top: 0.2rem;
  color: #b8d0ca;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.auth-shell__context-copy {
  max-width: 31rem;
  margin: auto 0;
  padding: 4rem 0;
}

.auth-shell__eyebrow {
  margin-bottom: 1rem;
  color: #a9c9c0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.auth-shell__context h1 {
  max-width: 28rem;
  font-size: clamp(2rem, 4vw, 3.4rem);
  font-weight: 680;
  line-height: 1.08;
  letter-spacing: -0.035em;
}

.auth-shell__context-copy > p:not(.auth-shell__eyebrow) {
  max-width: 29rem;
  margin-top: 1.35rem;
  color: #cee0dc;
  font-size: 1rem;
  line-height: 1.7;
}

.auth-shell__benefits {
  display: grid;
  gap: 0.75rem;
  margin: 2rem 0 0;
  padding: 0;
  list-style: none;
}

.auth-shell__benefits li {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #edf6f3;
  font-size: 0.9rem;
}

.auth-shell__benefits li::before {
  content: '✓';
  width: 1.25rem;
  height: 1.25rem;
  flex: 0 0 1.25rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #173f3a;
  background: #9fd5c5;
  font-size: 0.72rem;
  font-weight: 800;
}

.auth-shell__context-footer,
.auth-shell__legal {
  font-size: 0.75rem;
}

.auth-shell__context-footer {
  color: #9abbb3;
}

.auth-shell__form-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem clamp(1.5rem, 6vw, 6rem) 1.5rem;
  background: #ffffff;
}

.auth-shell__form-wrap {
  width: 100%;
  max-width: 27rem;
  margin: auto 0;
}

.auth-shell__form-wrap--wide {
  max-width: 34rem;
}

.auth-shell__legal {
  margin-top: 2rem;
  color: #7a8682;
  text-align: center;
}

@media (max-width: 900px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }

  .auth-shell__context {
    min-height: auto;
    padding: 1.5rem clamp(1.25rem, 5vw, 3rem);
  }

  .auth-shell__context-copy {
    margin: 2.75rem 0 0;
    padding: 0;
  }

  .auth-shell__context h1 {
    max-width: 36rem;
    font-size: 2rem;
  }

  .auth-shell__benefits,
  .auth-shell__context-copy > p:not(.auth-shell__eyebrow),
  .auth-shell__context-footer {
    display: none;
  }

  .auth-shell__form-panel {
    min-height: 65vh;
    padding: 2.5rem clamp(1.25rem, 7vw, 4rem) 1.25rem;
  }
}

@media (max-width: 600px) {
  .auth-shell__context {
    padding: 1rem 1.25rem;
  }

  .auth-brand__mark {
    width: 2.4rem;
    height: 2.4rem;
  }

  .auth-shell__context-copy {
    display: none;
  }

  .auth-shell__form-panel {
    min-height: calc(100svh - 4.5rem);
    justify-content: flex-start;
    padding: 2rem 1.25rem 1.1rem;
  }

  .auth-shell__legal {
    margin-top: 2.5rem;
  }
}
</style>
