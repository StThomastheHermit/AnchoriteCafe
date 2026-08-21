import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { apiGet, apiPost } from "./api/backend";
import { getPushDeviceHint, getPushSupportStatus, isAppleTouchDevice, isStandaloneApp, sendReadyNotification, subscribeToReadyNotification } from "./api/pushNotifications";

const DONATION_ZELLE = "Donate@stthomascoc.org";
const ZELLE_PAYMENT_URL = "";
const INVENTORY_CACHE_KEY = "arise-inventory-cache";
const INVENTORY_CACHE_MS = 5 * 60 * 1000;
const TEXT_SIZE_KEY = "arise-text-size";
const LAST_ORDER_KEY = "arise-last-order";
const LAST_ORDER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const MENU_CATEGORIES = [
  { id: "coffee", label: "Coffees" },
  { id: "refresher", label: "Refreshers" },
  { id: "smoothie", label: "Smoothies" },
  { id: "drink", label: "Soda / Water / Juice" },
];

const MENU_PRICES = {
  coffee: 5,
  refresher: 5,
  smoothie: 5,
  drink: 3,
};

const DRINKS = [
  { id: "americano", label: "Americano", desc: "No milk, water only", category: "coffee", temps: ["Hot", "Cold"], milk: false, syrups: true },
  { id: "latte", label: "Latte", desc: "Standard milk and coffee drink", category: "coffee", temps: ["Hot", "Cold"], milk: true, syrups: true },
  { id: "cappuccino", label: "Cappuccino", desc: "More milk foam", category: "coffee", temps: ["Hot", "Cold"], milk: true, syrups: true },
  { id: "cortado", label: "Cortado", desc: "More coffee forward, less milk", category: "coffee", temps: ["Hot"], milk: true, syrups: true },
  { id: "espresso", label: "Double Shot Espresso", desc: "Pure espresso; no milk, water, or syrup", category: "coffee", temps: ["Hot"], milk: false, syrups: false },
  { id: "strawberry-refresher", label: "Strawberry Refresher", desc: "Iced fruit refresher", category: "refresher", temps: ["Cold"], milk: false, syrups: false, toppings: true, showTemp: false },
  { id: "mango-refresher", label: "Mango Refresher", desc: "Iced fruit refresher", category: "refresher", temps: ["Cold"], milk: false, syrups: false, toppings: true, showTemp: false },
  { id: "strawberry-banana-smoothie", label: "Strawberry Banana Smoothie", desc: "Blended smoothie", category: "smoothie", temps: ["Cold"], milk: false, syrups: false, showTemp: false },
  { id: "mango-smoothie", label: "Mango Smoothie", desc: "Blended smoothie", category: "smoothie", temps: ["Cold"], milk: false, syrups: false, showTemp: false },
  { id: "water", label: "Water", desc: "Bottled water", category: "drink", temps: ["Cold"], milk: false, syrups: false, showTemp: false },
  { id: "soda", label: "Soda", desc: "Canned soda", category: "drink", temps: ["Cold"], milk: false, syrups: false, showTemp: false },
  { id: "juice", label: "Juice", desc: "Bottled juice", category: "drink", temps: ["Cold"], milk: false, syrups: false, showTemp: false },
];

const MILKS = ["Whole milk", "Almond milk", "Oat milk", "Soy milk"];
const SYRUPS = ["Caramel", "Sugar Free Caramel", "Vanilla", "Sugar Free Vanilla", "Mocha", "White Chocolate", "Honey", "Cinnamon Powder", "Hazelnut"];
const REFRESHER_TOPPINGS = ["Strawberry Popping Boba", "Mango Popping Boba", "Peach Popping Boba", "Fresh Strawberry", "Lemon Slice"];
const MAX_SYRUPS = 2;
const MAX_REFRESHER_TOPPINGS = 3;

function makeDrinkId(label) {
  const base = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `drink-${Date.now()}`;
}

function normalizeDrinkItem(drink, index = 0) {
  const temps = Array.isArray(drink?.temps) && drink.temps.length
    ? drink.temps.filter(t => t === "Hot" || t === "Cold")
    : ["Hot"];

  return {
    id: String(drink?.id || makeDrinkId(drink?.label || `Drink ${index + 1}`)),
    label: String(drink?.label || "Drink").trim() || "Drink",
    desc: String(drink?.desc || "").trim(),
    category: normalizeDrinkCategory(drink),
    temps: temps.length ? [...new Set(temps)] : ["Hot"],
    milk: Boolean(drink?.milk),
    syrups: Boolean(drink?.syrups),
    toppings: Boolean(drink?.toppings) || normalizeDrinkCategory(drink) === "refresher",
    showTemp: drink?.showTemp === false ? false : true,
    active: drink?.active !== false,
    sortOrder: Number.isFinite(Number(drink?.sortOrder)) ? Number(drink.sortOrder) : index,
  };
}

function normalizeDrinkCategory(drink) {
  const raw = String(drink?.category || "").toLowerCase();
  if (MENU_CATEGORIES.some(category => category.id === raw)) return raw;
  const text = `${drink?.id || ""} ${drink?.label || ""}`.toLowerCase();
  if (text.includes("refresh")) return "refresher";
  if (text.includes("smoothie")) return "smoothie";
  if (text.includes("soda") || text.includes("water") || text.includes("juice")) return "drink";
  return "coffee";
}

function priceForCategory(category) {
  return MENU_PRICES[category] || 5;
}

function formatPrice(amount) {
  return `$${Number(amount || 0).toFixed(2).replace(/\.00$/, "")}`;
}

