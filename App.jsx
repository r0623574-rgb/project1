import React, { useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  actions,
  currentUser,
  userBudgets,
  userGoals,
  userRecurring,
  userTransactions,
  userWallets,
} from "./store";

const categories = [
  "Продукты",
  "Транспорт",
  "Жильё",  
  "Связь",
  "Развлечения",
  "Здоровье",
  "Покупки",
  "Другое",
];
const currencySymbols = {
  KGS: "сом",
  RUB: "₽",
  USD: "$",
  EUR: "€",
};
const today = () => new Date().toISOString().slice(0, 10);
const money = (value, currency = "RUB") =>
  `${Number(value || 0).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ${currencySymbols[currency] || currency}`;
const dateLabel = (value) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function Protected() {
  const logged = useSelector((s) => s.currentUserId);
  return logged ? <Layout /> : <Navigate to="/login" replace />;
}

function Auth({ register = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("github") !== "success") {
      return;
    }

    fetch("/api/auth/session", {
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("GitHub session request failed");
        }

        return response.json();
      })
      .then((profile) => {
        dispatch(actions.loginWithGithub(profile));
        navigate("/", { replace: true });
      })
      .catch(() => {
        setError("Не удалось получить данные GitHub-пользователя");
      });
  }, [dispatch, navigate]);

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand large">
          <span className="brand-mark">₽</span>
          <span>Мой бюджет</span>
        </div>
        <p className="muted auth-subtitle">
          {register
            ? "Создайте аккаунт через безопасную авторизацию GitHub"
            : "Войдите, чтобы продолжить"}
        </p>
        <div className="github-login">
          <a className="primary full" href="/api/auth/github">
            Войти через GitHub
          </a>
        </div>
        {error && <div className="error">{error}</div>}
        <p className="auth-switch">
          {register ? "Уже есть аккаунт?" : "Новый пользователь?"}{" "}
          <NavLink to={register ? "/login" : "/register"}>
            {register ? "Войти" : "Зарегистрироваться"}
          </NavLink>
        </p>
      </div>
    </main>
  );
}

function Layout() {
  const dispatch = useDispatch();
  const user = useSelector(currentUser);
  const settings = useSelector((s) => s.settings[s.currentUserId] || {});
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    dispatch(actions.processRecurring(today()));
  }, [dispatch, user?.id]);
  const nav = [
    ["/", "▦", "Обзор"],
    ["/wallets", "▣", "Кошельки"],
    ["/transactions", "↕", "Операции"],
    ["/recurring", "↻", "Регулярные платежи"],
    ["/budgets", "◫", "Бюджеты"],
    ["/analytics", "◒", "Аналитика"],
    ["/goals", "◎", "Цели"],
    ["/settings", "⚙", "Настройки"],
  ];
  return (
    <div
      className={`app-shell ${settings.theme === "dark" ? "dark-theme" : ""}`}
    >
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">₽</span>
          <span>Мой бюджет</span>
        </div>
        <nav>
          {nav.map(([to, icon, text]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMobile(false)}
            >
              <span className="nav-icon">{icon}</span>
              {text}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">{(user?.name || "U")[0]}</div>
            <div>
              <b>{user?.name}</b>
              <small>{user?.email}</small>
            </div>
          </div>
          <button
            className="logout"
            onClick={() => {
              fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
              });
              dispatch(actions.logout());
            }}
          >
            Выйти
          </button>
        </div>
      </aside>
      <div className="content-wrap">
        <header className="topbar">
          <button className="mobile-toggle" onClick={() => setMobile(!mobile)}>
            ☰
          </button>
          <div>
            <span className="page-kicker">Личный финансовый помощник</span>
            <h1>{pageTitle(useLocation().pathname)}</h1>
          </div>
          <div className="top-actions">
            <span className="date-now">
              {new Date().toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
            </span>
            <div className="avatar">{(user?.name || "U")[0]}</div>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
      {mobile && (
        <div className="mobile-overlay" onClick={() => setMobile(false)} />
      )}
    </div>
  );
}
function pageTitle(path) {
  return (
    {
      "/": "Добрый день!",
      "/wallets": "Кошельки",
      "/transactions": "Операции",
      "/recurring": "Регулярные платежи",
      "/budgets": "Бюджеты",
      "/analytics": "Аналитика",
      "/goals": "Финансовые цели",
      "/settings": "Настройки",
    }[path] || "Мой бюджет"
  );
}

