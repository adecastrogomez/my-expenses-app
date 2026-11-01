<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { Plus } from '@lucide/vue';
import { useAuthStore } from './stores/auth.js';
import { useFinanceStore } from './stores/finance.js';
import AppHeader from './components/AppHeader.vue';
import BottomNav from './components/BottomNav.vue';
import ToastMessage from './components/ToastMessage.vue';
import TransactionModal from './components/TransactionModal.vue';
import LoginView from './views/LoginView.vue';
import OverviewView from './views/OverviewView.vue';
import GroupOverviewView from './views/GroupOverviewView.vue';
import RecordsView from './views/RecordsView.vue';
import AnalyticsView from './views/AnalyticsView.vue';
import BalancesView from './views/BalancesView.vue';
import AccountView from './views/AccountView.vue';

const auth = useAuthStore();
const store = useFinanceStore();
const tab = ref('overview');
const modalOpen = ref(false);
const editing = ref(null);

const views = computed(() => ({
  overview: store.isGroup ? GroupOverviewView : OverviewView,
  records: RecordsView,
  analytics: AnalyticsView,
  balances: BalancesView,
  account: AccountView,
}));

// "Saldos" solo existe dentro de un grupo
watch(() => store.isGroup, (isGroup) => {
  if (!isGroup && tab.value === 'balances') tab.value = 'overview';
});

function openModal(tx = null) {
  editing.value = tx;
  modalOpen.value = true;
}

// Al iniciar / cerrar sesión cargamos o limpiamos los datos
watch(
  () => auth.session?.user.id,
  (id) => (id ? store.init() : store.reset()),
  { immediate: false },
);

onMounted(async () => {
  await auth.init();
  if (auth.session) store.init();
});
</script>

<template>
  <div v-if="!auth.ready" class="flex-1 flex items-center justify-center text-xs text-slate-400">Cargando...</div>
  <LoginView v-else-if="!auth.session" />
  <template v-else>
    <AppHeader />

    <main class="flex-1 overflow-y-auto px-4 pt-3 pb-24 no-scrollbar">
      <component :is="views[tab]" :key="store.context + tab" @edit="openModal" @configure="tab = 'account'" />
    </main>

    <button
      v-if="tab !== 'account'"
      class="fixed right-5 bottom-20 z-20 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center active:scale-90 transition-transform"
      aria-label="Añadir movimiento"
      @click="openModal()"
    >
      <Plus class="w-7 h-7" :stroke-width="2.5" />
    </button>

    <BottomNav v-model="tab" />
    <TransactionModal v-if="modalOpen" :tx="editing" @close="modalOpen = false" />
  </template>
  <ToastMessage />
</template>
