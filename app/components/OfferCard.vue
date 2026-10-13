<script setup lang="ts">
import { computed } from 'vue'
import type { Offer, OfferId } from '../../shared/types/paywall'

const props = defineProps<{ offer: Offer, selected: boolean, disabled: boolean }>()
const emit = defineEmits<{ select: [id: OfferId] }>()
const price = computed(() => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(props.offer.price / 100).replace(/\u00a0/g, ' '))
</script>

<template>
  <label class="offer-card" :class="{ 'is-selected': selected }">
    <input
      class="visually-hidden" type="radio" name="offer" :value="offer.id"
      :checked="selected" :disabled="disabled" @change="emit('select', offer.id)"
    >
    <img class="offer-selection" :src="selected ? '/images/selection-on.svg' : '/images/selection-off.svg'" width="24" height="24" alt="">
    <span class="offer-details">
      <span class="offer-title">{{ offer.title }}<span v-if="offer.period === 'year'"> · −45%</span></span>
      <span class="offer-caption">{{ offer.period === 'year' ? '12 месяцев открытий' : 'Попробуйте целый мир' }}</span>
    </span>
    <span class="offer-pricing">
      <span class="offer-price">{{ price }} ₽</span>
      <span class="offer-period">/ {{ offer.period === 'year' ? 'год' : 'месяц' }}</span>
    </span>
  </label>
</template>