function StatCard({ label, value, note, tone = "" }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
function Empty({ text }) {
  return <div className="empty">{text}</div>;
}
function Modal({ title, children, close }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={close}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Dashboard() {
  const s = useSelector((s) => s),
    wallets = userWallets(s),
    tx = userTransactions(s),
    budgets = userBudgets(s),
    goals = userGoals(s),
    settings = s.settings[s.currentUserId] || {};
  const symbol = settings.currency || "RUB";
  const income = tx
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + Number(t.amount), 0);
  const expense = tx
    .filter((t) => t.type === "expense")
    .reduce((a, t) => a + Number(t.amount), 0);
  const balances = wallets.map((w) => ({
    ...w,
    balance:
      w.initialBalance +
      tx
        .filter((t) => t.walletId === w.id)
        .reduce(
          (a, t) =>
            a + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
          0,
        ),
  }));
  const recent = [...tx]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const max = Math.max(...balances.map((w) => Math.abs(w.balance)), 1);
  return (
    <div className="dashboard">
      <div className="stats-grid">
        <StatCard
          label="Общий баланс"
          value={money(
            balances.reduce((a, w) => a + w.balance, 0),
            symbol,
          )}
          note={`${wallets.length} кошелька`}
          tone="accent"
        />
        <StatCard
          label="Доходы"
          value={money(income, symbol)}
          note="За текущий период"
        />
        <StatCard
          label="Расходы"
          value={money(expense, symbol)}
          note="За текущий период"
          tone="danger"
        />
        <StatCard
          label="Накоплено"
          value={money(
            goals.reduce((a, g) => a + Number(g.saved), 0),
            symbol,
          )}
          note={`${goals.length} цели`}
        />
      </div>
      <div className="grid-2 dashboard-main">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Динамика расходов</h2>
              <p className="muted">Последние операции по категориям</p>
            </div>
            <NavLink className="text-link" to="/analytics">
              Подробнее →
            </NavLink>
          </div>
          <MiniChart tx={tx} />
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Мои кошельки</h2>
            <NavLink className="text-link" to="/wallets">
              Все →
            </NavLink>
          </div>
          {balances.length ? (
            balances.map((w) => (
              <div className="wallet-row" key={w.id}>
                <span className="wallet-dot" style={{ background: w.color }} />
                <div className="grow">
                  <b>{w.name}</b>
                  <div className="progress">
                    <i
                      style={{
                        width: `${Math.min(100, (Math.abs(w.balance) / max) * 100)}%`,
                        background: w.color,
                      }}
                    />
                  </div>
                </div>
                <strong>{money(w.balance, w.currency)}</strong>
              </div>
            ))
          ) : (
            <Empty text="Добавьте первый кошелёк" />
          )}
        </section>
      </div>
      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Последние операции</h2>
            <NavLink className="text-link" to="/transactions">
              Все операции →
            </NavLink>
          </div>
          {recent.length ? (
            <div className="tx-list">
              {recent.map((t) => (
                <TransactionRow
                  key={t.id}
                  tx={t}
                  wallets={wallets}
                  currency={symbol}
                />
              ))}
            </div>
          ) : (
            <Empty text="Операций пока нет" />
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Бюджеты</h2>
            <NavLink className="text-link" to="/budgets">
              Управлять →
            </NavLink>
          </div>
          {budgets.length ? (
            budgets
              .slice(0, 3)
              .map((b) => (
                <BudgetLine key={b.id} budget={b} tx={tx} currency={symbol} />
              ))
          ) : (
            <Empty text="Создайте бюджет на месяц" />
          )}
        </section>
      </div>
    </div>
  );
}
function MiniChart({ tx }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString("ru-RU", { weekday: "short" }),
      value: tx
        .filter((t) => t.type === "expense" && t.date === key)
        .reduce((a, t) => a + Number(t.amount), 0),
    };
  });
  const max = Math.max(...days.map((d) => d.value), 1);
  return (
    <div className="bars">
      {days.map((d) => (
        <div className="bar-col" key={d.label}>
          <span>{d.value ? d.value.toLocaleString("ru-RU") : ""}</span>
          <div className="bar-track">
            <i style={{ height: `${Math.max(5, (d.value / max) * 100)}%` }} />
          </div>
          <small>{d.label}</small>
        </div>
      ))}
    </div>
  );
}
function TransactionRow({ tx, wallets, currency = "RUB" }) {
  const w = wallets.find((x) => x.id === tx.walletId);
  return (
    <div className="tx-row">
      <span className={`tx-icon ${tx.type}`}>
        {tx.type === "income" ? "↗" : "↘"}
      </span>
      <div className="grow">
        <b>{tx.category}</b>
        <small>
          {tx.note || w?.name || "Операция"} · {dateLabel(tx.date)}
        </small>
      </div>
      <strong className={tx.type === "income" ? "positive" : "negative"}>
        {tx.type === "income" ? "+" : "−"}
        {money(tx.amount, currency)}
      </strong>
    </div>
  );
}
function BudgetLine({ budget, tx, currency = "RUB" }) {
  const spent = tx
    .filter(
      (t) =>
        t.type === "expense" &&
        t.category === budget.category &&
        t.date.slice(0, 7) === today().slice(0, 7),
    )
    .reduce((a, t) => a + Number(t.amount), 0);
  const p = Math.min(100, (spent / budget.limit) * 100);
  return (
    <div className="budget-line">
      <div>
        <b>{budget.category}</b>
        <span>
          {money(spent, currency)} / {money(budget.limit, currency)}
        </span>
      </div>
      <div className="progress">
        <i className={p > 90 ? "warn" : ""} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function Wallets() {
  const s = useSelector((s) => s),
    wallets = userWallets(s),
    tx = userTransactions(s),
    settings = s.settings[s.currentUserId] || {};
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const open = (w) => {
    setEditing(
      w || {
        id: null,
        userId: s.currentUserId,
        name: "",
        type: "card",
        currency: settings.currency || "RUB",
        initialBalance: 0,
        color: "#0f766e",
      },
    );
    setForm(
      w || {
        id: null,
        userId: s.currentUserId,
        name: "",
        type: "card",
        currency: settings.currency || "RUB",
        initialBalance: 0,
        color: "#0f766e",
      },
    );
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.name || Number(form.initialBalance) < 0) return;
    dispatch(form.id ? actions.updateWallet(form) : actions.addWallet(form));
    setEditing(null);
  };
  return (
    <>
      <div className="page-actions">
        <p className="muted">Управляйте счетами, картами и наличными</p>
        <button className="primary" onClick={() => open()}>
          ＋ Новый кошелёк
        </button>
      </div>
      <div className="wallet-grid">
        {wallets.map((w) => {
          const balance =
            w.initialBalance +
            tx
              .filter((t) => t.walletId === w.id)
              .reduce(
                (a, t) =>
                  a +
                  (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
                0,
              );
          return (
            <div
              className="wallet-card"
              key={w.id}
              style={{ "--wallet": w.color }}
            >
              <div className="wallet-card-head">
                <span className="wallet-type">
                  {w.type === "cash"
                    ? "Наличные"
                    : w.type === "bank"
                      ? "Счёт"
                      : "Карта"}
                </span>
                <button className="icon-btn" onClick={() => open(w)}>
                  •••
                </button>
              </div>
              <h3>{w.name}</h3>
              <strong>{money(balance, w.currency)}</strong>
              <small>
                Начальный баланс: {money(w.initialBalance, w.currency)}
              </small>
              <div className="wallet-card-foot">
                <button onClick={() => open(w)}>Изменить</button>
                <button
                  className="danger-link"
                  onClick={() =>
                    window.confirm("Удалить кошелёк и его операции?") &&
                    dispatch(actions.deleteWallet(w.id))
                  }
                >
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
        {!wallets.length && <Empty text="У вас пока нет кошельков" />}
      </div>
      {editing && (
        <Modal
          title={editing.id ? "Изменить кошелёк" : "Новый кошелёк"}
          close={() => setEditing(null)}
        >
          <form className="stack" onSubmit={save}>
            <label>
              Название
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Например, Основная карта"
              />
            </label>
            <div className="form-grid">
              <label>
                Тип
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="card">Банковская карта</option>
                  <option value="cash">Наличные</option>
                  <option value="bank">Банковский счёт</option>
                </select>
              </label>
              <label>
                Валюта
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                >
                  <option>RUB</option>
                  <option>KGS</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </label>
            </div>
            <label>
              Начальный баланс
              <input
                type="number"
                value={form.initialBalance}
                onChange={(e) =>
                  setForm({ ...form, initialBalance: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Цвет
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </label>
            <button className="primary">Сохранить</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Transactions() {
  const s = useSelector((s) => s),
    tx = userTransactions(s),
    wallets = userWallets(s),
    settings = s.settings[s.currentUserId] || {};
  const dispatch = useDispatch();
  const [filter, setFilter] = useState({
    type: "all",
    wallet: "all",
    search: "",
  });
  const [editing, setEditing] = useState(null);
  const blank = {
    id: null,
    userId: s.currentUserId,
    walletId: wallets[0]?.id || "",
    type: "expense",
    amount: "",
    category: categories[0],
    note: "",
    date: today(),
  };
  const [form, setForm] = useState(blank);
  const open = (t) => {
    setEditing(t || blank);
    setForm(t || blank);
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0 || !form.walletId) return;
    dispatch(
      form.id
        ? actions.updateTransaction({ ...form, amount: Number(form.amount) })
        : actions.addTransaction({ ...form, amount: Number(form.amount) }),
    );
    setEditing(null);
  };
  const shown = tx
    .filter(
      (t) =>
        (filter.type === "all" || t.type === filter.type) &&
        (filter.wallet === "all" || t.walletId === filter.wallet) &&
        `${t.category} ${t.note}`
          .toLowerCase()
          .includes(filter.search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="page-actions">
        <p className="muted">Все доходы и расходы в одном месте</p>
        <button className="primary" onClick={() => open()}>
          ＋ Добавить операцию
        </button>
      </div>
      <div className="panel filters">
        <input
          placeholder="Поиск по операциям..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
        />
        <select
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
        >
          <option value="all">Все операции</option>
          <option value="income">Доходы</option>
          <option value="expense">Расходы</option>
        </select>
        <select
          value={filter.wallet}
          onChange={(e) => setFilter({ ...filter, wallet: e.target.value })}
        >
          <option value="all">Все кошельки</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <section className="panel table-panel">
        {shown.length ? (
          <div className="tx-table">
            <div className="table-head">
              <span>Операция</span>
              <span>Кошелёк</span>
              <span>Дата</span>
              <span>Сумма</span>
              <span />
            </div>
            {shown.map((t) => (
              <div className="table-row" key={t.id}>
                <TransactionRow
                  tx={t}
                  wallets={wallets}
                  currency={settings.currency || "RUB"}
                />
                <span>{wallets.find((w) => w.id === t.walletId)?.name}</span>
                <span>{dateLabel(t.date)}</span>
                <strong
                  className={t.type === "income" ? "positive" : "negative"}
                >
                  {t.type === "income" ? "+" : "−"}
                  {money(t.amount, settings.currency || "RUB")}
                </strong>
                <span className="row-actions">
                  <button onClick={() => open(t)}>Изменить</button>
                  <button
                    className="danger-link"
                    onClick={() => dispatch(actions.deleteTransaction(t.id))}
                  >
                    Удалить
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="По заданным фильтрам операций нет" />
        )}
      </section>
      {editing && (
        <Modal
          title={editing.id ? "Изменить операцию" : "Новая операция"}
          close={() => setEditing(null)}
        >
          <form className="stack" onSubmit={save}>
            <div className="segmented">
              <button
                type="button"
                className={form.type === "expense" ? "active expense" : ""}
                onClick={() => setForm({ ...form, type: "expense" })}
              >
                Расход
              </button>
              <button
                type="button"
                className={form.type === "income" ? "active income" : ""}
                onClick={() => setForm({ ...form, type: "income" })}
              >
                Доход
              </button>
            </div>
            <div className="form-grid">
              <label>
                Сумма
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </label>
              <label>
                Дата
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              Категория
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Кошелёк
              <select
                value={form.walletId}
                onChange={(e) => setForm({ ...form, walletId: e.target.value })}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Комментарий
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Необязательно"
              />
            </label>
            <button className="primary">Сохранить</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Recurring() {
  const s = useSelector((s) => s),
    rows = userRecurring(s),
    wallets = userWallets(s);
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(null);
  const blank = {
    id: null,
    userId: s.currentUserId,
    name: "",
    amount: "",
    category: categories[0],
    walletId: wallets[0]?.id || "",
    nextDate: today(),
    frequency: "monthly",
    active: true,
  };
  const [form, setForm] = useState(blank);
  const open = (r) => {
    setEditing(r || blank);
    setForm(r || blank);
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.name || Number(form.amount) <= 0 || !form.walletId) return;
    dispatch(
      form.id
        ? actions.updateRecurring({ ...form, amount: Number(form.amount) })
        : actions.addRecurring({ ...form, amount: Number(form.amount) }),
    );
    setEditing(null);
  };
  return (
    <>
      <div className="page-actions">
        <p className="muted">
          Платежи автоматически добавляются в операции в день списания
        </p>
        <button className="primary" onClick={() => open()}>
          ＋ Добавить платёж
        </button>
      </div>
      <div className="cards-list">
        {rows.map((r) => (
          <div
            className={`recurring-card ${!r.active ? "inactive" : ""}`}
            key={r.id}
          >
            <span className="round-icon">↻</span>
            <div className="grow">
              <h3>{r.name}</h3>
              <p className="muted">
                {r.category} ·{" "}
                {wallets.find((w) => w.id === r.walletId)?.name || "Кошелёк"} ·{" "}
                {r.frequency === "yearly" ? "ежегодно" : "ежемесячно"}
              </p>
            </div>
            <div className="recurring-date">
              <small>Следующая дата</small>
              <b>{dateLabel(r.nextDate)}</b>
            </div>
            <strong>{money(r.amount)}</strong>
            <button className="icon-btn" onClick={() => open(r)}>
              •••
            </button>
          </div>
        ))}
        {!rows.length && <Empty text="Регулярных платежей пока нет" />}
      </div>
      {editing && (
        <Modal
          title={editing.id ? "Изменить платёж" : "Новый регулярный платёж"}
          close={() => setEditing(null)}
        >
          <form className="stack" onSubmit={save}>
            <label>
              Название
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Например, Подписка"
              />
            </label>
            <div className="form-grid">
              <label>
                Сумма
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </label>
              <label>
                Следующая дата
                <input
                  type="date"
                  value={form.nextDate}
                  onChange={(e) =>
                    setForm({ ...form, nextDate: e.target.value })
                  }
                  required
                />
              </label>
            </div>
            <label>
              Категория
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Кошелёк
              <select
                value={form.walletId}
                onChange={(e) => setForm({ ...form, walletId: e.target.value })}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Период
              <select
                value={form.frequency}
                onChange={(e) =>
                  setForm({ ...form, frequency: e.target.value })
                }
              >
                <option value="monthly">Ежемесячно</option>
                <option value="yearly">Ежегодно</option>
              </select>
            </label>
            <button className="primary">Сохранить</button>
            {editing.id && (
              <div className="action-group">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    dispatch(
                      actions.updateRecurring({
                        ...form,
                        active: !form.active,
                      }),
                    );
                    setEditing(null);
                  }}
                >
                  {form.active ? "Отключить повторение" : "Включить повторение"}
                </button>
                <button
                  type="button"
                  className="danger-link"
                  onClick={() => {
                    dispatch(actions.deleteRecurring(form.id));
                    setEditing(null);
                  }}
                >
                  Удалить
                </button>
              </div>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}

function Budgets() {
  const s = useSelector((s) => s),
    rows = userBudgets(s),
    tx = userTransactions(s),
    settings = s.settings[s.currentUserId] || {};
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(null);
  const blank = {
    id: null,
    userId: s.currentUserId,
    category: categories[0],
    limit: "",
    period: "month",
  };
  const [form, setForm] = useState(blank);
  const open = (b) => {
    setEditing(b || blank);
    setForm(b || blank);
  };
  const save = (e) => {
    e.preventDefault();
    if (Number(form.limit) <= 0) return;
    dispatch(
      form.id
        ? actions.updateBudget({ ...form, limit: Number(form.limit) })
        : actions.addBudget({ ...form, limit: Number(form.limit) }),
    );
    setEditing(null);
  };
  return (
    <>
      <div className="page-actions">
        <p className="muted">Контролируйте траты и не выходите за рамки</p>
        <button className="primary" onClick={() => open()}>
          ＋ Новый бюджет
        </button>
      </div>
      <div className="budget-grid">
        {rows.map((b) => {
          const spent = tx
            .filter(
              (t) =>
                t.type === "expense" &&
                t.category === b.category &&
                t.date.slice(0, 7) === today().slice(0, 7),
            )
            .reduce((a, t) => a + Number(t.amount), 0);
          const p = (spent / b.limit) * 100;
          return (
            <div className="panel budget-card" key={b.id}>
              <div className="panel-head">
                <div>
                  <h3>{b.category}</h3>
                  <span className="muted">На месяц</span>
                </div>
                <button className="icon-btn" onClick={() => open(b)}>
                  •••
                </button>
              </div>
              <strong className={p > 90 ? "negative" : ""}>
                {money(spent, settings.currency)}{" "}
                <small className="muted">
                  из {money(b.limit, settings.currency)}
                </small>
              </strong>
              <div className="progress large">
                <i
                  className={p > 90 ? "warn" : ""}
                  style={{ width: `${Math.min(p, 100)}%` }}
                />
              </div>
              <div className="budget-foot">
                <span>{Math.round(p)}% использовано</span>
                {p > 90 && <b className="warning">Лимит почти исчерпан</b>}
                <button
                  className="danger-link"
                  onClick={() => dispatch(actions.deleteBudget(b.id))}
                >
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
        {!rows.length && <Empty text="Добавьте бюджет для контроля расходов" />}
      </div>
      {editing && (
        <Modal
          title={editing.id ? "Изменить бюджет" : "Новый бюджет"}
          close={() => setEditing(null)}
        >
          <form className="stack" onSubmit={save}>
            <label>
              Категория
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Лимит на месяц
              <input
                type="number"
                min="1"
                value={form.limit}
                onChange={(e) => setForm({ ...form, limit: e.target.value })}
                required
              />
            </label>
            <button className="primary">Сохранить</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Analytics() {
  const s = useSelector((s) => s),
    tx = userTransactions(s),
    settings = s.settings[s.currentUserId] || {};
  const expenses = tx.filter((t) => t.type === "expense");
  const incomes = tx.filter((t) => t.type === "income");
  const byCat = categories
    .map((c) => ({
      name: c,
      value: expenses
        .filter((t) => t.category === c)
        .reduce((a, t) => a + Number(t.amount), 0),
    }))
    .filter((x) => x.value)
    .sort((a, b) => b.value - a.value);
  const total = byCat.reduce((a, x) => a + x.value, 0);
  const max = Math.max(...byCat.map((x) => x.value), 1);
  const exportCsv = () => {
    const csv = [
      "Дата,Тип,Категория,Сумма,Комментарий",
      ...tx.map(
        (t) =>
          `${t.date},${t.type === "income" ? "Доход" : "Расход"},${t.category},${t.amount},${(t.note || "").replace(/,/g, " ")}`,
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv" }),
    );
    a.download = "операции.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <div className="page-actions">
        <p className="muted">
          Понимайте привычки и принимайте решения на основе данных
        </p>
        <div className="action-group">
          <button className="secondary" onClick={exportCsv}>
            ↓ CSV
          </button>
          <button className="secondary" onClick={() => window.print()}>
            ⎙ Печать / PDF
          </button>
        </div>
      </div>
      <div className="stats-grid compact">
        <StatCard
          label="Доходы"
          value={money(
            incomes.reduce((a, t) => a + Number(t.amount), 0),
            settings.currency,
          )}
        />
        <StatCard
          label="Расходы"
          value={money(total, settings.currency)}
          tone="danger"
        />
        <StatCard
          label="Баланс периода"
          value={money(
            incomes.reduce((a, t) => a + Number(t.amount), 0) - total,
            settings.currency,
          )}
          tone="accent"
        />
      </div>
      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Расходы по категориям</h2>
            <span className="muted">
              Всего {money(total, settings.currency)}
            </span>
          </div>
          {byCat.length ? (
            <div className="category-bars">
              {byCat.map((x) => (
                <div className="category-bar" key={x.name}>
                  <div>
                    <b>{x.name}</b>
                    <span>{money(x.value, settings.currency)}</span>
                  </div>
                  <div className="progress">
                    <i style={{ width: `${(x.value / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="Недостаточно данных для аналитики" />
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Структура расходов</h2>
          </div>
          {byCat.length ? (
            <div className="donut-wrap">
              <div
                className="donut"
                style={{
                  background: `conic-gradient(${byCat.map((x, i) => `${["#0f766e", "#2563eb", "#f59e0b", "#e11d48", "#7c3aed", "#0891b2"][i % 6]} ${byCat.slice(0, i).reduce((a, y) => a + (y.value / total) * 100, 0)}% ${byCat.slice(0, i + 1).reduce((a, y) => a + (y.value / total) * 100, 0)}%`).join(", ")})`,
                }}
              >
                <div>
                  {Math.round(total / Math.max(tx.length, 1))}
                  <small>средний чек</small>
                </div>
              </div>
              <div className="legend">
                {byCat.slice(0, 6).map((x, i) => (
                  <span key={x.name}>
                    <i
                      style={{
                        background: [
                          "#0f766e",
                          "#2563eb",
                          "#f59e0b",
                          "#e11d48",
                          "#7c3aed",
                          "#0891b2",
                        ][i],
                      }}
                    />
                    {x.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <Empty text="Добавьте операции" />
          )}
        </section>
      </div>
    </>
  );
}

function Goals() {
  const s = useSelector((s) => s),
    rows = userGoals(s),
    settings = s.settings[s.currentUserId] || {};
  const dispatch = useDispatch();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    id: null,
    userId: s.currentUserId,
    name: "",
    target: "",
    deadline: "",
    color: "#f59e0b",
  });
  const [contribute, setContribute] = useState(null);
  const open = (g) => {
    setEditing(g || form);
    setForm(
      g || {
        id: null,
        userId: s.currentUserId,
        name: "",
        target: "",
        deadline: "",
        color: "#f59e0b",
      },
    );
  };
  const save = (e) => {
    e.preventDefault();
    if (!form.name || !form.target) return;
    dispatch(
      form.id
        ? actions.updateGoal({ ...form, target: Number(form.target) })
        : actions.addGoal({ ...form, target: Number(form.target) }),
    );
    setEditing(null);
  };
  return (
    <>
      <div className="page-actions">
        <p className="muted">Откладывайте на важные планы шаг за шагом</p>
        <button className="primary" onClick={() => open()}>
          ＋ Новая цель
        </button>
      </div>
      <div className="goal-grid">
        {rows.map((g) => {
          const p = Math.min(100, (g.saved / g.target) * 100);
          return (
            <div
              className="panel goal-card"
              key={g.id}
              style={{ "--goal": g.color }}
            >
              <div className="goal-head">
                <span className="goal-circle">◎</span>
                <button className="icon-btn" onClick={() => open(g)}>
                  •••
                </button>
              </div>
              <h3>{g.name}</h3>
              <p className="muted">Цель до {dateLabel(g.deadline)}</p>
              <strong>
                {money(g.saved, settings.currency)}{" "}
                <small>из {money(g.target, settings.currency)}</small>
              </strong>
              <div className="progress large">
                <i style={{ width: `${p}%` }} />             </div>
              <div className="goal-foot">
                <span>{Math.round(p)}%</span>
                <button
                  className="primary small"
                  onClick={() => setContribute(g)}
                >
                  ＋ Пополнить
                </button>
                <button
                  className="danger-link"
                  onClick={() => dispatch(actions.deleteGoal(g.id))}
                >
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
        {!rows.length && <Empty text="Сформулируйте первую финансовую цель" />}
      </div>
      {editing && (
        <Modal
          title={editing.id ? "Изменить цель" : "Новая цель"}
          close={() => setEditing(null)}
        >
          <form className="stack" onSubmit={save}>
            <label>
              Название
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Например, Резервный фонд"
              />
            </label>
            <div className="form-grid">
              <label>
                Сумма цели
                <input
                  type="number"
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  required
                />
              </label>
              <label>
                Дедлайн
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Цвет
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </label>
            <button className="primary">Сохранить</button>
          </form>
        </Modal>
      )}
      {contribute && (
        <Modal
          title={`Пополнить «${contribute.name}»`}
          close={() => setContribute(null)}
        >
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const amount = Number(
                new FormData(e.currentTarget).get("amount"),
              );
              if (amount > 0)
                dispatch(actions.contributeGoal({ id: contribute.id, amount }));
              setContribute(null);
            }}
          >
            <label>
              Сумма пополнения
              <input name="amount" type="number" min="1" required autoFocus />
            </label>
            <button className="primary">Пополнить</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Settings() {
  const s = useSelector((s) => s),
    user = useSelector(currentUser),
    settings = s.settings[s.currentUserId] || {};
  const dispatch = useDispatch();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...settings });
  const save = (e) => {
    e.preventDefault();
    dispatch(actions.updateSettings(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  return (
    <div className="settings-grid">
      <section className="panel">
        <h2>Профиль</h2>
        <p className="muted">Ваши данные для входа в приложение</p>
        <div className="profile-big">
          <div className="avatar xl">{(user?.name || "U")[0]}</div>
          <div>
            <h3>{user?.name}</h3>
            <p className="muted">{user?.email}</p>
          </div>
        </div>
        <label>
          Имя
          <input value={user?.name || ""} readOnly />
        </label>
        <label>
          Email
          <input value={user?.email || ""} readOnly />
        </label>
      </section>
      <section className="panel">
        <h2>Предпочтения</h2>
        <p className="muted">Настройте отображение приложения</p>
        <form className="stack" onSubmit={save}>
          <label>
            Основная валюта
            <select
              value={form.currency || "RUB"}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="RUB">Российский рубль (₽)</option>
              <option value="KGS">Кыргызский сом (сом)</option>
              <option value="USD">Доллар США ($)</option>
              <option value="EUR">Евро (€)</option>
            </select>
          </label>
          <label>
            Тема
            <select
              value={form.theme || "light"}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
            >
              <option value="light">Светлая</option>
              <option value="dark">Тёмная</option>
            </select>
          </label>
          <button className="primary">
            {saved ? "✓ Сохранено" : "Сохранить настройки"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth register />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
