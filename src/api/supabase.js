import { supabase } from "../supabaseClient";

function normalizeResponse(data, fallback = {}) {
  if (!data) return fallback;
  return typeof data === "object" ? data : fallback;
}

function errorMessage(error) {
  return error?.message || error?.details || error?.hint || "Connection error";
}

async function callRpc(name, args = {}, fallback = { ok: false, error: "Connection error" }) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return normalizeResponse(data, fallback);
}

export async function apiGet(action, params = {}) {
  if (action === "status" || !action) return getStatus();
  if (action === "orders") return getOrders();
  if (action === "order") return getOrder(params.id);
  if (action === "inventory") return getInventory();
  if (action === "menu") return getMenu(params.pin);
  if (action === "display") return getDisplay();

  return { ok: false, error: "Unknown action" };
}

export async function apiPost(payload) {
  if (payload.action === "login") return login(payload.pin);
  if (payload.action === "admin") {
    const { action, pin, ...adminPayload } = payload;
    return updateAdmin(pin, adminPayload);
  }
  if (payload.action === "order") {
    const { action, ...order } = payload;
    return placeOrder(order);
  }
  if (payload.action === "updateStatus") return updateStatus(payload.pin, payload.id, payload.status);
  if (payload.action === "setInventory") return updateInventory(payload.pin, payload.item, payload.available);
  if (payload.action === "clearCompleted") return clearCompleted(payload.pin);
  if (payload.action === "clearAll") return clearAll(payload.pin);
  if (payload.action === "archive") return getArchive(payload.pin);
  if (payload.action === "clearArchive") return clearArchive(payload.pin);
  if (payload.action === "analytics") return getAnalytics(payload.pin, payload.weekOffset);
  if (payload.action === "timeClock") return timeClock(payload.employeePin);
  if (payload.action === "timeClockAdmin") return getTimeClockAdmin(payload.pin);
  if (payload.action === "saveEmployee") return saveEmployee(payload.pin, payload.employee);
  if (payload.action === "toggleEmployee") return toggleEmployee(payload.pin, payload.employeeId, payload.active);
  if (payload.action === "saveMenu") return saveMenu(payload.pin, {
    drinks: payload.drinks,
    milks: payload.milks,
    syrups: payload.syrups,
  });

  return { ok: false, error: "Unknown action" };
}

export async function timeClock(employeePin) {
  try {
    return await callRpc("arise_time_clock", { input_employee_pin: String(employeePin || "") });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function getTimeClockAdmin(pin) {
  try {
    return await callRpc("arise_time_clock_admin", { input_pin: String(pin || "") });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function saveEmployee(pin, employee) {
  try {
    return await callRpc("arise_save_employee", {
      input_pin: String(pin || ""),
      input_employee: employee || {},
    });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function toggleEmployee(pin, employeeId, active) {
  try {
    return await callRpc("arise_toggle_employee", {
      input_pin: String(pin || ""),
      input_employee_id: employeeId ? String(employeeId) : null,
      input_active: active !== false,
    });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function login(pin) {
  try {
    return await callRpc("arise_login", { input_pin: String(pin || "") });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function getStatus() {
  try {
    return await callRpc("arise_status");
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function getOrders() {
  try {
    return await callRpc("arise_orders");
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function getDisplay() {
  try {
    return await callRpc("arise_display");
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function getOrder(id) {
  try {
    return await callRpc("arise_order", { order_id: id ? String(id) : null });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function getInventory() {
  try {
    return await callRpc("arise_inventory");
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function getMenu(pin = null) {
  try {
    return await callRpc("arise_menu", { input_pin: pin ? String(pin) : null });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function updateAdmin(pin, payload) {
  try {
    return await callRpc("arise_update_admin", {
      input_pin: String(pin || ""),
      input_is_open: typeof payload.isOpen === "boolean" ? payload.isOpen : null,
      input_message: typeof payload.message === "string" ? payload.message : null,
    });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function placeOrder(order) {
  try {
    return await callRpc("arise_place_order", {
      input_order: {
        name: order.name || "",
        drink: order.drink || "",
        temp: order.temp || "",
        milk: order.milk || "",
        syrups: Array.isArray(order.syrups) ? order.syrups : [],
        notes: order.notes || "",
      },
    });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function updateStatus(pin, id, status) {
  try {
    return await callRpc("arise_update_status", {
      input_pin: String(pin || ""),
      order_id: String(id || ""),
      input_status: status,
    });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function updateInventory(pin, item, available) {
  try {
    return await callRpc("arise_update_inventory", {
      input_pin: String(pin || ""),
      input_item: item,
      input_available: available,
    });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function clearCompleted(pin) {
  try {
    return await callRpc("arise_clear_completed", { input_pin: String(pin || "") });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function clearAll(pin) {
  try {
    return await callRpc("arise_clear_all", { input_pin: String(pin || "") });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function getArchive(pin) {
  try {
    return await callRpc("arise_archive", { input_pin: String(pin || ""), input_limit: 25 });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function clearArchive(pin) {
  try {
    return await callRpc("arise_clear_archive", { input_pin: String(pin || "") });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function getAnalytics(pin, weekOffset = 0) {
  try {
    return await callRpc("arise_analytics", {
      input_pin: String(pin || ""),
      input_week_offset: Number.isFinite(Number(weekOffset)) ? Number(weekOffset) : 0,
    });
  } catch {
    return { ok: false, error: "Connection error" };
  }
}

export async function saveMenu(pin, menu) {
  try {
    return await callRpc("arise_save_menu", {
      input_pin: String(pin || ""),
      input_drinks: Array.isArray(menu?.drinks) ? menu.drinks : [],
      input_milks: Array.isArray(menu?.milks) ? menu.milks : [],
      input_syrups: Array.isArray(menu?.syrups) ? menu.syrups : [],
    });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
