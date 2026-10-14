import { configureStore, createSlice, nanoid } from "@reduxjs/toolkit";

const seed = {
  users: [
    {
      id: "demo",
      name: "Демо пользователь",
      email: "demo@example.com",
      provider: "demo",
    },
  ],
  currentUserId: null,
  wallets: [
    {
      id: "cash",
      userId: "demo",
      name: "Наличные",
      type: "cash",
      currency: "RUB",
      initialBalance: 35000,
      color: "#0f766e",
    },
    {
      id: "card",
      userId: "demo",
      name: "Основная карта",
      type: "card",
      currency: "RUB",
      initialBalance: 82000,
      color: "#2563eb",
    },
  ],
  transactions: [
    {
      id: "t1",
      userId: "demo",
      walletId: "card",
      type: "income",
      amount: 120000,
      category: "Зарплата",
      note: "Сентябрь",
      date: "2026-09-01",
    },
    {
      id: "t2",
      userId: "demo",
      walletId: "card",
      type: "expense",
      amount: 2450,
      category: "Продукты",
      note: "Супермаркет",
      date: "2026-09-03",
    },
    {
      id: "t3",
      userId: "demo",
      walletId: "cash",
      type: "expense",
      amount: 900,
      category: "Транспорт",
      note: "Такси",
      date: "2026-09-05",
    },
    {
      id: "t4",
      userId: "demo",
      walletId: "card",
      type: "expense",
      amount: 6500,
      category: "Жильё",
      note: "Коммунальные услуги",
      date: "2026-09-07",
    },
  ],
  recurring: [
    {
      id: "r1",
      userId: "demo",
      name: "Аренда квартиры",
      amount: 32000,
      category: "Жильё",
      walletId: "card",
      nextDate: "2026-10-05",
      frequency: "monthly",
      active: true,
    },
    {
      id: "r2",
      userId: "demo",
      name: "Интернет",
      amount: 750,
      category: "Связь",
      walletId: "card",
      nextDate: "2026-09-25",
      frequency: "monthly",
      active: true,
    },
  ],
  budgets: [
    {
      id: "b1",
      userId: "demo",
      category: "Продукты",
      limit: 20000,
      period: "month",
    },
    {
      id: "b2",
      userId: "demo",
      category: "Транспорт",
      limit: 10000,
      period: "month",
    },
  ],
  goals: [
    {
      id: "g1",
      userId: "demo",
      name: "Отпуск",
      target: 180000,
      saved: 45000,
      deadline: "2027-07-01",
      color: "#f59e0b",
    },
  ],
  settings: { demo: { currency: "RUB", theme: "light", language: "ru" } },
};

const loaded = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem("finance-tracker-state"));

    if (!saved) {
      return seed;
    }

    return {
      ...saved,
      users: (saved.users || []).map(({ password, ...user }) => user),
    };
  } catch {
    return seed;
  }
})();

const initialState = {
  ...seed,
  ...loaded,
  users: loaded.users || seed.users,
  settings: loaded.settings || seed.settings,
};

