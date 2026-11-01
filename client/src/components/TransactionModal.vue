<script setup>
import { reactive, computed } from 'vue';
import { X, Home, ShoppingCart, Coffee } from '@lucide/vue';
import { useFinanceStore } from '../stores/finance.js';
import { today, formatCurrency } from '../utils/format.js';

const props = defineProps({ tx: Object });
const emit = defineEmits(['close']);
const store = useFinanceStore();

const memberIds = store.members.map((m) => m.id);

// Al editar, deducimos si el reparto era a partes iguales
const splits = props.tx?.splits ?? [];
const wasEqual = !splits.length || splits.every((s) => Math.abs(s.amount - splits[0].amount) <= 0.01);

const form = reactive({
  id: props.tx?.id ?? null,
  type: props.tx?.type ?? 'expense',
  amount: props.tx?.amount ?? '',
  concept: props.tx?.concept ?? '',
  category: props.tx?.type === 'expense' ? props.tx.category : 'fixed',
  tagId: props.tx?.tagId ?? '',
  date: props.tx?.date ?? today(),
  // Solo grupo
  paidBy: props.tx?.paidBy ?? store.me?.id,
  splitMode: wasEqual ? 'equal' : 'custom',
  equalMembers: splits.length ? splits.map((s) => s.userId) : [...memberIds],
  shares: Object.fromEntries(memberIds.map((id) => [id, splits.find((s) => s.userId === id)?.amount ?? 0])),
});

const categories = [
  { id: 'fixed', label: 'Fijo', icon: Home, on: 'peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700' },
  { id: 'variable', label: 'Variable', icon: ShoppingCart, on: 'peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700' },
  { id: 'discretionary', label: 'Discrecional', icon: Coffee, on: 'peer-checked:border-rose-500 peer-checked:bg-rose-50 peer-checked:text-rose-700' },
];

const customTotal = computed(() => memberIds.reduce((s, id) => s + (Number(form.shares[id]) || 0), 0));
const customDiff = computed(() => Math.round((Number(form.amount || 0) - customTotal.value) * 100) / 100);

function buildSplit() {
  if (form.splitMode === 'equal') return { mode: 'equal', members: form.equalMembers };
  return { mode: 'custom', shares: memberIds.filter((id) => Number(form.shares[id]) > 0).map((id) => ({ userId: id, amount: Number(form.shares[id]) })) };
}

