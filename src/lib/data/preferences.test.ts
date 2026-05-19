import { assertEquals } from "@std/assert";
import {
  loadPreferences,
  savePreferences,
  STORAGE_KEY,
  type StoredPreferences,
} from "./preferences.ts";

function installStubStorage(): { get: (k: string) => string | null; setItems: Record<string, string> } {
  const setItems: Record<string, string> = {};
  const stub = {
    getItem: (k: string) => (k in setItems ? setItems[k] : null),
    setItem: (k: string, v: string) => {
      setItems[k] = v;
    },
    removeItem: (k: string) => {
      delete setItems[k];
    },
    clear: () => {
      for (const k of Object.keys(setItems)) delete setItems[k];
    },
    key: (i: number) => Object.keys(setItems)[i] ?? null,
    get length() {
      return Object.keys(setItems).length;
    },
  };
  // deno-lint-ignore no-explicit-any
  (globalThis as any).localStorage = stub;
  return { get: (k) => stub.getItem(k), setItems };
}

function uninstallStubStorage() {
  // deno-lint-ignore no-explicit-any
  delete (globalThis as any).localStorage;
}

function validPrefs(overrides: Partial<StoredPreferences> = {}): StoredPreferences {
  return {
    version: 1,
    timezone: "America/New_York",
    groupBy: "tag",
    showLegacyTags: false,
    includeProjectTasks: true,
    preset: "90D",
    ...overrides,
  };
}

Deno.test("loadPreferences — returns null when storage empty", () => {
  installStubStorage();
  try {
    assertEquals(loadPreferences(), null);
  } finally {
    uninstallStubStorage();
  }
});

Deno.test("loadPreferences — returns null when JSON is malformed", () => {
  const { setItems } = installStubStorage();
  setItems[STORAGE_KEY] = "{not json";
  try {
    assertEquals(loadPreferences(), null);
  } finally {
    uninstallStubStorage();
  }
});

Deno.test("loadPreferences — returns null when version is not 1", () => {
  const { setItems } = installStubStorage();
  setItems[STORAGE_KEY] = JSON.stringify({ ...validPrefs(), version: 2 });
  try {
    assertEquals(loadPreferences(), null);
  } finally {
    uninstallStubStorage();
  }
});

Deno.test("loadPreferences — returns null when version field missing", () => {
  const { setItems } = installStubStorage();
  setItems[STORAGE_KEY] = JSON.stringify({ timezone: "UTC", groupBy: "tag" });
  try {
    assertEquals(loadPreferences(), null);
  } finally {
    uninstallStubStorage();
  }
});

Deno.test("loadPreferences — round-trips preset-driven payload", () => {
  installStubStorage();
  try {
    const prefs = validPrefs({ preset: "30D", groupBy: "priority" });
    savePreferences(prefs);
    assertEquals(loadPreferences(), prefs);
  } finally {
    uninstallStubStorage();
  }
});

Deno.test("loadPreferences — round-trips slider-drag payload with explicit dates", () => {
  installStubStorage();
  try {
    const prefs = validPrefs({
      preset: null,
      dateStart: "2026-04-01",
      dateEnd: "2026-05-15",
    });
    savePreferences(prefs);
    assertEquals(loadPreferences(), prefs);
  } finally {
    uninstallStubStorage();
  }
});

Deno.test("savePreferences — writes under the expected storage key", () => {
  const { get } = installStubStorage();
  try {
    savePreferences(validPrefs());
    const raw = get(STORAGE_KEY);
    assertEquals(raw !== null, true);
    const parsed = JSON.parse(raw!);
    assertEquals(parsed.version, 1);
    assertEquals(parsed.timezone, "America/New_York");
  } finally {
    uninstallStubStorage();
  }
});

Deno.test("savePreferences — overwrites previous value", () => {
  installStubStorage();
  try {
    savePreferences(validPrefs({ groupBy: "tag" }));
    savePreferences(validPrefs({ groupBy: "project" }));
    assertEquals(loadPreferences()?.groupBy, "project");
  } finally {
    uninstallStubStorage();
  }
});

Deno.test("loadPreferences — no-op without localStorage (SSR safety)", () => {
  // Ensure no stub installed
  uninstallStubStorage();
  assertEquals(loadPreferences(), null);
});

Deno.test("savePreferences — no-op without localStorage (SSR safety)", () => {
  uninstallStubStorage();
  // Should not throw
  savePreferences(validPrefs());
});

Deno.test("loadPreferences — invalid groupBy is rejected", () => {
  const { setItems } = installStubStorage();
  setItems[STORAGE_KEY] = JSON.stringify({
    version: 1,
    timezone: "UTC",
    groupBy: "bogus",
    showLegacyTags: false,
    includeProjectTasks: true,
    preset: null,
  });
  try {
    assertEquals(loadPreferences(), null);
  } finally {
    uninstallStubStorage();
  }
});

Deno.test("loadPreferences — invalid preset label is rejected", () => {
  const { setItems } = installStubStorage();
  setItems[STORAGE_KEY] = JSON.stringify({
    version: 1,
    timezone: "UTC",
    groupBy: "tag",
    showLegacyTags: false,
    includeProjectTasks: true,
    preset: "INVALID",
  });
  try {
    assertEquals(loadPreferences(), null);
  } finally {
    uninstallStubStorage();
  }
});