const slice = createSlice({
  name: "finance",
  initialState,
  reducers: {
    loginWithGithub(state, action) {
      const profile = action.payload;
      let user = state.users.find(
        (item) =>
          item.provider === "github" &&
          item.providerUserId === profile.providerUserId,
      );

      if (!user) {
        user = state.users.find(
          (item) => item.email.toLowerCase() === profile.email.toLowerCase(),
        );
      }

      if (!user) {
        user = {
          id: nanoid(),
          name: profile.name,
          email: profile.email,
          avatar: profile.avatar,
          provider: "github",
          providerUserId: profile.providerUserId,
        };
        state.users.push(user);
      } else {
        user.name = profile.name;
        user.avatar = profile.avatar;
        user.provider = "github";
        user.providerUserId = profile.providerUserId;
      }

      state.currentUserId = user.id;
      if (!state.settings[user.id]) {
        state.settings[user.id] = {
          currency: "RUB",
          theme: "light",
          language: "ru",
        };
      }
    },
    logout(state) {
      state.currentUserId = null;
    },
    addWallet(state, action) {
      state.wallets.push({ ...action.payload, id: nanoid() });
    },
    updateWallet(state, action) {
      const i = state.wallets.findIndex((w) => w.id === action.payload.id);
      if (i >= 0) state.wallets[i] = action.payload;
    },
    deleteWallet(state, action) {
      state.wallets = state.wallets.filter((w) => w.id !== action.payload);
      state.transactions = state.transactions.filter(
        (t) => t.walletId !== action.payload,
      );
    },
    addTransaction(state, action) {
      state.transactions.push({ ...action.payload, id: nanoid() });
    },
    updateTransaction(state, action) {
      const i = state.transactions.findIndex((t) => t.id === action.payload.id);
      if (i >= 0) state.transactions[i] = action.payload;
    },
    deleteTransaction(state, action) {
      state.transactions = state.transactions.filter(
        (t) => t.id !== action.payload,
      );
    },
    addRecurring(state, action) {
      state.recurring.push({ ...action.payload, id: nanoid(), active: true });
    },
    updateRecurring(state, action) {
      const i = state.recurring.findIndex((r) => r.id === action.payload.id);
      if (i >= 0) state.recurring[i] = action.payload;
    },
    deleteRecurring(state, action) {
      state.recurring = state.recurring.filter((r) => r.id !== action.payload);
    },
    processRecurring(state, action) {
      const today = action.payload;
      state.recurring
        .filter(
          (r) =>
            r.active && r.userId === state.currentUserId && r.nextDate <= today,
        )
        .forEach((r) => {
          state.transactions.push({
            id: nanoid(),
            userId: r.userId,
            walletId: r.walletId,
            type: "expense",
            amount: r.amount,
            category: r.category,
            note: `Регулярный платёж: ${r.name}`,
            date: r.nextDate,
          });
          const d = new Date(r.nextDate);
          d.setMonth(d.getMonth() + (r.frequency === "yearly" ? 12 : 1));
          r.nextDate = d.toISOString().slice(0, 10);
        });
    },
    addBudget(state, action) {
      state.budgets.push({ ...action.payload, id: nanoid() });
    },
    updateBudget(state, action) {
      const i = state.budgets.findIndex((b) => b.id === action.payload.id);
      if (i >= 0) state.budgets[i] = action.payload;
    },
    deleteBudget(state, action) {
      state.budgets = state.budgets.filter((b) => b.id !== action.payload);
    },
    addGoal(state, action) {
      state.goals.push({ ...action.payload, id: nanoid(), saved: 0 });
    },
    updateGoal(state, action) {
      const i = state.goals.findIndex((g) => g.id === action.payload.id);
      if (i >= 0) state.goals[i] = action.payload;
    },
    contributeGoal(state, action) {
      const goal = state.goals.find((g) => g.id === action.payload.id);
      if (goal)
        goal.saved = Math.min(
          goal.target,
          Number(goal.saved) + Number(action.payload.amount),
        );
    },
    deleteGoal(state, action) {
      state.goals = state.goals.filter((g) => g.id !== action.payload);
    },
    updateSettings(state, action) {
      state.settings[state.currentUserId] = {
        ...(state.settings[state.currentUserId] || {}),
        ...action.payload,
      };
    },
  },
});

export const actions = slice.actions;
export const store = configureStore({ reducer: slice.reducer });
store.subscribe(() =>
  localStorage.setItem(
    "finance-tracker-state",
    JSON.stringify(store.getState()),
  ),
);

export const currentUser = (s) => s.users.find((u) => u.id === s.currentUserId);
export const userWallets = (s) =>
  s.wallets.filter((w) => w.userId === s.currentUserId);
export const userTransactions = (s) =>
  s.transactions.filter((t) => t.userId === s.currentUserId);
export const userRecurring = (s) =>
  s.recurring.filter((r) => r.userId === s.currentUserId);
export const userBudgets = (s) =>
  s.budgets.filter((b) => b.userId === s.currentUserId);
export const userGoals = (s) =>
  s.goals.filter((g) => g.userId === s.currentUserId);