async function submit() {
  const payload = {
    id: form.id,
    type: form.type,
    amount: Number(form.amount),
    concept: form.concept,
    category: form.type === 'income' ? 'income' : form.category,
    date: form.date,
    tagId: form.type === 'expense' && form.tagId ? form.tagId : null,
  };
  if (store.isGroup) {
    if (form.splitMode === 'equal' && !form.equalMembers.length) return store.notify('Elige entre quién se reparte');
    if (form.splitMode === 'custom' && customDiff.value !== 0) return store.notify('Las partes deben sumar el importe total');
    Object.assign(payload, { paidBy: form.paidBy, split: buildSplit() });
  }
  if (await store.saveTransaction(payload)) emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4" @click.self="$emit('close')">
    <div class="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar shadow-2xl">
      <div class="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 class="text-base font-bold text-slate-900">
          {{ form.id ? 'Editar' : 'Nuevo' }} {{ store.isGroup ? 'gasto compartido' : 'movimiento' }}
        </h3>
        <button class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center" aria-label="Cerrar" @click="$emit('close')">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div v-if="!store.isGroup" class="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
        <button
          v-for="t in [['expense', 'Gasto'], ['income', 'Ingreso']]"
          :key="t[0]"
          type="button"
          class="py-2 text-xs font-bold rounded-xl transition"
          :class="form.type === t[0] ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'"
          @click="form.type = t[0]"
        >
          {{ t[1] }}
        </button>
      </div>

      <form class="space-y-3.5" @submit.prevent="submit">
        <div>
          <label for="tx-amount" class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Importe (€)</label>
          <input
            id="tx-amount"
            v-model="form.amount"
            type="number"
            step="0.01"
            min="0.01"
            inputmode="decimal"
            required
            placeholder="0.00"
            class="w-full mt-1 text-2xl font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-emerald-500 focus:bg-white transition text-center"
          />
        </div>

        <div>
          <label for="tx-concept" class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Concepto</label>
          <input
            id="tx-concept"
            v-model="form.concept"
            type="text"
            required
            maxlength="120"
            placeholder="ej. Compra Mercadona, Alquiler, Restaurante..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-900 focus:outline-emerald-500 mt-1"
          />
        </div>

        <div v-if="form.type === 'expense'">
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Tipo de Gasto</span>
          <div class="grid grid-cols-3 gap-2 mt-1">
            <label v-for="c in categories" :key="c.id" class="cursor-pointer">
              <input v-model="form.category" type="radio" :value="c.id" class="peer sr-only" />
              <div class="p-2.5 rounded-xl border border-slate-200 text-center transition" :class="c.on">
                <component :is="c.icon" class="w-4 h-4 mx-auto mb-1" />
                <span class="text-[11px] font-bold block">{{ c.label }}</span>
              </div>
            </label>
          </div>
        </div>

        <div v-if="form.type === 'expense'">
          <label for="tx-tag" class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Etiqueta</label>
          <select id="tx-tag" v-model="form.tagId" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 mt-1">
            <option value="">Sin etiqueta</option>
            <option v-for="t in store.tags" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <p v-if="!store.tags.length" class="text-[11px] text-slate-400 mt-1">Crea etiquetas en la pestaña Cuenta.</p>
        </div>

        <template v-if="store.isGroup">
          <div>
            <label for="tx-paid-by" class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Pagado por</label>
            <select id="tx-paid-by" v-model="form.paidBy" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 mt-1">
              <option v-for="m in store.members" :key="m.id" :value="m.id">{{ m.id === store.me?.id ? 'Yo' : m.name }}</option>
            </select>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Repartir</span>
              <div class="flex bg-slate-100 rounded-lg p-0.5 text-[11px] font-bold">
                <button type="button" class="px-2.5 py-1 rounded-md" :class="form.splitMode === 'equal' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'" @click="form.splitMode = 'equal'">A partes iguales</button>
                <button type="button" class="px-2.5 py-1 rounded-md" :class="form.splitMode === 'custom' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'" @click="form.splitMode = 'custom'">Importes</button>
              </div>
            </div>

            <div v-if="form.splitMode === 'equal'" class="mt-2 space-y-1.5">
              <label v-for="m in store.members" :key="m.id" class="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input v-model="form.equalMembers" type="checkbox" :value="m.id" class="accent-emerald-600 w-4 h-4" />
                {{ m.id === store.me?.id ? 'Yo' : m.name }}
              </label>
            </div>

            <div v-else class="mt-2 space-y-1.5">
              <div v-for="m in store.members" :key="m.id" class="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800">
                <span class="flex-1 truncate">{{ m.id === store.me?.id ? 'Yo' : m.name }}</span>
                <input v-model="form.shares[m.id]" type="number" step="0.01" min="0" inputmode="decimal" :aria-label="'Parte de ' + m.name" class="w-24 text-right bg-white border border-slate-200 rounded-lg p-1.5" />
              </div>
              <p class="text-[11px] font-semibold" :class="customDiff === 0 ? 'text-emerald-600' : 'text-rose-600'">
                {{ customDiff === 0 ? 'Cuadra con el total' : (customDiff > 0 ? 'Faltan ' : 'Sobran ') + formatCurrency(Math.abs(customDiff)) }}
              </p>
            </div>
          </div>
        </template>

        <div>
          <label for="tx-date" class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Fecha</label>
          <input id="tx-date" v-model="form.date" type="date" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 mt-1" />
        </div>

        <button type="submit" class="w-full py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-bold shadow-md hover:bg-slate-800 active:scale-[0.98] transition">
          Guardar
        </button>
      </form>
    </div>
  </div>
</template>