function normalizeMenuDrinks(drinks, includeInactive = false) {
  const source = Array.isArray(drinks) && drinks.length ? drinks : DRINKS;
  return source
    .map(normalizeDrinkItem)
    .filter(drink => includeInactive || drink.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

function makeIngredientId(item) {
  return String(item || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `item-${Date.now()}`;
}

function normalizeIngredientItem(item, type, index = 0) {
  const hasEditableName = typeof item === "object" && item !== null && Object.prototype.hasOwnProperty.call(item, "item");
  const name = typeof item === "string" ? item : item?.item;
  return {
    id: String(item?.id || makeIngredientId(name || `${type}-${index + 1}`)),
    item: hasEditableName ? String(name || "") : (String(name || "").trim() || `${type === "milk" ? "Milk" : "Syrup"} ${index + 1}`),
    type,
    available: item?.available !== false,
    active: item?.active !== false,
    sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
  };
}

function normalizeIngredientList(items, type, fallback, includeInactive = false) {
  const source = Array.isArray(items) && items.length ? items : fallback;
  return source
    .map((item, index) => normalizeIngredientItem(item, type, index))
    .filter(item => includeInactive || item.active !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.item.localeCompare(b.item));
}

function reorderItemsById(items, fromId, toId) {
  const fromIndex = items.findIndex(item => item.id === fromId);
  const toIndex = items.findIndex(item => item.id === toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((item, sortOrder) => ({ ...item, sortOrder }));
}

function getDrink(id, drinks = DRINKS) {
  const normalized = normalizeMenuDrinks(drinks);
  return normalized.find(d => d.id === id) || normalized[0] || normalizeDrinkItem(DRINKS[1], 1);
}

function defaultForm() {
  return { name: "", drinkId: "latte", temp: "Hot", milk: "", syrups: [], toppings: [], notes: "" };
}

function defaultInventory() {
  return {
    syrups: SYRUPS.map(item => ({ item, type: "syrup", available: true })),
    milks: MILKS.map(item => ({ item, type: "milk", available: true }))
  };
}

function loadCachedInventory() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(INVENTORY_CACHE_KEY) || "null");
    if (cached?.inventory && Date.now() - cached.savedAt < INVENTORY_CACHE_MS) return cached.inventory;
  } catch {}
  return defaultInventory();
}

function cacheInventory(inventory) {
  try {
    sessionStorage.setItem(INVENTORY_CACHE_KEY, JSON.stringify({ inventory, savedAt: Date.now() }));
  } catch {}
  return inventory;
}

function inventoryItemsByType(inventory, type, fallback) {
  const key = type + "s";
  const list = inventory?.[key];
  return normalizeIngredientList(list, type, fallback);
}

function buildInventoryLookup(inventory) {
  const lookup = {};
  [...inventoryItemsByType(inventory, "syrup", SYRUPS), ...inventoryItemsByType(inventory, "milk", MILKS)].forEach(x => {
    lookup[x.item] = x.available !== false;
  });
  return lookup;
}

function isInventoryAvailable(inventoryLookup, item) {
  return inventoryLookup[item] === true;
}

function isPageVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function statusLabel(status) {
  if (status === "making") return "Being made";
  if (status === "ready") return "Ready for pickup";
  if (status === "complete") return "Ready for pickup";
  return "Waiting";
}

function waitText(position) {
  const ahead = Math.max(0, position - 1);

  if (ahead === 0) return "You're up next";

  const minutes = ahead * 4;

  return `Estimated wait: ~${minutes} min`;
}

function ordersAheadText(position) {
  const ahead = Math.max(0, position - 1);
  if (ahead === 0) return "No orders ahead of you.";
  return `${ahead} order${ahead === 1 ? "" : "s"} ahead of you.`;
}

function orderAgeText(time) {
  const startedAt = Date.parse(time);
  if (!Number.isFinite(startedAt)) return "";

  const minutes = Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hr ago`;
  return `${hours} hr ${remainingMinutes} min ago`;
}

function statusEmoji(status) {
  if (status === "making") return "🟠";
  if (status === "ready") return "🟢";
  if (status === "complete") return "🟢";
  return "🟡";
}

function normalizeOrderFromSingle(order) {
  if (!order) return null;
  const ordersAhead = Number(order.ordersAhead ?? order.ahead ?? NaN);
  const position = Number(order.position || order.queuePosition || 0) || (Number.isFinite(ordersAhead) ? ordersAhead + 1 : undefined);
  return {
    ...order,
    syrups: Array.isArray(order.syrups) ? order.syrups.join(", ") : order.syrups,
    position,
    ordersAhead
  };
}

function hasFirstAndLastName(name) {
  return name.trim().split(/\s+/).filter(Boolean).length >= 2;
}

function loadLastOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_ORDER_KEY) || "null");
    if (!saved) return null;
    if (saved.expiresAt && Date.now() > saved.expiresAt) {
      localStorage.removeItem(LAST_ORDER_KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function savedOrderSummary(order) {
  if (!order?.drinkLabel) return "";
  const parts = [order.temp, order.drinkLabel, order.milk].filter(Boolean);
  if (Array.isArray(order.syrups) && order.syrups.length) parts.push(order.syrups.join(", "));
  return parts.join(" · ");
}

function formatUpdatedAt(value) {
  if (!value) return "Not updated yet";
  return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatShiftTime(value) {
  if (!value) return "Still clocked in";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatHours(value) {
  const hours = Number(value || 0);
  return `${hours.toFixed(2)} hr`;
}

function TextSizeControl({ largeText, onChange }) {
  return (
    <button
      className={largeText ? "textSizeToggle active" : "textSizeToggle"}
      aria-pressed={largeText}
      title="Toggle larger text"
      onClick={() => onChange(!largeText)}
    >
      <span>Aa</span>
      {largeText ? "Large text" : "Text size"}
    </button>
  );
}

function ringReadyAlert() {
  try {
    if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
  } catch {}

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(740, ctx.currentTime);
    osc.frequency.setValueAtTime(980, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function Header({ isOpen, statusText }) {
  const path = window.location.pathname.toLowerCase();
  const isAdminPage = path.startsWith("/admin");
  return (
    <header>
      <a className="brand" href="/">
        <span><img src="/icons/anchorite-icon-192.png" alt="" /></span>
        <div><h1>Anchorite Cafe</h1><p>Faith fueled soul rooted</p></div>
      </a>
      {!isAdminPage && <a className="adminLink" href="/admin">Admin Access</a>}
      <div className={isOpen ? "pill open" : "pill closed"}>{statusText || (isOpen ? "● Open" : "● Closed")}</div>
    </header>
  );
}

function PinGate({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function tryPin(value) {
    if (value.length < 4 || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiPost({ action: "login", pin: value });
      if (result.ok) onSuccess(value, result);
      else {
        setError("Wrong PIN");
        setPin("");
      }
    } catch {
      setError("Connection error");
      setPin("");
    }
    setBusy(false);
  }

  function addPinDigit(digit) {
    if (busy) return;
    setError("");
    setPin(current => {
      if (current.length >= 4) return current;
      const next = current + digit;
      tryPin(next);
      return next;
    });
  }

  function removePinDigit() {
    if (busy) return;
    setPin(current => current.slice(0, -1));
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        addPinDigit(event.key);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        removePinDigit();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        tryPin(pin);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, busy]);

  return (
    <main className="pinPage">
      <div className="modal pinModal static">
        <h2>Admin Access</h2>
        <p>Enter the owner PIN or your employee PIN.</p>
        <div className="pinDots">{[0,1,2,3].map(i => <span key={i} className={pin.length > i ? "filled" : ""} />)}</div>
        {error && <div className="errorText">{error}</div>}
        {busy && <div className="checkingLine"><span className="miniSpinner"></span>Checking PIN…</div>}
        <div className="numpad">
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
            <button key={i} disabled={busy || k === ""} className={k === "" ? "hiddenKey" : ""} onClick={() => {
              if (k === "⌫") {
                removePinDigit();
                return;
              }
              addPinDigit(String(k));
            }}>{k}</button>
          ))}
        </div>
      </div>
    </main>
  );
}

function AdminPage() {
  const [pin, setPin] = useState("");
  const [auth, setAuth] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [orders, setOrders] = useState([]);
  const [archive, setArchive] = useState([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoaded, setArchiveLoaded] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [analyticsWeekOffset, setAnalyticsWeekOffset] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [timeClock, setTimeClock] = useState({ employees: [], entries: [], totals: [] });
  const [timeClockLoaded, setTimeClockLoaded] = useState(false);
  const [timeClockBusy, setTimeClockBusy] = useState(false);
  const [employeeDraft, setEmployeeDraft] = useState({ name: "", pin: "" });
  const [adminView, setAdminView] = useState("dashboard");
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [menuDrinks, setMenuDrinks] = useState(() => normalizeMenuDrinks(DRINKS, true));
  const [menuMilks, setMenuMilks] = useState(() => normalizeIngredientList(null, "milk", MILKS, true));
  const [menuSyrups, setMenuSyrups] = useState(() => normalizeIngredientList(null, "syrup", SYRUPS, true));
  const [inventory, setInventory] = useState(loadCachedInventory);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [analyticsBusy, setAnalyticsBusy] = useState(false);
  const [menuBusy, setMenuBusy] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionOk, setConnectionOk] = useState(true);
  const [readyArchiveCount, setReadyArchiveCount] = useState(0);
  const [collapsedPanels, setCollapsedPanels] = useState({ inventory: false, orders: false });
  const ordersLoadingRef = useRef(false);
  const statusLoadingRef = useRef(false);
  const inventoryLoadingRef = useRef(false);
  const messageEditingRef = useRef(false);
  const adminSyrups = useMemo(() => inventoryItemsByType(inventory, "syrup", SYRUPS), [inventory]);
  const adminMilks = useMemo(() => inventoryItemsByType(inventory, "milk", MILKS), [inventory]);
  const isOwner = auth?.role === "owner";
  const isEmployee = auth?.role === "employee";
  const canWorkQueue = isOwner || isEmployee;
  const clockedInEmployees = useMemo(() => (timeClock.totals || []).filter(total => total.clockedIn), [timeClock]);
  const openShiftEntries = useMemo(() => (timeClock.entries || []).filter(entry => !entry.clockOut), [timeClock]);

  function syncAdminMessage(nextMessage) {
    if (!messageEditingRef.current && typeof nextMessage === "string") {
      setMessage(nextMessage || "");
    }
  }

  async function refreshOrders() {
    if (ordersLoadingRef.current) return;
    ordersLoadingRef.current = true;
    try {
      const data = await apiGet("orders");
      if (data.ok) {
        setOrders(data.orders || []);
        if (typeof data.isOpen === "boolean") setIsOpen(Boolean(data.isOpen));
        syncAdminMessage(data.message);
        setLastUpdated(new Date());
        setConnectionOk(true);
      } else {
        setConnectionOk(false);
      }
    } catch {
      setConnectionOk(false);
    } finally {
      ordersLoadingRef.current = false;
    }
  }

  async function refreshStatus() {
    if (statusLoadingRef.current) return;
    statusLoadingRef.current = true;
    try {
      const data = await apiGet("status");
      if (data.ok) {
        if (typeof data.isOpen === "boolean") setIsOpen(Boolean(data.isOpen));
        syncAdminMessage(data.message);
        setLastUpdated(new Date());
        setConnectionOk(true);
      } else {
        setConnectionOk(false);
      }
    } catch {
      setConnectionOk(false);
    } finally {
      statusLoadingRef.current = false;
    }
  }

  async function refreshInventory() {
    if (inventoryLoadingRef.current) return;
    inventoryLoadingRef.current = true;
    try {
      const data = await apiGet("inventory");
      if (data.ok && data.inventory) setInventory(cacheInventory(data.inventory));
    } catch {
    } finally {
      inventoryLoadingRef.current = false;
    }
  }

  async function refreshAdminData() {
    await Promise.all([
      refreshOrders(),
      refreshStatus(),
      canWorkQueue ? refreshInventory() : Promise.resolve(),
      isOwner ? loadTimeClock() : Promise.resolve(),
    ]);
  }

  useEffect(() => {
    if (!pin) return;
    refreshAdminData();
    const ordersId = setInterval(() => {
      if (isPageVisible()) refreshOrders();
    }, 3000);
    const statusId = setInterval(() => {
      if (isPageVisible()) refreshStatus();
    }, 6000);
    const inventoryId = setInterval(() => {
      if (isPageVisible()) refreshInventory();
    }, 60000);

    function refreshWhenVisible() {
      if (isPageVisible()) refreshAdminData();
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      clearInterval(ordersId);
      clearInterval(statusId);
      clearInterval(inventoryId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [pin]);

  async function saveAdmin(payload) {
    if (!canWorkQueue) {
      alert("PIN required.");
      return;
    }
    if (isOwner && payload.isOpen === false && isOpen && clockedInEmployees.length > 0) {
      const names = clockedInEmployees.map(employee => employee.name).join(", ");
      const ok = confirm(`Employees still clocked in: ${names}. Close the queue anyway?`);
      if (!ok) {
        setAdminView("timeclock");
        if (!timeClockLoaded) await loadTimeClock();
        return;
      }
    }
    setBusy(true);
    setNotice("");
    try {
      const data = await apiPost({ action: "admin", pin, ...payload });
      if (data.ok) {
        setNotice("Saved");
        messageEditingRef.current = false;
        if (typeof data.isOpen === "boolean") setIsOpen(Boolean(data.isOpen));
        if (typeof data.message === "string") setMessage(data.message || "");
        if (Array.isArray(data.orders)) setOrders(data.orders);
        setLastUpdated(new Date());
        setConnectionOk(true);
      } else setNotice(data.error || "Could not save");
    } catch { setNotice("Connection error"); setConnectionOk(false); }
    setBusy(false);
  }

  async function updateStatus(orderId, status) {
    setBusy(true);
    const previousOrder = orders.find(order => order.id === orderId);
    try {
      const data = await apiPost({ action: "updateStatus", pin, id: orderId, status });
      if (data.ok) {
        if (status === "complete") {
          setOrders(current => current.filter(o => o.id !== orderId));
          setReadyArchiveCount(count => count + 1);
          if (!["ready", "complete"].includes(previousOrder?.status)) {
            sendReadyNotification(orderId, pin).catch(() => {});
          }
        } else if (data.order) {
          setOrders(current => {
            const exists = current.some(o => o.id === data.order.id);
            return exists ? current.map(o => o.id === data.order.id ? data.order : o) : [...current, data.order];
          });
        } else {
          setOrders(data.orders || []);
        }
        setLastUpdated(new Date());
        setConnectionOk(true);
      }
      else alert(data.error || "Could not update order");
    } catch { alert("Connection error"); setConnectionOk(false); }
    setBusy(false);
  }

  async function toggleInventory(item, available) {
    setBusy(true);
    try {
      const data = await apiPost({ action: "setInventory", pin, item, available });
      if (data.ok) {
        setInventory(data.inventory ? cacheInventory(data.inventory) : inventory);
      } else {
        alert(data.error || "Could not update inventory");
      }
    } catch {
      alert("Connection error");
    }
    setBusy(false);
  }

  async function clearCompleted() {
    if (!confirm("Archive ready orders? They will move to Archive.")) return;
    const data = await apiPost({ action: "clearCompleted", pin });
    if (data.ok) {
      setOrders(data.orders || []);
      setReadyArchiveCount(0);
      setLastUpdated(new Date());
      setConnectionOk(true);
    }
    else alert(data.error || "Could not archive ready orders");
  }

  async function clearAll() {
    if (isOpen) {
      alert("Close the queue first, then clear all.");
      return;
    }
    if (!confirm("Clear ALL active orders? They will move to Archive.")) return;
    const data = await apiPost({ action: "clearAll", pin });
    if (data.ok) setOrders(data.orders || []);
    else alert(data.error || "Could not clear all");
  }

  async function loadArchive() {
    setArchiveBusy(true);
    try {
      const data = await apiPost({ action: "archive", pin });
      if (data.ok) {
        setArchive(data.archive || []);
        setArchiveLoaded(true);
      } else {
        alert(data.error || "Could not load archive");
      }
    } catch {
      alert("Connection error");
    } finally {
      setArchiveBusy(false);
    }
  }

  async function toggleArchive() {
    setArchiveOpen(true);
    setAdminView("archive");
    if (!archiveLoaded) await loadArchive();
  }

  async function clearArchive() {
    if (!confirm("Clear archive? This permanently deletes archived orders.")) return;
    setArchiveBusy(true);
    try {
      const data = await apiPost({ action: "clearArchive", pin });
      if (data.ok) {
        setArchive([]);
        setArchiveLoaded(true);
      } else {
        alert(data.error || "Could not clear archive");
      }
    } catch {
      alert("Connection error");
    } finally {
      setArchiveBusy(false);
    }
  }

  async function loadAnalytics(weekOffset = analyticsWeekOffset) {
    setAnalyticsBusy(true);
    try {
      const data = await apiPost({ action: "analytics", pin, weekOffset });
      if (data.ok) {
        setAnalytics(data.analytics || null);
        setAnalyticsWeekOffset(weekOffset);
        setAnalyticsLoaded(true);
      } else {
        alert(data.error || "Could not load analytics");
      }
    } catch {
      alert("Connection error");
    } finally {
      setAnalyticsBusy(false);
    }
  }

  async function toggleAnalytics() {
    setAnalyticsOpen(true);
    setAdminView("analytics");
    if (!analyticsLoaded) await loadAnalytics();
  }

  async function loadTimeClock() {
    setTimeClockBusy(true);
    try {
      const data = await apiPost({ action: "timeClockAdmin", pin });
      if (data.ok) {
        setTimeClock({
          employees: Array.isArray(data.employees) ? data.employees : [],
          entries: Array.isArray(data.entries) ? data.entries : [],
          totals: Array.isArray(data.totals) ? data.totals : [],
        });
        setTimeClockLoaded(true);
      } else {
        alert(data.error || "Could not load time clock");
      }
    } catch {
      alert("Connection error");
    } finally {
      setTimeClockBusy(false);
    }
  }

  async function openTimeClockScreen() {
    if (!isOwner) return;
    setAdminView("timeclock");
    if (!timeClockLoaded) await loadTimeClock();
  }

  async function saveEmployee() {
    if (!employeeDraft.name.trim() || !employeeDraft.pin.trim()) {
      alert("Employee name and PIN are required.");
      return;
    }
    setTimeClockBusy(true);
    try {
      const data = await apiPost({ action: "saveEmployee", pin, employee: { ...employeeDraft, active: true } });
      if (data.ok) {
        setEmployeeDraft({ name: "", pin: "" });
        await loadTimeClock();
      } else {
        alert(data.error || "Could not save employee");
      }
    } catch {
      alert("Connection error");
    } finally {
      setTimeClockBusy(false);
    }
  }

  async function toggleEmployee(employee) {
    setTimeClockBusy(true);
    try {
      const data = await apiPost({ action: "toggleEmployee", pin, employeeId: employee.id, active: employee.active === false });
      if (data.ok) await loadTimeClock();
      else alert(data.error || "Could not update employee");
    } catch {
      alert("Connection error");
    } finally {
      setTimeClockBusy(false);
    }
  }

  async function closeShift(entry) {
    const ok = confirm(`Clock out ${entry.employeeName || "this employee"} now?`);
    if (!ok) return;
    setTimeClockBusy(true);
    try {
      const data = await apiPost({ action: "closeShift", pin, entryId: entry.id });
      if (data.ok) await loadTimeClock();
      else alert(data.error || "Could not close shift");
    } catch {
      alert("Connection error");
    } finally {
      setTimeClockBusy(false);
    }
  }

  function formatWeekRange(start, end) {
    if (!start || !end) return "Selected week";
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() - 1);
    return `${startDate.toLocaleDateString([], { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString([], { month: "short", day: "numeric" })}`;
  }

  async function loadMenu() {
    setMenuBusy(true);
    try {
      const data = await apiGet("menu", { pin });
      if (data.ok && Array.isArray(data.drinks)) {
        setMenuDrinks(normalizeMenuDrinks(data.drinks, true));
        setMenuMilks(normalizeIngredientList(data.milks, "milk", MILKS, true));
        setMenuSyrups(normalizeIngredientList(data.syrups, "syrup", SYRUPS, true));
        setMenuLoaded(true);
      } else if (!menuLoaded) {
        setMenuDrinks(normalizeMenuDrinks(DRINKS, true));
        setMenuMilks(normalizeIngredientList(null, "milk", MILKS, true));
        setMenuSyrups(normalizeIngredientList(null, "syrup", SYRUPS, true));
      }
    } catch {
      if (!menuLoaded) {
        setMenuDrinks(normalizeMenuDrinks(DRINKS, true));
        setMenuMilks(normalizeIngredientList(null, "milk", MILKS, true));
        setMenuSyrups(normalizeIngredientList(null, "syrup", SYRUPS, true));
      }
    } finally {
      setMenuBusy(false);
    }
  }

  async function openMenuScreen() {
    if (!canWorkQueue) return;
    setMenuOpen(true);
    setAdminView("menu");
    if (!menuLoaded) await loadMenu();
  }

  function updateMenuDrink(id, patch) {
    setMenuDrinks(current => current.map(drink => drink.id === id ? normalizeDrinkItem({ ...drink, ...patch }, drink.sortOrder) : drink));
  }

  function addMenuDrink() {
    const nextIndex = menuDrinks.length;
    const id = makeDrinkId(`Custom Drink ${Date.now()}`);
    setMenuDrinks(current => [...current, normalizeDrinkItem({
      id,
      label: "New Drink",
      desc: "",
      temps: ["Hot", "Cold"],
      milk: true,
      syrups: true,
      showTemp: true,
      active: true,
      sortOrder: nextIndex,
    }, nextIndex)]);
  }

  function removeMenuDrink(id) {
    if (menuDrinks.length <= 1) {
      alert("Keep at least one drink on the menu.");
      return;
    }
    setMenuDrinks(current => current.filter(drink => drink.id !== id).map((drink, index) => ({ ...drink, sortOrder: index })));
  }

  function moveMenuDrink(id, direction) {
    setMenuDrinks(current => {
      const next = [...current];
      const index = next.findIndex(drink => drink.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((drink, sortOrder) => ({ ...drink, sortOrder }));
    });
  }

  function reorderMenuDrink(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    setMenuDrinks(current => reorderItemsById(current, fromId, toId));
  }

  function updateMenuIngredient(type, id, patch) {
    const setter = type === "milk" ? setMenuMilks : setMenuSyrups;
    setter(current => current.map(item => item.id === id ? normalizeIngredientItem({ ...item, ...patch }, type, item.sortOrder) : item));
  }

  function addMenuIngredient(type) {
    const setter = type === "milk" ? setMenuMilks : setMenuSyrups;
    const label = type === "milk" ? "New milk" : "New syrup";
    setter(current => [...current, normalizeIngredientItem({
      id: makeIngredientId(`${label}-${Date.now()}`),
      item: label,
      type,
      available: true,
      active: true,
      sortOrder: current.length,
    }, type, current.length)]);
  }

  function removeMenuIngredient(type, id) {
    const setter = type === "milk" ? setMenuMilks : setMenuSyrups;
    setter(current => {
      if (current.length <= 1) {
        alert(`Keep at least one ${type === "milk" ? "milk" : "syrup"} item.`);
        return current;
      }
      return current.filter(item => item.id !== id).map((item, index) => ({ ...item, sortOrder: index }));
    });
  }

  function moveMenuIngredient(type, id, direction) {
    const setter = type === "milk" ? setMenuMilks : setMenuSyrups;
    setter(current => {
      const next = [...current];
      const index = next.findIndex(item => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, sortOrder) => ({ ...item, sortOrder }));
    });
  }

  function reorderMenuIngredient(type, fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const setter = type === "milk" ? setMenuMilks : setMenuSyrups;
    setter(current => reorderItemsById(current, fromId, toId));
  }

  async function saveMenuDrinks() {
    const cleaned = normalizeMenuDrinks(menuDrinks, true).map((drink, index) => ({ ...drink, sortOrder: index }));
    const cleanedMilks = normalizeIngredientList(menuMilks, "milk", MILKS, true).map((item, index) => ({ ...item, sortOrder: index }));
    const cleanedSyrups = normalizeIngredientList(menuSyrups, "syrup", SYRUPS, true).map((item, index) => ({ ...item, sortOrder: index }));
    if (cleaned.some(drink => !drink.label.trim())) {
      alert("Every drink needs a name.");
      return;
    }
    if ([...cleanedMilks, ...cleanedSyrups].some(item => !item.item.trim())) {
      alert("Every milk and syrup needs a name.");
      return;
    }
    if (!cleaned.some(drink => drink.active)) {
      alert("Keep at least one active drink.");
      return;
    }

    setMenuBusy(true);
    try {
      const data = await apiPost({ action: "saveMenu", pin, drinks: cleaned, milks: cleanedMilks, syrups: cleanedSyrups });
      if (data.ok) {
        setMenuDrinks(normalizeMenuDrinks(data.drinks || cleaned, true));
        setMenuMilks(normalizeIngredientList(data.milks || cleanedMilks, "milk", MILKS, true));
        setMenuSyrups(normalizeIngredientList(data.syrups || cleanedSyrups, "syrup", SYRUPS, true));
        setMenuLoaded(true);
        setInventory(cacheInventory({
          milks: normalizeIngredientList(data.milks || cleanedMilks, "milk", MILKS, true),
          syrups: normalizeIngredientList(data.syrups || cleanedSyrups, "syrup", SYRUPS, true),
        }));
        setNotice("Menu saved");
      } else {
        alert(data.error || "Could not save menu");
      }
    } catch {
      alert("Connection error");
    } finally {
      setMenuBusy(false);
    }
  }

  function togglePanel(panel) {
    setCollapsedPanels(current => ({ ...current, [panel]: !current[panel] }));
  }

  if (!pin) {
    return <>
      <Header isOpen={isOpen} statusText="Admin" />
      <PinGate onSuccess={(p, result) => { setPin(p); setAuth(result); }} />
    </>;
  }

  const visibleOrders = orders.filter(o => o.status !== "complete");

  if (adminView === "menu") {
    return (
      <>
        <Header isOpen={isOpen} />
        <main className="adminPage">
          <section className="adminTop">
            <div>
              <h2>Menu</h2>
              <p className="sub">{isOwner ? "Add drinks and control what customers can order." : "Hide sold-out drinks and update availability."}</p>
            </div>
            <div className="adminTopActions menuPageActions">
              <div className="menuSaveBar">
                <button className="primaryBtn compactPrimary" disabled={menuBusy} onClick={saveMenuDrinks}>{menuBusy ? "Saving..." : "Save menu"}</button>
              </div>
              <button className="ghostBtn" disabled={menuBusy} onClick={loadMenu}>Refresh</button>
              {isOwner && <button className="ghostBtn" disabled={menuBusy} onClick={addMenuDrink}>Add drink</button>}
              <button className="ghostBtn" onClick={() => { setMenuOpen(false); setAdminView("dashboard"); }}>Back to dashboard</button>
            </div>
          </section>

          <MenuEditor
            drinks={menuDrinks}
            milks={menuMilks}
            syrups={menuSyrups}
            busy={menuBusy}
            staffMode={!isOwner}
            onAddIngredient={addMenuIngredient}
            onRemove={removeMenuDrink}
            onRemoveIngredient={removeMenuIngredient}
            onMove={moveMenuDrink}
            onMoveIngredient={moveMenuIngredient}
            onReorder={reorderMenuDrink}
            onReorderIngredient={reorderMenuIngredient}
            onUpdate={updateMenuDrink}
            onUpdateIngredient={updateMenuIngredient}
          />
        </main>
      </>
    );
  }

  if (adminView === "archive") {
    return (
      <>
        <Header isOpen={isOpen} />
        <main className="adminPage">
          <section className="adminTop">
            <div>
              <h2>Archive</h2>
              <p className="sub">Latest 25 archived orders.</p>
            </div>
            <div className="adminTopActions">
              <button className="ghostBtn" disabled={archiveBusy} onClick={loadArchive}>Refresh</button>
              <button className="ghostBtn" onClick={() => { setArchiveOpen(false); setAdminView("dashboard"); }}>Back to dashboard</button>
            </div>
          </section>

          <section className="archivePanel">
            <div className="archiveHeader">
              <div>
                <h2>Orders</h2>
                <p className="sub">Use this when you need to look back after the rush.</p>
              </div>
              <div className="archiveActions">
                <button className="dangerOutlineBtn" disabled={archiveBusy || archive.length === 0} onClick={clearArchive}>Clear archive</button>
              </div>
            </div>

            {archiveBusy ? (
              <div className="empty smallEmpty">Loading archive...</div>
            ) : archive.length === 0 ? (
              <div className="empty smallEmpty">No archived orders.</div>
            ) : (
              <div className="archiveList">
                {archive.map(item => (
                  <div className="archiveOrder" key={item.id}>
                    <div>
                      <strong>{item.name || "Unnamed order"}</strong>
                      <p>{item.temp} {item.drink}{item.milk ? ` · ${item.milk}` : ""}{item.syrups ? ` · ${item.syrups}` : ""}</p>
                      {item.notes && <em>"{item.notes}"</em>}
                    </div>
                    <span>{item.archivedAt ? new Date(item.archivedAt).toLocaleString() : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </>
    );
  }

  if (adminView === "analytics") {
    return (
      <>
        <Header isOpen={isOpen} />
        <main className="adminPage">
          <section className="adminTop">
            <div>
              <h2>Analytics</h2>
              <p className="sub">Popular items based on archived orders.</p>
            </div>
            <div className="adminTopActions">
              <button className="ghostBtn" disabled={analyticsBusy} onClick={() => loadAnalytics()}>Refresh</button>
              <button className="ghostBtn" onClick={() => { setAnalyticsOpen(false); setAdminView("dashboard"); }}>Back to dashboard</button>
            </div>
          </section>

          <section className="analyticsPanel">
            <div className="analyticsWeekBar">
              <button className="ghostBtn" disabled={analyticsBusy} onClick={() => loadAnalytics(analyticsWeekOffset - 1)}>Previous week</button>
              <div>
                <strong>{analytics?.weekOffset === 0 ? "This week" : analytics?.weekOffset === -1 ? "Last week" : `${Math.abs(analytics?.weekOffset || analyticsWeekOffset)} week${Math.abs(analytics?.weekOffset || analyticsWeekOffset) === 1 ? "" : "s"} ${Number(analytics?.weekOffset ?? analyticsWeekOffset) < 0 ? "ago" : "ahead"}`}</strong>
                <span>{formatWeekRange(analytics?.weekStart, analytics?.weekEnd)}</span>
              </div>
              <button className="ghostBtn" disabled={analyticsBusy || analyticsWeekOffset >= 0} onClick={() => loadAnalytics(analyticsWeekOffset + 1)}>Next week</button>
            </div>

            {analyticsBusy ? (
              <div className="empty smallEmpty">Loading analytics...</div>
            ) : !analytics || Number(analytics.totalOrders || 0) === 0 ? (
              <div className="empty smallEmpty">No archived orders to analyze.</div>
            ) : (
              <>
                <div className="analyticsSummary">
                  <div>
                    <span>Total orders</span>
                    <strong>{analytics.totalOrders || 0}</strong>
                  </div>
                  <div>
                    <span>Hot</span>
                    <strong>{analytics.hotOrders || 0}</strong>
                  </div>
                  <div>
                    <span>Cold</span>
                    <strong>{analytics.coldOrders || 0}</strong>
                  </div>
                </div>

                <div className="analyticsGrid">
                  <AnalyticsList title="Top Drinks" items={analytics.topDrinks || []} />
                  <AnalyticsList title="Top Milks" items={analytics.topMilks || []} />
                  <AnalyticsList title="Top Syrups" items={analytics.topSyrups || []} />
                </div>
              </>
            )}
          </section>
        </main>
      </>
    );
  }

  if (adminView === "timeclock") {
    const totalsByEmployee = Object.fromEntries((timeClock.totals || []).map(total => [total.employeeId, total]));
    return (
      <>
        <Header isOpen={isOpen} />
        <main className="adminPage">
          <section className="adminTop">
            <div>
              <h2>Time Clock</h2>
              <p className="sub">Employee PIN clock-in and clock-out with calculated hours.</p>
            </div>
            <div className="adminTopActions">
              <button className="ghostBtn" disabled={timeClockBusy} onClick={loadTimeClock}>Refresh</button>
              <button className="ghostBtn" onClick={() => setAdminView("dashboard")}>Back to dashboard</button>
            </div>
          </section>

          <section className="panel">
            <div className="sectionHeader">
              <div>
                <h2>Employees</h2>
                <p className="sub">Give each person a unique PIN for `/clock`.</p>
              </div>
            </div>
            <div className="employeeForm">
              <input value={employeeDraft.name} onChange={e => setEmployeeDraft(draft => ({ ...draft, name: e.target.value }))} placeholder="Employee name" />
              <input value={employeeDraft.pin} onChange={e => setEmployeeDraft(draft => ({ ...draft, pin: e.target.value.replace(/\D/g, "").slice(0, 8) }))} placeholder="PIN" inputMode="numeric" />
              <button className="primaryBtn compactPrimary" disabled={timeClockBusy} onClick={saveEmployee}>Add employee</button>
            </div>
            <div className="employeeGrid">
              {timeClock.employees.length === 0 ? <div className="empty smallEmpty">No employees yet.</div> : timeClock.employees.map(employee => {
                const total = totalsByEmployee[employee.id] || {};
                return (
                  <div className={employee.active === false ? "employeeCard inactive" : "employeeCard"} key={employee.id}>
                    <div>
                      <strong>{employee.name}</strong>
                      <p>PIN {employee.pin} · {formatHours(total.hours30Days)} last 30 days</p>
                    </div>
                    <span className={total.clockedIn ? "menuState active" : "menuState"}>{total.clockedIn ? "Clocked in" : "Out"}</span>
                    <button className="ghostBtn" disabled={timeClockBusy} onClick={() => toggleEmployee(employee)}>{employee.active === false ? "Reactivate" : "Deactivate"}</button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="sectionHeader">
              <div>
                <h2>Recent Shifts</h2>
                <p className="sub">Completed shifts calculate hours automatically.</p>
              </div>
            </div>
            <div className="timeEntryList">
              {timeClock.entries.length === 0 ? <div className="empty smallEmpty">No shifts recorded.</div> : timeClock.entries.map(entry => (
                <div className="timeEntry" key={entry.id}>
                  <strong>{entry.employeeName}</strong>
                  <span>{formatShiftTime(entry.clockIn)}</span>
                  <span>{formatShiftTime(entry.clockOut)}</span>
                  <em>{entry.clockOut ? formatHours(entry.hours) : "Open shift"}</em>
                  {!entry.clockOut && <button className="ghostBtn" disabled={timeClockBusy} onClick={() => closeShift(entry)}>Clock out now</button>}
                </div>
              ))}
            </div>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Header isOpen={isOpen} />
      <main className="adminPage">
        <section className="adminTop">
          <div>
              <h2>{isOwner ? "Admin Control" : "Order Dashboard"}</h2>
              <p className="sub">{isOwner ? "Orders update automatically." : "Take orders through the queue and update statuses."}</p>
            <div className="adminMeta">
              <span>Active orders: {visibleOrders.length}</span>
              <span className={connectionOk ? "online" : "offline"}>{connectionOk ? "Online" : "Connection issue"}</span>
              <span>Updated {formatUpdatedAt(lastUpdated)}</span>
              <button className="adminMetaLink" onClick={() => window.location.assign("/display")}>TV</button>
            </div>
          </div>
          <div className="adminTopActions">
            <button className="ghostBtn" onClick={refreshAdminData}>Refresh</button>
            <button className="ghostBtn" onClick={() => { setPin(""); setAuth(null); }}>Log out</button>
          </div>
        </section>

        {isOwner && clockedInEmployees.length > 0 && (
          <section className="clockBanner">
            <div>
              <strong>{clockedInEmployees.length} clocked in</strong>
              <span>{clockedInEmployees.map(employee => employee.name).join(", ")}</span>
            </div>
            <button className="ghostBtn" onClick={openTimeClockScreen}>Review time clock</button>
          </section>
        )}

        {isEmployee && (
          <section className="clockBanner employeeAdminBanner">
            <div>
              <strong>Order-taking access</strong>
              <span>{auth?.employee?.name ? `Signed in as ${auth.employee.name}` : "Employee PIN active"}</span>
            </div>
          </section>
        )}

        {canWorkQueue && <section className="adminCommandCenter">
          <div className="queueCommand">
            <div>
              <div className="label">Queue Status</div>
              <div className={isOpen ? "statusOpen" : "statusClosed"}>{isOpen ? "● Open" : "● Closed"}</div>
            </div>
            <button disabled={busy} className={isOpen ? "dangerBtn" : "successBtn"} onClick={() => saveAdmin({ isOpen: !isOpen, message })}>
              {isOpen ? "Close Queue" : "Open Queue"}
            </button>
          </div>

          <div className="adminQuickActions">
            <button className="ghostBtn" onClick={clearCompleted}>Archive ready ({readyArchiveCount})</button>
            {isOwner && <button className="dangerOutlineBtn" onClick={clearAll}>Clear all after close</button>}
          </div>
        </section>}

        {canWorkQueue && <section className="adminTools">
          <button className="toolTile" onClick={openMenuScreen}>
            <strong>Menu</strong>
            <span>{isOwner ? "Drinks, milks, syrups" : "Availability and sold out"}</span>
          </button>
          {isOwner && <button className={archiveOpen ? "toolTile active" : "toolTile"} onClick={toggleArchive}>
            <strong>Archive</strong>
            <span>View past orders</span>
          </button>}
          {isOwner && <button className={analyticsOpen ? "toolTile active" : "toolTile"} onClick={toggleAnalytics}>
            <strong>Analytics</strong>
            <span>Popular items</span>
          </button>}
          {isOwner && <button className={adminView === "timeclock" ? "toolTile active" : "toolTile"} onClick={openTimeClockScreen}>
            <strong>Time Clock</strong>
            <span>Employee hours</span>
          </button>}
        </section>}

        {isOwner && <section className="panel closedMessagePanel">
          <div className="label">Closed message</div>
          <textarea
            value={message}
            onFocus={() => { messageEditingRef.current = true; }}
            onBlur={() => { messageEditingRef.current = false; }}
            onChange={e => {
              messageEditingRef.current = true;
              setMessage(e.target.value);
            }}
            rows={2}
          />
          <button className="primaryBtn" disabled={busy} onClick={() => saveAdmin({ isOpen, message })}>Save message</button>
          {notice && <div className="notice">{notice}</div>}
        </section>}

        {canWorkQueue && <section className="inventoryPanel">
          <div className="sectionHeader">
            <div>
              <h2>Syrup & Milk Inventory</h2>
              <p className="sub">Tap an item to mark it available or out of stock.</p>
            </div>
            <button className="collapseBtn" onClick={() => togglePanel("inventory")}>{collapsedPanels.inventory ? "Show" : "Hide"}</button>
          </div>

          {!collapsedPanels.inventory && (
            <>
              <div className="inventoryGroup">
                <div className="label">Syrups</div>
                <div className="inventoryGrid">
                  {adminSyrups.map(x => (
                    <button
                      key={x.item}
                      disabled={busy}
                      className={x.available ? "inventoryToggle available" : "inventoryToggle out"}
                      onClick={() => toggleInventory(x.item, !x.available)}
                    >
                      <span>{x.item}</span>
                      <strong>{x.available ? "Available" : "Out of stock"}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className="inventoryGroup">
                <div className="label">Milks</div>
                <div className="inventoryGrid">
                  {adminMilks.map(x => (
                    <button
                      key={x.item}
                      disabled={busy}
                      className={x.available ? "inventoryToggle available" : "inventoryToggle out"}
                      onClick={() => toggleInventory(x.item, !x.available)}
                    >
                      <span>{x.item}</span>
                      <strong>{x.available ? "Available" : "Out of stock"}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>}

        <section className="orders">
          <div className="sectionHeader">
            <h2>Active Orders</h2>
            <button className="collapseBtn" onClick={() => togglePanel("orders")}>{collapsedPanels.orders ? "Show" : "Hide"}</button>
          </div>

          {!collapsedPanels.orders && (
            visibleOrders.length === 0 ? <div className="empty smallEmpty">No active orders.</div> : visibleOrders.map((o, idx) => (
              <div className={"adminOrder " + o.status} key={o.id}>
                <div className="orderTop">
                  <div className="orderNum">#{String(idx + 1).padStart(3, "0")}</div>
                  <div>
                    <strong>{o.name}</strong>
                    <p>{o.temp} {o.drink}{o.milk ? ` · ${o.milk}` : ""}{o.syrups ? ` · ${o.syrups}` : ""}</p>
                    {orderAgeText(o.time) && <span className="orderAge">Ordered {orderAgeText(o.time)}</span>}
                    {o.notes && <em>"{o.notes}"</em>}
                  </div>
                  <span className={"statusBadge " + o.status}>{statusLabel(o.status)}</span>
                </div>
                <div className="adminActions">
                  <button className={o.status === "waiting" ? "activeStatusAction" : ""} onClick={() => updateStatus(o.id, "waiting")}>Waiting</button>
                  <button className={o.status === "making" ? "activeStatusAction" : ""} onClick={() => updateStatus(o.id, "making")}>Start Making</button>
                  <button onClick={() => updateStatus(o.id, "complete")}>Ready for Pickup</button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </>
  );
}

function MenuEditor({
  drinks,
  milks,
  syrups,
  busy,
  staffMode = false,
  onAddIngredient,
  onRemove,
  onRemoveIngredient,
  onMove,
  onMoveIngredient,
  onReorder,
  onReorderIngredient,
  onUpdate,
  onUpdateIngredient,
}) {
  function toggleTemp(drink, temp) {
    if (staffMode) return;
    const hasTemp = drink.temps.includes(temp);
    const nextTemps = hasTemp ? drink.temps.filter(t => t !== temp) : [...drink.temps, temp];
    onUpdate(drink.id, {
      temps: nextTemps.length ? nextTemps : [temp],
      showTemp: nextTemps.length > 1 ? drink.showTemp : false,
    });
  }

  function updateCategory(drink, category) {
    if (staffMode) return;
    const isRefresher = category === "refresher";
    const isCoffee = category === "coffee";
    onUpdate(drink.id, {
      category,
      milk: isCoffee ? drink.milk : false,
      syrups: isCoffee ? drink.syrups : false,
      toppings: isRefresher,
      temps: isCoffee ? drink.temps : ["Cold"],
      showTemp: isCoffee ? drink.showTemp : false,
    });
  }

  return (
    <section className="menuPanel">
      <div className="menuSectionCard">
        <div className="menuSubhead">
          <div>
            <h3>Drinks</h3>
            <p>{staffMode ? "Mark drinks visible or sold out for customers." : "Control the order form drink choices."}</p>
          </div>
          <span>{drinks.filter(drink => drink.active).length} visible</span>
        </div>

        <div className="menuEditorList">
          {drinks.map((drink, index) => (
            <div
              className={drink.active ? "menuEditorItem" : "menuEditorItem inactive"}
              key={drink.id}
              draggable={!busy && !staffMode}
              onDragStart={event => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", drink.id);
              }}
              onDragOver={event => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={event => {
                event.preventDefault();
                onReorder(event.dataTransfer.getData("text/plain"), drink.id);
              }}
            >
              <div className="menuCardHeader">
                <div>
                  <span className="menuOrder" title="Drag to reorder">#{String(index + 1).padStart(2, "0")}</span>
                  <strong>{drink.label || "New Drink"}</strong>
                </div>
                <span className={drink.active ? "menuState active" : "menuState"}>{drink.active ? "Visible" : "Hidden"}</span>
              </div>

              <div className="menuCardBody">
                <label>
                  <span className="label">Name</span>
                  <input value={drink.label} disabled={staffMode} onChange={e => onUpdate(drink.id, { label: e.target.value })} placeholder="Drink name" />
                </label>
                <label>
                  <span className="label">Description</span>
                  <input value={drink.desc} disabled={staffMode} onChange={e => onUpdate(drink.id, { desc: e.target.value })} placeholder="Short description" />
                </label>
              </div>

              {!staffMode && <div className="menuCardControls">
                <div>
                  <div className="label">Category</div>
                  <div className="menuTempRow">
                    {MENU_CATEGORIES.map(category => (
                      <button
                        key={category.id}
                        className={drink.category === category.id ? "choice active" : "choice"}
                        onClick={() => updateCategory(drink, category.id)}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="label">Temperature</div>
                  <div className="menuTempRow">
                    <button className={drink.temps.includes("Hot") ? "choice active" : "choice"} onClick={() => toggleTemp(drink, "Hot")}>Hot</button>
                    <button className={drink.temps.includes("Cold") ? "choice active" : "choice"} onClick={() => toggleTemp(drink, "Cold")}>Cold</button>
                  </div>
                </div>

                <div>
                  <div className="label">Options</div>
                  <div className="menuOptionGrid">
                    <label className="adminCheck">
                      <input type="checkbox" checked={drink.milk} onChange={e => onUpdate(drink.id, { milk: e.target.checked })} />
                      Needs milk
                    </label>
                    <label className="adminCheck">
                      <input type="checkbox" checked={drink.syrups} onChange={e => onUpdate(drink.id, { syrups: e.target.checked })} />
                      Allows syrup
                    </label>
                    <label className="adminCheck">
                      <input type="checkbox" checked={drink.category === "refresher"} disabled />
                      Refresher toppings
                    </label>
                    <label className="adminCheck">
                      <input type="checkbox" checked={drink.showTemp !== false && drink.temps.length > 1} disabled={drink.temps.length < 2} onChange={e => onUpdate(drink.id, { showTemp: e.target.checked })} />
                      Show temp choice
                    </label>
                  </div>
                </div>
              </div>}

              <div className="menuItemActions">
                <button className="ghostBtn" disabled={busy} onClick={() => onUpdate(drink.id, { active: !drink.active })}>{drink.active ? "Hide" : "Show"}</button>
                {!staffMode && <button className="ghostBtn" disabled={busy || index === 0} onClick={() => onMove(drink.id, -1)}>Move up</button>}
                {!staffMode && <button className="ghostBtn" disabled={busy || index === drinks.length - 1} onClick={() => onMove(drink.id, 1)}>Move down</button>}
                {!staffMode && <button className="dangerOutlineBtn" disabled={busy || drinks.length <= 1} onClick={() => onRemove(drink.id)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <IngredientMenuSection
        title="Milks"
        type="milk"
        items={milks}
        busy={busy}
        staffMode={staffMode}
        onAdd={onAddIngredient}
        onUpdate={onUpdateIngredient}
        onMove={onMoveIngredient}
        onReorder={onReorderIngredient}
        onRemove={onRemoveIngredient}
      />

      <IngredientMenuSection
        title="Syrups"
        type="syrup"
        items={syrups}
        busy={busy}
        staffMode={staffMode}
        onAdd={onAddIngredient}
        onUpdate={onUpdateIngredient}
        onMove={onMoveIngredient}
        onReorder={onReorderIngredient}
        onRemove={onRemoveIngredient}
      />
    </section>
  );
}

function IngredientMenuSection({ title, type, items, busy, staffMode = false, onAdd, onUpdate, onMove, onReorder, onRemove }) {
  return (
    <div className="menuSectionCard ingredientMenuSection">
      <div className="menuSubhead">
        <div>
          <h3>{title}</h3>
          <p>{staffMode ? "Mark items available or out of stock." : type === "milk" ? "Milk choices for drinks that need milk." : "Syrup choices shown to customers."}</p>
        </div>
        <div className="menuSubActions">
          <span>{items.filter(item => item.active).length} visible</span>
          {!staffMode && <button className="ghostBtn" disabled={busy} onClick={() => onAdd(type)}>Add {type === "milk" ? "milk" : "syrup"}</button>}
        </div>
      </div>

      <div className="ingredientEditorGrid">
        {items.map((item, index) => (
          <div
            className={item.active ? "ingredientEditorItem" : "ingredientEditorItem inactive"}
            key={item.id}
            draggable={!busy && !staffMode}
            onDragStart={event => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", item.id);
            }}
            onDragOver={event => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={event => {
              event.preventDefault();
              onReorder(type, event.dataTransfer.getData("text/plain"), item.id);
            }}
          >
            <div className="menuCardHeader">
              <div>
                <span className="menuOrder" title="Drag to reorder">#{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.item.trim() || `New ${type}`}</strong>
              </div>
              <span className={item.active ? "menuState active" : "menuState"}>{item.active ? "Visible" : "Hidden"}</span>
            </div>

            <label className="menuNameField">
              <span>Name</span>
              <input value={item.item} disabled={staffMode} onChange={e => onUpdate(type, item.id, { item: e.target.value })} />
            </label>

            <div className="menuItemActions">
              <button className="ghostBtn" disabled={busy} onClick={() => onUpdate(type, item.id, { available: !item.available })}>{item.available ? "Mark out" : "Mark available"}</button>
              {!staffMode && <button className="ghostBtn" disabled={busy} onClick={() => onUpdate(type, item.id, { active: !item.active })}>{item.active ? "Hide" : "Show"}</button>}
              {!staffMode && <button className="ghostBtn" disabled={busy || index === 0} onClick={() => onMove(type, item.id, -1)}>Up</button>}
              {!staffMode && <button className="ghostBtn" disabled={busy || index === items.length - 1} onClick={() => onMove(type, item.id, 1)}>Down</button>}
              {!staffMode && <button className="dangerOutlineBtn" disabled={busy || items.length <= 1} onClick={() => onRemove(type, item.id)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsList({ title, items }) {
  return (
    <div className="analyticsList">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="muted">No data yet.</p>
      ) : items.map(item => (
        <div className="analyticsRow" key={item.item}>
          <span>{item.item}</span>
          <strong>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}


function DonationModal({ onClose }) {
  async function copyZelle() {
    try {
      await navigator.clipboard.writeText(DONATION_ZELLE);
      alert("Zelle email copied");
    } catch {
      alert("Zelle: " + DONATION_ZELLE);
    }
  }

  return (
    <div className="modalOverlay donationOverlay">
      <div className="donationModal">
        <div className="donationIcon logoIcon"><img src="/icons/anchorite-icon-192.png" alt="" /></div>
        <h2>Payment</h2>
        <p>
          Payment is not verified automatically. Please send Zelle, then show staff your confirmation if asked.
        </p>

        <div className="donationActions">
          <button className="zelleBtn" onClick={copyZelle}>
            Zelle: {DONATION_ZELLE}
          </button>
        </div>

        <button className="plainBtn donationSkip" onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

function ReadyAlertModal({ busy, message, deviceHint, onEnable, onClose }) {
  return (
    <div className="modalOverlay donationOverlay">
      <div className="donationModal readyAlertModal">
        <div className="donationIcon">🔔</div>
        <h2>Want a ready alert?</h2>
        <p>
          We can notify you when your drink is ready, so you do not have to keep this page open.
        </p>
        {deviceHint && <p className="readyAlertHint">{deviceHint}</p>}
        {message && <p className="readyAlertMessage">{message}</p>}

        <div className="donationActions">
          <button className="modalPrimaryBtn readyAlertBtn" disabled={busy} onClick={onEnable}>
            {busy ? "Enabling..." : "Notify me"}
          </button>
          <button className="plainBtn donationSkip" onClick={onClose}>
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}

function IosInstallGate({ onRefresh }) {
  return (
    <main className="iosInstallPage">
      <section className="iosInstallCard">
        <div className="brandMark logoIcon"><img src="/icons/anchorite-icon-192.png" alt="" /></div>
        <h1>Install Anchorite Cafe</h1>
        <p>On iPhone or iPad, please add Anchorite Cafe to your Home Screen before ordering so ready notifications can work.</p>
        <ol>
          <li>Tap the Share button in Safari.</li>
          <li>Choose Add to Home Screen.</li>
          <li>Open Anchorite Cafe from the new Home Screen icon.</li>
        </ol>
        <button className="joinBtn" onClick={onRefresh}>I opened it from Home Screen</button>
      </section>
    </main>
  );
}

function CustomerPage() {
  const [form, setForm] = useState(() => {
    const savedName = localStorage.getItem("arise-customer-name") || "";
    return { ...defaultForm(), name: savedName };
  });
  const [errors, setErrors] = useState({});
  const [isOpen, setIsOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [menuDrinks, setMenuDrinks] = useState(() => normalizeMenuDrinks(DRINKS));
  const [inventory, setInventory] = useState(loadCachedInventory);
  const [myOrderId, setMyOrderId] = useState(() => new URLSearchParams(window.location.search).get("order") || localStorage.getItem("coffee-my-order-id") || "");
  const [myOrder, setMyOrder] = useState(null);
  const [myOrderPosition, setMyOrderPosition] = useState(1);
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState([]);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showReadyAlertPrompt, setShowReadyAlertPrompt] = useState(false);
  const [readyAlertShown, setReadyAlertShown] = useState(false);
  const [lastOrder, setLastOrder] = useState(loadLastOrder);
  const [largeText, setLargeText] = useState(() => localStorage.getItem(TEXT_SIZE_KEY) === "large");
  const [pushState, setPushState] = useState({ busy: false, enabled: false, message: "" });
  const submittingRef = useRef(false);
  const pendingLastOrderRef = useRef(null);
  const orderLoadingRef = useRef(false);
  const statusLoadingRef = useRef(false);
  const inventoryLoadingRef = useRef(false);
  const menuLoadingRef = useRef(false);
  const previousStatusRef = useRef("");
  const nameRef = useRef(null);

  const customerDrinks = useMemo(() => normalizeMenuDrinks(menuDrinks), [menuDrinks]);
  const drinksByCategory = useMemo(() => MENU_CATEGORIES.map(category => ({
    ...category,
    drinks: customerDrinks.filter(d => d.category === category.id),
  })).filter(category => category.drinks.length), [customerDrinks]);
  const drink = useMemo(() => getDrink(form.drinkId, customerDrinks), [form.drinkId, customerDrinks]);
  const inventoryLookup = useMemo(() => buildInventoryLookup(inventory), [inventory]);
  const customerMilks = useMemo(() => inventoryItemsByType(inventory, "milk", MILKS).filter(item => item.available !== false), [inventory]);
  const customerSyrups = useMemo(() => inventoryItemsByType(inventory, "syrup", SYRUPS).filter(item => item.available !== false), [inventory]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price || 0), 0), [cart]);
  const pushDeviceHint = useMemo(() => getPushDeviceHint(), []);
  const requiresIosInstall = useMemo(() => isAppleTouchDevice() && !isStandaloneApp(), []);

  function updateTextSize(nextLargeText) {
    setLargeText(nextLargeText);
    localStorage.setItem(TEXT_SIZE_KEY, nextLargeText ? "large" : "normal");
  }

  function updateMyOrder(order, positionFromResponse) {
    const found = normalizeOrderFromSingle(order);
    if (!found) {
      setMyOrder(null);
      setMyOrderId("");
      localStorage.removeItem("coffee-my-order-id");
      return;
    }

    const nextPosition = found.position || Number(positionFromResponse || 0) || 1;
    setMyOrderPosition(nextPosition);
    setMyOrder({ ...found, position: nextPosition });

    const isReadyForPickup = ["ready", "complete"].includes(found.status);
    const wasReadyForPickup = ["ready", "complete"].includes(previousStatusRef.current);

    if (isReadyForPickup && !wasReadyForPickup && !readyAlertShown) {
      ringReadyAlert();
      setReadyAlertShown(true);
    }

    previousStatusRef.current = found.status;
  }

  async function refreshOrder() {
    if (!myOrderId) return;
    if (orderLoadingRef.current) return;
    orderLoadingRef.current = true;
    try {
      const data = await apiGet("order", { id: myOrderId });
      if (data.ok === false) return;
      if (typeof data.isOpen === "boolean") setIsOpen(Boolean(data.isOpen));
      if (typeof data.message === "string") setMessage(data.message || "");
      if (data.inventory) setInventory(cacheInventory(data.inventory));
      updateMyOrder(data.order, data.position);
    } catch {
    } finally {
      orderLoadingRef.current = false;
    }
  }

  async function refreshInitialCustomerData() {
    try {
      const data = await apiGet();
      if (data.ok) {
        if (typeof data.isOpen === "boolean") setIsOpen(Boolean(data.isOpen));
        if (typeof data.message === "string") setMessage(data.message || "");
      }
    } catch {}
    await refreshInventoryOnly();
  }

  async function refreshInventoryOnly() {
    if (inventoryLoadingRef.current) return;
    inventoryLoadingRef.current = true;
    try {
      const data = await apiGet("inventory");
      if (data.ok && data.inventory) setInventory(cacheInventory(data.inventory));
    } catch {
    } finally {
      inventoryLoadingRef.current = false;
    }
  }

  async function refreshMenuOnly() {
    if (menuLoadingRef.current) return;
    menuLoadingRef.current = true;
    try {
      const data = await apiGet("menu");
      if (data.ok && Array.isArray(data.drinks)) setMenuDrinks(normalizeMenuDrinks(data.drinks));
    } catch {
    } finally {
      menuLoadingRef.current = false;
    }
  }

  async function refreshStatusOnly() {
    if (statusLoadingRef.current) return isOpen;
    statusLoadingRef.current = true;
    try {
      const data = await apiGet("status");
      if (data.ok) {
        setIsOpen(Boolean(data.isOpen));
        setMessage(data.message || "");
        return Boolean(data.isOpen);
      }
    } catch {
    } finally {
      statusLoadingRef.current = false;
    }
    return isOpen;
  }

  useEffect(() => {
    if (myOrderId) refreshOrder();
    else refreshInitialCustomerData();
    refreshMenuOnly();

    const orderId = myOrderId ? setInterval(() => {
      if (isPageVisible()) refreshOrder();
    }, 6000) : null;
    const inventoryId = myOrderId ? null : setInterval(() => {
      if (isPageVisible()) refreshInventoryOnly();
    }, 60000);
    const statusId = myOrderId ? null : setInterval(() => {
      if (isPageVisible()) refreshStatusOnly();
    }, 6000);

    function refreshWhenVisible() {
      if (!isPageVisible()) return;
      if (myOrderId) refreshOrder();
      else refreshInitialCustomerData();
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      if (orderId) clearInterval(orderId);
      if (inventoryId) clearInterval(inventoryId);
      if (statusId) clearInterval(statusId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [myOrderId]);

  useEffect(() => {
    const d = getDrink(form.drinkId, customerDrinks);
    const pending = pendingLastOrderRef.current;
    pendingLastOrderRef.current = null;
    setForm(f => ({
      ...f,
      temp: pending?.temp || d.temps[0],
      milk: pending?.milk || "",
      syrups: pending?.syrups || [],
      toppings: pending?.toppings || [],
      notes: pending?.notes ?? f.notes,
    }));
    setErrors({});
  }, [form.drinkId, customerDrinks]);

  useEffect(() => {
    if (!customerDrinks.some(d => d.id === form.drinkId)) {
      setForm(f => ({ ...f, drinkId: customerDrinks[0]?.id || "latte" }));
    }
  }, [customerDrinks, form.drinkId]);

  function toggleSyrup(s) {
    setForm(f => {
      if (f.syrups.includes(s)) return { ...f, syrups: f.syrups.filter(x => x !== s) };
      if (f.syrups.length >= MAX_SYRUPS) return f;
      return { ...f, syrups: [...f.syrups, s] };
    });
  }

  function toggleTopping(topping) {
    setForm(f => {
      const current = Array.isArray(f.toppings) ? f.toppings : [];
      if (current.includes(topping)) return { ...f, toppings: current.filter(x => x !== topping) };
      if (current.length >= MAX_REFRESHER_TOPPINGS) return f;
      return { ...f, toppings: [...current, topping] };
    });
  }

  function describeCartItem(item) {
    const parts = [item.temp, item.drink].filter(Boolean);
    if (item.milk) parts.push(item.milk);
    if (item.syrups.length) parts.push(item.syrups.join(", "));
    if (item.toppings.length) parts.push(item.toppings.join(", "));
    parts.push(formatPrice(item.price));
    return parts.join(" · ");
  }

  function buildCartItem() {
    const toppings = drink.category === "refresher" ? (form.toppings || []) : [];
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: form.name.trim(),
      drink: drink.label,
      drinkId: form.drinkId,
      category: drink.category,
      temp: drink.showTemp === false ? drink.temps[0] : form.temp,
      milk: drink.milk ? form.milk : "",
      syrups: drink.syrups ? form.syrups : [],
      toppings,
      price: priceForCategory(drink.category),
      notes: form.notes.trim(),
    };
  }

  function validate() {
    const e = {};
    if (!customerDrinks.some(d => d.id === form.drinkId)) e.drink = "That drink is not available today";
    if (!form.name.trim()) e.name = "Please enter your name";
    else if (!hasFirstAndLastName(form.name)) e.name = "Please enter first and last name";
    if (drink.milk && !form.milk) e.milk = "Please choose a milk";
    if (form.milk && !isInventoryAvailable(inventoryLookup, form.milk)) e.milk = form.milk + " is out of stock";
    const outSyrup = form.syrups.find(s => !isInventoryAvailable(inventoryLookup, s));
    if (outSyrup) e.syrups = outSyrup + " is out of stock";
    return e;
  }

  function validateCheckout() {
    const e = {};
    if (!cart.length) e.cart = "Add at least one item to your cart";
    if (!paymentStarted) e.payment = "Go to Zelle first, then return and confirm payment";
    return e;
  }

  function addToCart() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      if (e.name) nameRef.current?.focus();
      return;
    }

    const item = buildCartItem();
    setCart(current => [...current, item]);
    localStorage.setItem("arise-customer-name", item.name);
    setForm(f => ({
      ...defaultForm(),
      name: f.name,
      drinkId: f.drinkId,
      temp: drink.temps[0],
    }));
    setErrors({});
  }

  function removeCartItem(id) {
    setCart(current => current.filter(item => item.id !== id));
    setPaymentStarted(false);
  }

  async function startZellePayment() {
    if (!cart.length) {
      setErrors({ cart: "Add at least one item to your cart" });
      return;
    }
    setErrors(er => ({ ...er, payment: "" }));
    setPaymentStarted(true);
    if (ZELLE_PAYMENT_URL) {
      window.location.href = ZELLE_PAYMENT_URL;
      return;
    }
    try {
      await navigator.clipboard.writeText(DONATION_ZELLE);
      alert("Zelle email copied. Send payment, then return here and tap I paid, place order.");
    } catch {
      alert("Send Zelle to " + DONATION_ZELLE + ", then return here and tap I paid, place order.");
    }
  }

  function useLastOrder() {
    if (!lastOrder) return;

    const savedDrink = customerDrinks.find(d => d.id === lastOrder.drinkId)
      || customerDrinks.find(d => d.label.toLowerCase() === String(lastOrder.drinkLabel || "").toLowerCase());

    if (!savedDrink) {
      setErrors({ drink: "That saved drink is not on today's menu." });
      return;
    }

    const nextTemp = savedDrink.temps.includes(lastOrder.temp) ? lastOrder.temp : savedDrink.temps[0];
    const nextMilk = savedDrink.milk && isInventoryAvailable(inventoryLookup, lastOrder.milk) ? lastOrder.milk : "";
    const nextSyrups = savedDrink.syrups && Array.isArray(lastOrder.syrups)
      ? lastOrder.syrups.filter(s => isInventoryAvailable(inventoryLookup, s)).slice(0, MAX_SYRUPS)
      : [];

    pendingLastOrderRef.current = { temp: nextTemp, milk: nextMilk, syrups: nextSyrups, notes: lastOrder.notes || "" };
    setForm(f => ({ ...f, drinkId: savedDrink.id }));
    setErrors({});
  }

  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);

    const queueIsOpen = await refreshStatusOnly();
    if (!queueIsOpen) {
      setBusy(false);
      submittingRef.current = false;
      return;
    }

    const e = validateCheckout();
    if (Object.keys(e).length) {
      setErrors(e);
      setBusy(false);
      submittingRef.current = false;
      return;
    }

    try {
      const placed = [];
      for (let index = 0; index < cart.length; index += 1) {
        const item = cart[index];
        const noteParts = [
          `Cart item ${index + 1} of ${cart.length}`,
          `Item price: ${formatPrice(item.price)}`,
          `Cart total: ${formatPrice(cartTotal)}`,
          "Payment: Zelle",
          "Payment verification: staff must confirm manually",
          item.toppings.length ? `Refresher toppings: ${item.toppings.join(", ")}` : "",
          item.notes,
        ].filter(Boolean);
        const data = await apiPost({
          action: "order",
          name: item.name,
          drink: item.drink,
          drinkId: item.drinkId,
          temp: item.temp,
          milk: item.milk,
          syrups: item.syrups,
          notes: noteParts.join(" | "),
        });

        if (!data.ok) {
          alert(data.error || "Could not place order");
          await refreshStatusOnly();
          setBusy(false);
          submittingRef.current = false;
          return;
        }
        placed.push({ ...item, response: data });
      }

      const first = placed[0];
      const firstResponse = first.response;
      localStorage.setItem("arise-customer-name", first.name);
      localStorage.setItem("coffee-my-order-id", firstResponse.id);
      const savedOrder = {
        drinkId: first.drinkId,
        drinkLabel: first.drink,
        temp: first.temp,
        milk: first.milk,
        syrups: first.syrups,
        notes: first.notes,
        expiresAt: Date.now() + LAST_ORDER_TTL_MS,
      };
      localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(savedOrder));
      setLastOrder(savedOrder);
      setReadyAlertShown(false);
      previousStatusRef.current = "waiting";
      setMyOrderId(firstResponse.id);
      setMyOrderPosition(Number(firstResponse.position || 1));
      setMyOrder({
        id: firstResponse.id,
        name: first.name,
        drink: placed.length > 1 ? `${first.drink} + ${placed.length - 1} more` : first.drink,
        temp: first.temp,
        milk: first.milk,
        syrups: [...first.syrups, ...first.toppings].join(", "),
        notes: "Paid with Zelle; staff confirmation may be needed",
        status: "waiting",
        position: Number(firstResponse.position || 1)
      });
      setForm(defaultForm());
      setCart([]);
      setPaymentStarted(false);
      setShowDonation(true);
      setShowReadyAlertPrompt(true);
    } catch {
      alert("Connection error. Try again.");
    }
    setBusy(false);
    submittingRef.current = false;
  }

  function clearMyTicket() {
    localStorage.removeItem("coffee-my-order-id");
    setMyOrderId("");
    setMyOrder(null);
    setMyOrderPosition(1);
    setPushState({ busy: false, enabled: false, message: "" });
  }

  async function enableReadyNotification() {
    if (!myOrder?.id || pushState.busy) return;

    const support = getPushSupportStatus();
    if (!support.ok) {
      setPushState({ busy: false, enabled: false, message: support.reason });
      return;
    }

    setPushState({ busy: true, enabled: false, message: "" });
    const result = await subscribeToReadyNotification({
      orderId: myOrder.id,
      customerName: myOrder.name,
      orderName: myOrder.drink,
    });

    setPushState({
      busy: false,
      enabled: Boolean(result.ok),
      message: result.ok ? "Notifications enabled for this order." : (result.error || "Could not enable notifications."),
    });
    if (result.ok) setShowReadyAlertPrompt(false);
  }

  const lbl = (text, hint) => <div className="label">{text}{hint && <span> {hint}</span>}</div>;

  if (requiresIosInstall && !myOrderId && !myOrder) {
    return <>
      <Header isOpen={isOpen} />
      <IosInstallGate onRefresh={() => window.location.reload()} />
    </>;
  }

  if (!isOpen && !myOrder) {
    return <>
      <Header isOpen={isOpen} />
      <main className={largeText ? "closedPage customerLargeText" : "closedPage"}>
        <div className="customerTools closedTools">
          <TextSizeControl largeText={largeText} onChange={updateTextSize} />
        </div>
        <div className="closedIcon">🚫</div>
        <h1>We're closed</h1>
        <p>{message || "Orders aren't being taken right now. Check back soon!"}</p>
        <button className="ghostBtn" onClick={refreshStatusOnly}>Refresh status</button>
      </main>
    </>;
  }

  return (
    <>
      <Header isOpen={isOpen} />
      <main className={largeText ? "layout customerLargeText" : "layout"}>
        <section className="formCol">
          <div className="customerSectionHead">
            <div>
              <h2>Place your order</h2>
              <p className="sub">{isOpen ? "We'll hold your spot in line." : "Queue is closed, but your current order status still updates."}</p>
            </div>
            <TextSizeControl largeText={largeText} onChange={updateTextSize} />
          </div>

          {isOpen && (
            <>
              {lastOrder && (
                <button className="lastOrderBtn" onClick={useLastOrder}>
                  <span>Use last order</span>
                  <strong>{savedOrderSummary(lastOrder)}</strong>
                </button>
              )}

              <div className="field">
                {lbl("Your name")}
                <input ref={nameRef} value={form.name} onChange={e => { setForm(f => ({...f, name: e.target.value})); setErrors(er => ({...er, name: ""})); }} placeholder="e.g. Alex Morgan" />
                {errors.name && <div className="errorText">{errors.name}</div>}
              </div>

              <div className="field">
                {lbl("Menu")}
                <div className="drinkGroups">
                  {drinksByCategory.map(category => (
                    <div className="drinkGroup" key={category.id}>
                      <h3>{category.label} <span>{formatPrice(priceForCategory(category.id))}</span></h3>
                      <div className="drinkList">
                        {category.drinks.map(d => (
                          <button key={d.id} className={form.drinkId === d.id ? "drink active" : "drink"} onClick={() => setForm(f => ({...f, drinkId: d.id}))}>
                            <strong>{d.label}</strong>
                            <span>{d.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.drink && <div className="errorText">{errors.drink}</div>}
              </div>

              {drink.showTemp !== false && (drink.temps.length > 1 ? (
                <div className="field">
                  {lbl("Temperature")}
                  <div className="row">{drink.temps.map(t => <button key={t} className={form.temp === t ? "choice active" : "choice"} onClick={() => setForm(f => ({...f, temp: t}))}>{t}</button>)}</div>
                </div>
              ) : <div className="servedOnly">Served <strong>{drink.temps[0].toLowerCase()}</strong> only</div>)}

              {drink.milk && <div className="field">
                {lbl("Milk", "(required)")}
                <div className="row wrap">{customerMilks.map(m => (
                  <button
                    key={m.item}
                    disabled={!m.available}
                    className={(form.milk === m.item ? "choice active" : "choice") + (!m.available ? " outOfStock" : "")}
                    onClick={() => {
                      if (!m.available) return;
                      setForm(f => ({...f, milk: m.item}));
                      setErrors(er => ({...er, milk: ""}));
                    }}
                  >
                    {m.item}{!m.available ? " — Out of stock" : ""}
                  </button>
                ))}</div>
                {errors.milk && <div className="errorText">{errors.milk}</div>}
              </div>}

              {drink.syrups && <div className="field">
                {lbl("Syrup", `— pick up to ${MAX_SYRUPS}`)}
                <div className="syrups">{customerSyrups.map(s => {
                  const selected = form.syrups.includes(s.item);
                  const out = !s.available;
                  const maxed = !selected && form.syrups.length >= MAX_SYRUPS;
                  return (
                    <button
                      key={s.item}
                      disabled={out || maxed}
                      className={(selected ? "syrup active" : "syrup") + (out ? " outOfStock" : "")}
                      onClick={() => !out && toggleSyrup(s.item)}
                    >
                      {selected ? "✓ " : ""}{s.item}{out ? " — Out of stock" : ""}
                    </button>
                  );
                })}</div>
                <div className="muted small">{form.syrups.length === 0 ? "None selected — no syrup will be added" : `${form.syrups.length}/${MAX_SYRUPS} selected`}</div>
                {errors.syrups && <div className="errorText">{errors.syrups}</div>}
              </div>}

              {drink.category === "refresher" && <div className="field">
                {lbl("Refresher toppings", `— pick up to ${MAX_REFRESHER_TOPPINGS}`)}
                <div className="syrups">{REFRESHER_TOPPINGS.map(topping => {
                  const selected = form.toppings.includes(topping);
                  const maxed = !selected && form.toppings.length >= MAX_REFRESHER_TOPPINGS;
                  return (
                    <button
                      key={topping}
                      disabled={maxed}
                      className={selected ? "syrup active" : "syrup"}
                      onClick={() => toggleTopping(topping)}
                    >
                      {selected ? "✓ " : ""}{topping}
                    </button>
                  );
                })}</div>
                <div className="muted small">{form.toppings.length === 0 ? "No refresher toppings selected" : `${form.toppings.length}/${MAX_REFRESHER_TOPPINGS} selected`}</div>
              </div>}

              {!drink.syrups && !drink.milk && <div className="servedOnly">Served as listed: <strong>{drink.label}</strong></div>}

              <div className="field">
                {lbl("Notes", "(optional)")}
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Any special requests?" />
              </div>

              <button disabled={busy} className="joinBtn" onClick={addToCart}>Add to Cart</button>

              <div className="cartPanel">
                <div className="cartHeader">
                  <div>
                    <h3>Cart</h3>
                    <p>{cart.length ? `${cart.length} item${cart.length === 1 ? "" : "s"} ready for checkout` : "Add drinks before checkout"}</p>
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="cartEmpty">Your cart is empty.</div>
                ) : (
                  <div className="cartItems">
                    {cart.map((item, index) => (
                      <div className="cartItem" key={item.id}>
                        <div>
                          <strong>{index + 1}. {item.drink}</strong>
                          <p>{describeCartItem(item)}</p>
                          {item.notes && <em>{item.notes}</em>}
                        </div>
                        <button className="plainBtn" onClick={() => removeCartItem(item.id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                {errors.cart && <div className="errorText">{errors.cart}</div>}
                <div className="cartTotal">
                  <span>Total</span>
                  <strong>{formatPrice(cartTotal)}</strong>
                </div>

                <div className="paymentBox">
                  {lbl("Payment", "(Zelle required before order is sent)")}
                  <p className="paymentNote">The app cannot verify Zelle automatically. It sends the order after you return and confirm that you paid.</p>
                  <div className="paymentChoices single">
                    <button
                      className={paymentStarted ? "paymentChoice active" : "paymentChoice"}
                      onClick={startZellePayment}
                    >
                      <strong>{paymentStarted ? "Zelle opened" : "Go to Zelle"}</strong>
                      <span>{ZELLE_PAYMENT_URL ? "Open payment link" : DONATION_ZELLE}</span>
                    </button>
                  </div>
                  <div className="paymentLink static">{paymentStarted ? "After paying, tap the checkout button below." : `Send Zelle to ${DONATION_ZELLE}`}</div>
                  {errors.payment && <div className="errorText">{errors.payment}</div>}
                </div>

                <button disabled={busy || cart.length === 0} className="joinBtn" onClick={paymentStarted ? submit : startZellePayment}>{busy ? "Checking out..." : paymentStarted ? "I paid, place order" : "Go to Zelle"}</button>
              </div>
            </>
          )}
        </section>

        <section className="queueCol privateStatusCol">
          <h2>Order Status</h2>
          <p className="sub">This screen only shows your order.</p>

          {!myOrder ? (
            <div className="empty privateEmpty">
              <div>☕</div>
              <p>Place an order and your live status will appear here.</p>
            </div>
          ) : (() => {
            const currentPosition = Math.max(1, Number(myOrder.position || myOrderPosition || 1));
            return (
              <div className={"customerStatusCard " + myOrder.status}>
                <div className="statusHero">
                  <span>{statusEmoji(myOrder.status)}</span>
                  <div>
                    <div className="label gold">Your Order</div>
                    <h3>#{String(currentPosition).padStart(3, "0")}</h3>
                  </div>
                </div>

                <div className="statusBig">{statusLabel(myOrder.status)}</div>

                <div className="customerDrinkSummary">
                  <strong>{myOrder.temp} {myOrder.drink}</strong>
                  <p>{myOrder.milk ? myOrder.milk : "No milk"}{myOrder.syrups ? ` · ${myOrder.syrups}` : ""}</p>
                  {myOrder.notes && <em>"{myOrder.notes}"</em>}
                </div>

                <div className="progressRail">
                  <div className={["waiting","making","ready","complete"].includes(myOrder.status) ? "progressStep done" : "progressStep"}>
                    <span>✓</span>
                    <p>Received</p>
                  </div>
                  <div className={["making","ready","complete"].includes(myOrder.status) ? "progressStep done" : "progressStep"}>
                    <span>{["making","ready","complete"].includes(myOrder.status) ? "✓" : "○"}</span>
                    <p>Making</p>
                  </div>
                  <div className={["ready","complete"].includes(myOrder.status) ? "progressStep done" : "progressStep"}>
                    <span>{["ready","complete"].includes(myOrder.status) ? "✓" : "○"}</span>
                    <p>Ready</p>
                  </div>
                </div>

                {myOrder.status === "waiting" && (
                  <div className="etaBox">
                    <strong>{waitText(currentPosition)}</strong>
                    <span>{ordersAheadText(currentPosition)}</span>
                    <small>Wait times are estimates and may vary.</small>
                  </div>
                )}

                {myOrder.status === "making" && <div className="makingNotice">Your drink is being prepared now.</div>}
                {["ready","complete"].includes(myOrder.status) && <div className="readyNotice">Your drink is ready. Please go to the kitchen.</div>}
                {!["ready","complete"].includes(myOrder.status) && (
                  <div className="notifyBox">
                    <button className="ghostBtn" disabled={pushState.busy || pushState.enabled} onClick={enableReadyNotification}>
                      {pushState.busy ? "Enabling..." : pushState.enabled ? "Notifications enabled" : "Notify me when my order is ready"}
                    </button>
                    {pushDeviceHint && !pushState.enabled && <p className="deviceHint">{pushDeviceHint}</p>}
                    {pushState.message && <p>{pushState.message}</p>}
                  </div>
                )}
                {myOrder.status === "complete" && <button className="ghostBtn" onClick={clearMyTicket}>Place another order</button>}
              </div>
            );
          })()}
        </section>
      </main>
      {showDonation && <DonationModal onClose={() => setShowDonation(false)} />}
      {!showDonation && showReadyAlertPrompt && myOrder && !["ready","complete"].includes(myOrder.status) && !pushState.enabled && (
        <ReadyAlertModal
          busy={pushState.busy}
          message={pushState.message}
          deviceHint={pushDeviceHint}
          onEnable={enableReadyNotification}
          onClose={() => setShowReadyAlertPrompt(false)}
        />
      )}
    </>
  );
}

function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "Guest";
}

function DisplayPage() {
  const [orders, setOrders] = useState([]);
  const [ready, setReady] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [readyPopup, setReadyPopup] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const seenReadyRef = useRef(new Set());
  const initializedRef = useRef(false);
  const popupTimerRef = useRef(null);

  async function refreshDisplay() {
    try {
      const data = await apiGet("display");
      if (!data.ok) return;

      const nextOrders = Array.isArray(data.orders) ? data.orders : [];
      const nextReady = Array.isArray(data.ready) ? data.ready : [];
      setOrders(nextOrders);
      setReady(nextReady);
      if (typeof data.isOpen === "boolean") setIsOpen(Boolean(data.isOpen));

      if (!initializedRef.current) {
        nextReady.forEach(order => seenReadyRef.current.add(order.id));
        initializedRef.current = true;
        return;
      }

      const newReady = nextReady.filter(order => order.id && !seenReadyRef.current.has(order.id));
      if (newReady.length) {
        newReady.forEach(order => seenReadyRef.current.add(order.id));
        if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
        setReadyPopup(newReady[0]);
        popupTimerRef.current = setTimeout(() => setReadyPopup(null), 5000);
      }
    } catch {}
  }

  useEffect(() => {
    refreshDisplay();
    const id = setInterval(refreshDisplay, 3000);
    function updateFullscreenState() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    function handleDisplayKeydown(event) {
      if (event.key?.toLowerCase() !== "f") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tagName = event.target?.tagName?.toLowerCase();
      if (["input", "textarea", "select", "button"].includes(tagName)) return;
      event.preventDefault();
      toggleFullscreen();
    }
    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("keydown", handleDisplayKeydown);
    return () => {
      clearInterval(id);
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      document.removeEventListener("keydown", handleDisplayKeydown);
    };
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      alert("Fullscreen is not available in this browser. Try Add to Home Screen or use the TV/browser fullscreen control.");
    }
  }

  const making = orders.filter(order => order.status === "making");
  const waiting = orders.filter(order => order.status !== "making");
  const boardRows = [...making, ...waiting].slice(0, 14);

  return (
    <main className="displayPage">
      <header className="displayHeader">
        <div>
          <h1>ARISE! COFFEE</h1>
          <p>{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} • Live pickup board</p>
        </div>
        {!isFullscreen && <button className="displayFullscreenBtn" onClick={toggleFullscreen}>Fullscreen</button>}
      </header>

      <section className="displayBoard">
        <div className="displayBoardTitle">
          <span>Order Status</span>
          <strong className={isOpen ? "displayOpen" : "displayClosed"}>{isOpen ? "Open" : "Closed"}</strong>
        </div>
        <div className="displayTable">
          <div className="displayTableHead">
            <span>Status</span>
            <span>Wait Time</span>
            <span>Member Name</span>
            <span>Order</span>
          </div>
          {boardRows.length === 0 ? (
            <div className="displayEmpty">No active coffee orders</div>
          ) : boardRows.map(order => (
            <div className={order.status === "making" ? "displayTableRow making" : "displayTableRow"} key={order.id}>
              <span>{order.status === "making" ? "Being made" : "Waiting"}</span>
              <span>{order.status === "making" ? "Now" : waitText(order.position || 1).replace("Estimated wait: ", "")}</span>
              <strong>{firstName(order.name)}</strong>
              <span>{order.temp} {order.drink}</span>
            </div>
          ))}
        </div>
      </section>

      {ready.length > 0 && (
        <section className="displayReadyStrip">
          <span>Ready for pickup · Go to kitchen</span>
          <strong>{ready.slice(0, 4).map(order => firstName(order.name)).join(" · ")}</strong>
        </section>
      )}

      {readyPopup && (
        <div className="readyDisplayOverlay">
          <div className="readyDisplayCard">
            <span>Ready for pickup · Go to kitchen</span>
            <h2>{firstName(readyPopup.name)}</h2>
            <p>{readyPopup.temp} {readyPopup.drink}</p>
          </div>
        </div>
      )}
    </main>
  );
}

function EmployeeClockPage() {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submitClock() {
    if (pin.trim().length < 4 || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await apiPost({ action: "timeClock", employeePin: pin });
      if (data.ok) {
        setResult(data);
        setPin("");
      } else {
        setError(data.error || "Could not clock in or out");
      }
    } catch {
      setError("Connection error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header isOpen={true} statusText="Time Clock" />
      <main className="pinPage clockPage">
        <section className="modal pinModal static clockCard">
          <h2>Employee Time Clock</h2>
          <p>Enter your personal PIN to clock in or clock out.</p>
          <input
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={event => {
              if (event.key === "Enter") submitClock();
            }}
            inputMode="numeric"
            placeholder="Employee PIN"
          />
          {error && <div className="errorText">{error}</div>}
          <button className="joinBtn" disabled={busy || pin.length < 4} onClick={submitClock}>{busy ? "Checking..." : "Clock In / Out"}</button>
          {result?.ok && (
            <>
              <div className={result.action === "clocked_in" ? "clockResult in" : "clockResult out"}>
                <strong>{result.employee?.name}</strong>
                <span>{result.action === "clocked_in" ? "Clocked in" : "Clocked out"}</span>
                <p>{result.action === "clocked_in" ? formatShiftTime(result.entry?.clockIn) : `${formatHours(result.entry?.hours)} worked`}</p>
              </div>
              <div className="employeeTimesheet">
                <div className="timesheetHead">
                  <strong>Your Timesheet</strong>
                  <span>{formatHours(result.totalHours30Days)} last 30 days</span>
                </div>
                {(result.entries || []).length === 0 ? (
                  <p className="muted">No previous shifts yet.</p>
                ) : result.entries.map(entry => (
                  <div className="employeeShift" key={entry.id}>
                    <span>{formatShiftTime(entry.clockIn)}</span>
                    <span>{formatShiftTime(entry.clockOut)}</span>
                    <strong>{entry.clockOut ? formatHours(entry.hours) : "Open"}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
          <a className="adminMetaLink clockAdminLink" href="/admin">Admin</a>
        </section>
      </main>
    </>
  );
}

function App() {
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith("/clock") || path.startsWith("/timeclock")) return <EmployeeClockPage />;
  if (path.startsWith("/display") || path.startsWith("/tv")) return <DisplayPage />;
  return path.startsWith("/admin") ? <AdminPage /> : <CustomerPage />;
}

createRoot(document.getElementById("root")).render(<App />);
