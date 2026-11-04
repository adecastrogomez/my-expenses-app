<script setup>
import { computed, ref } from 'vue';
import { Home, ShoppingCart, Coffee, TrendingUp, Trash2 } from '@lucide/vue';
import { useFinanceStore } from '../stores/finance.js';
import { formatCurrency } from '../utils/format.js';

const props = defineProps({ tx: { type: Object, required: true } });
const emit = defineEmits(['edit']);
const store = useFinanceStore();

const confirming = ref(false);

// Deslizar a la izquierda para mostrar la papelera (estilo iOS)
const ACTION_W = 72;
const offset = ref(0);
const dragging = ref(false);
let startX = 0;
let startOffset = 0;
let moved = false;

function onDown(e) {
  startX = e.clientX;
  startOffset = offset.value;
  moved = false;
  dragging.value = true;
  e.currentTarget.setPointerCapture?.(e.pointerId);
}
function onMove(e) {
  if (!dragging.value) return;
  const dx = e.clientX - startX;
  if (Math.abs(dx) > 5) moved = true;
  offset.value = Math.min(0, Math.max(-ACTION_W, startOffset + dx));
}
function onUp() {
  if (!dragging.value) return;
  dragging.value = false;
  offset.value = offset.value < -ACTION_W / 2 ? -ACTION_W : 0;
}
function onCardClick() {
  if (moved) return;
  if (offset.value !== 0) { offset.value = 0; return; }
  emit('edit', props.tx);
}
function askDelete() {
  offset.value = 0;
  confirming.value = true;
}
async function confirmDelete() {
  confirming.value = false;
  await store.removeTransaction(props.tx.id);
}

const META = {
  income: { icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50', name: 'Ingreso' },
  fixed: { icon: Home, color: 'text-blue-500 bg-blue-50', name: 'Fijo' },
  variable: { icon: ShoppingCart, color: 'text-amber-500 bg-amber-50', name: 'Variable' },
  discretionary: { icon: Coffee, color: 'text-rose-500 bg-rose-50', name: 'Discrecional' },
};

const meta = computed(() => META[props.tx.category]);
const tag = computed(() => store.tags.find((t) => t.id === props.tx.tagId));
const isIncome = computed(() => props.tx.type === 'income');
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl">
    <button
      class="absolute inset-y-0 right-0 flex items-center justify-center bg-rose-500 text-white"
      :style="{ width: ACTION_W + 'px' }"
      aria-label="Eliminar"
      @click="askDelete"
    >
      <Trash2 class="w-5 h-5" />
    </button>
    <div
      class="relative bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs flex items-center justify-between cursor-pointer select-none"
      :class="dragging ? '' : 'transition-transform duration-200'"
      :style="{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @click="onCardClick"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="meta.color">
          <component :is="meta.icon" class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <h4 class="text-xs font-bold text-slate-900 leading-tight truncate">{{ tx.concept }}</h4>
          <div class="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
            <span>{{ tx.date }}</span>
            <span>•</span>
            <template v-if="store.isGroup">
              <span class="font-semibold text-slate-600">Pagó {{ tx.paidByName }}</span>
              <span>•</span>
              <span>÷ {{ tx.splits?.length ?? 0 }}</span>
            </template>
            <span v-else>{{ meta.name }}</span>
            <template v-if="tag">
              <span>•</span>
              <span class="inline-flex items-center gap-1 font-semibold text-slate-600">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: tag.color }"></span>{{ tag.name }}
              </span>
            </template>
          </div>
        </div>
      </div>
      <span class="text-xs font-black shrink-0" :class="isIncome ? 'text-emerald-600' : 'text-slate-900'">
        {{ isIncome ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
      </span>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="confirming"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-6"
      @click.self="confirming = false"
    >
      <div class="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm" role="alertdialog" aria-modal="true">
        <p class="text-sm text-slate-900">
          Va a eliminar el gasto <strong>{{ tx.concept }}</strong>. ¿Está seguro?
        </p>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-2 text-xs font-bold text-slate-600 rounded-xl bg-slate-100 active:bg-slate-200" @click="confirming = false">
            Cancelar
          </button>
          <button class="px-4 py-2 text-xs font-bold text-white rounded-xl bg-rose-500 active:bg-rose-600" @click="confirmDelete">
            Aceptar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
