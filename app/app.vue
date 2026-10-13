<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { usePaywall } from './composables/usePaywall'

const { offers, offersStatus, offersError, refresh, selected, busy, purchase, actionError, notice, buy, restore, select } = usePaywall()
const title = ref<HTMLHeadingElement>()
const purchaseFailed = computed(() => actionError.value.startsWith('Не удалось завершить'))
const purchasedOffer = computed(() => offers.value.find(offer => offer.id === purchase.value?.offerId))
const actionLabel = computed(() => {
  if (purchase.value) return 'Полный доступ открыт'
  if (busy.value === 'purchase') return 'Открываем доступ…'
  if (purchaseFailed.value) return 'Попробовать снова'
  return 'Открыть полный доступ'
})
watch(purchase, async (value) => {
  if (!value) return
  await nextTick()
  title.value?.focus({ preventScroll: true })
})
</script>

<template>
  <main class="paywall" aria-label="Полный доступ к игре Amaya">
    <header class="brand">
      <span class="brand-name">amaya</span>
      <span class="brand-audience">ДЛЯ РОДИТЕЛЕЙ</span>
    </header>

    <div class="world-art">
      <img src="/images/world.svg" width="342" height="192" alt="" fetchpriority="high">
    </div>

    <h1 ref="title" class="hero-title" tabindex="-1">
      <template v-if="purchase">Готово! Мир игры<br>теперь открыт</template>
      <template v-else>Откройте весь<br>мир игры</template>
    </h1>
    <div class="hero-description" :class="{ 'has-error': actionError }" aria-live="polite" aria-atomic="true">
      <p v-if="actionError" role="alert">{{ actionError }}</p>
      <p v-else-if="purchase">Все игры теперь доступны.<br>Покупка сохранена для этого устройства.</p>
      <p v-else-if="notice" role="status">{{ notice }}</p>
      <p v-else>Все игры, новые открытия<br>и маленькие победы каждый день.</p>
    </div>

    <ul class="benefits" aria-label="Преимущества полного доступа">
      <li>✓ Без рекламы</li>
      <li>✓ Весь контент</li>
    </ul>

    <section v-if="purchase" class="success-panel" role="status" aria-label="Покупка успешна">
      <p>Ваш тариф: {{ purchasedOffer?.title ?? (purchase.offerId === 'yearly' ? 'Год' : 'Месяц') }}<br>Доступ на {{ purchase.offerId === 'yearly' ? '12 месяцев' : '1 месяц' }}</p>
    </section>
    <div v-else-if="offersError" class="offers-message" role="alert">
      <p>Не удалось загрузить тарифы.</p>
      <button class="text-button" type="button" @click="refresh()">Попробовать ещё раз</button>
    </div>
    <div v-else-if="offersStatus === 'pending' || !offers.length" class="offers-loading" role="status" aria-label="Загружаем тарифы" aria-busy="true">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <span class="visually-hidden">Загружаем тарифы…</span>
    </div>
    <fieldset v-else class="offers" :disabled="Boolean(busy)">
      <legend class="visually-hidden">Выберите тариф</legend>
      <OfferCard v-for="offer in offers" :key="offer.id" :offer="offer" :selected="offer.id === selected" :disabled="Boolean(busy)" @select="select" />
    </fieldset>

    <button class="purchase-button" :class="{ 'is-loading': busy === 'purchase' }" type="button" :disabled="Boolean(busy) || Boolean(purchase) || Boolean(offersError) || !offers.length" :aria-busy="busy === 'purchase'" @click="buy">
      {{ actionLabel }}
    </button>
    <button class="restore-button" type="button" :disabled="Boolean(busy)" :aria-busy="busy === 'restore'" @click="restore">
      {{ busy === 'restore' ? 'Восстанавливаем…' : 'Восстановить покупки' }}
    </button>
    <p class="demo-note">Тестовая покупка —<br>деньги не списываются</p>
    <span class="visually-hidden" role="status" aria-live="polite">{{ busy === 'purchase' ? 'Сохраняем тестовую покупку' : '' }}</span>
  </main>
</template>
