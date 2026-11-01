import { defineStore } from 'pinia';
import { api } from '../api.js';
import { currentMonth } from '../utils/format.js';

const CONTEXT_KEY = 'context';
const POLL_MS = 10_000;

const read = () => {
  try {
    return localStorage.getItem(CONTEXT_KEY) || 'personal';
  } catch {
    return 'personal';
  }
};

let pollTimer = null;

export const useFinanceStore = defineStore('finance', {
  state: () => ({
    me: null,
    groups: [],
    context: read(), // 'personal' | groupId
    month: currentMonth(),
    transactions: [],
    summary: null,
    history: [],
    tags: [],
    tagSummary: null,
    balances: { balances: [], transfers: [] },
    settlements: [],
    filter: 'all',
    status: 'loading', // loading | online | error
    toast: '',
  }),

  getters: {
    isGroup: (s) => s.context !== 'personal',
    scope: (s) => (s.context === 'personal' ? null : s.context),
    group: (s) => s.groups.find((g) => g.id === s.context) ?? null,
    members() {
      return this.group?.members ?? [];
    },
    filteredTransactions: (s) =>
      s.transactions.filter((t) => {
        if (s.filter === 'all') return true;
        if (s.filter === 'income') return t.type === 'income';
        return t.type === 'expense' && t.category === s.filter;
      }),
  },

  actions: {
    notify(text) {
      this.toast = text;
      setTimeout(() => {
        if (this.toast === text) this.toast = '';
      }, 2500);
    },

    /** Recarga los datos del contexto activo (personal o grupo). */
    async refresh() {
      const scope = this.scope;
      try {
        const [transactions, summary, history, tags, tagSummary] = await Promise.all([
          api.listTransactions(scope, this.month),
          api.summary(scope, this.month),
          api.history(scope),
          api.listTags(scope),
          api.tagSummary(scope, this.month),
        ]);
        let extra = {};
        if (scope) {
          const [balances, settlements] = await Promise.all([api.balances(scope), api.settlements(scope)]);
          extra = { balances, settlements };
        }
        // Si el usuario cambió de contexto mientras cargaba, descartamos el resultado
        if (scope !== this.scope) return;
        Object.assign(this, { transactions, summary, history, tags, tagSummary, ...extra, status: 'online' });
      } catch (e) {
        this.status = 'error';
      }
    },

    async loadGroups() {
      this.groups = await api.listGroups();
      // Si el grupo guardado ya no existe (salimos de él), volvemos a personal
      if (this.isGroup && !this.group) this.context = 'personal';
    },

    async init() {
      this.status = 'loading';
      try {
        [this.me] = await Promise.all([api.me(), this.loadGroups()]);
      } catch {
        this.status = 'error';
        return;
      }
      await this.refresh();
      clearInterval(pollTimer);
      pollTimer = setInterval(() => document.visibilityState === 'visible' && this.refresh(), POLL_MS);
    },

    reset() {
      clearInterval(pollTimer);
      this.$reset();
    },

    async setContext(context) {
      this.context = context;
      this.filter = 'all';
      this.transactions = [];
      this.summary = null;
      this.tags = [];
      this.tagSummary = null;
      try {
        localStorage.setItem(CONTEXT_KEY, context);
      } catch {
        /* almacenamiento no disponible */
      }
      await this.refresh();
    },

    async setMonth(month) {
      if (!month) return;
      this.month = month;
      await this.refresh();
    },

    async saveTransaction(tx) {
      try {
        await api.saveTransaction(this.scope, tx);
        await this.refresh();
        this.notify('Movimiento guardado');
        return true;
      } catch (e) {
        this.notify(e.message);
        return false;
      }
    },

    async removeTransaction(id) {
      try {
        await api.deleteTransaction(this.scope, id);
        await this.refresh();
        this.notify('Movimiento eliminado');
      } catch (e) {
        this.notify(e.message);
      }
    },

    async saveTarget(target) {
      try {
        await api.saveTarget(this.month, target);
        await this.refresh();
        this.notify('Objetivo guardado');
        return true;
      } catch (e) {
        this.notify(e.message);
        return false;
      }
    },

    async clearTarget() {
      try {
        await api.clearTarget(this.month);
        await this.refresh();
        this.notify('Objetivo restablecido');
      } catch (e) {
        this.notify(e.message);
      }
    },

    async saveTag(tag) {
      try {
        await api.saveTag(this.scope, tag);
        await this.refresh();
        return true;
      } catch (e) {
        this.notify(e.message);
        return false;
      }
    },

    async removeTag(id) {
      try {
        await api.deleteTag(this.scope, id);
        await this.refresh();
        this.notify('Etiqueta eliminada');
      } catch (e) {
        this.notify(e.message);
      }
    },

    async saveName(name) {
      try {
        this.me = await api.saveMe(name);
        await this.loadGroups();
        this.notify('Nombre guardado');
      } catch (e) {
        this.notify(e.message);
      }
    },

    async createGroup(name) {
      try {
        const g = await api.createGroup(name);
        await this.loadGroups();
        await this.setContext(g.id);
        this.notify('Grupo creado');
      } catch (e) {
        this.notify(e.message);
      }
    },

    async joinGroup(code) {
      try {
        const g = await api.joinGroup(code);
        await this.loadGroups();
        await this.setContext(g.id);
        this.notify(`Te has unido a ${g.name}`);
      } catch (e) {
        this.notify(e.message);
      }
    },

    async leaveGroup() {
      try {
        await api.leaveGroup(this.context);
        await this.loadGroups();
        await this.setContext('personal');
        this.notify('Has salido del grupo');
      } catch (e) {
        this.notify(e.message);
      }
    },

    async settle(to, amount) {
      try {
        await api.addSettlement(this.context, to, amount);
        await this.refresh();
        this.notify('Pago registrado');
      } catch (e) {
        this.notify(e.message);
      }
    },

    async removeSettlement(id) {
      try {
        await api.deleteSettlement(this.context, id);
        await this.refresh();
      } catch (e) {
        this.notify(e.message);
      }
    },
  },
});
