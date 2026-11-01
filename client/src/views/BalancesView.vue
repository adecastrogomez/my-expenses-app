<script setup>
import { Trash2 } from '@lucide/vue';
import { useFinanceStore } from '../stores/finance.js';
import { formatCurrency } from '../utils/format.js';

const store = useFinanceStore();
</script>

<template>
  <section class="space-y-4">
    <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Saldo de cada miembro</h3>
      <div class="divide-y divide-slate-100">
        <div v-for="b in store.balances.balances" :key="b.userId" class="py-2.5 flex items-center justify-between text-xs">
          <span class="font-bold text-slate-800 truncate">{{ b.name }}</span>
          <span class="font-bold" :class="b.net > 0 ? 'text-emerald-600' : b.net < 0 ? 'text-rose-600' : 'text-slate-400'">
            {{ b.net > 0 ? 'le deben ' : b.net < 0 ? 'debe ' : 'en paz ' }}{{ b.net ? formatCurrency(Math.abs(b.net)) : '' }}
          </span>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Para saldar cuentas</h3>
      <p v-if="!store.balances.transfers.length" class="text-xs text-slate-400 py-2">Todo saldado 🎉</p>
      <div v-else class="space-y-2">
        <div v-for="t in store.balances.transfers" :key="t.from + t.to" class="flex items-center justify-between gap-2 bg-slate-50 rounded-xl p-3 text-xs">
          <span class="text-slate-700 min-w-0">
            <strong>{{ t.from === store.me?.id ? 'Tú' : t.fromName }}</strong> {{ t.from === store.me?.id ? 'debes' : 'debe' }}
            <strong class="text-slate-900">{{ formatCurrency(t.amount) }}</strong> a
            <strong>{{ t.to === store.me?.id ? 'ti' : t.toName }}</strong>
          </span>
          <button v-if="t.from === store.me?.id" class="shrink-0 bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg active:scale-95 transition" @click="store.settle(t.to, t.amount)">
            Ya pagué
          </button>
        </div>
      </div>
    </div>

    <div v-if="store.settlements.length" class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Pagos registrados</h3>
      <div class="divide-y divide-slate-100">
        <div v-for="s in store.settlements" :key="s.id" class="py-2.5 flex items-center justify-between text-xs">
          <span class="text-slate-700 min-w-0">
            {{ s.date }} · <strong>{{ s.fromName }}</strong> → <strong>{{ s.toName }}</strong>
          </span>
          <div class="flex items-center gap-1 shrink-0">
            <span class="font-bold text-slate-900">{{ formatCurrency(s.amount) }}</span>
            <button v-if="s.from === store.me?.id" class="p-1.5 text-slate-300 hover:text-rose-500" aria-label="Deshacer pago" @click="store.removeSettlement(s.id)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
