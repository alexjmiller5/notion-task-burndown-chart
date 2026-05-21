import { assertEquals } from "@std/assert";
import { getCachePath } from "./cache.ts";

Deno.test("getCachePath defaults to ./notion-cache.json when env unset", () => {
  Deno.env.delete("BURNDOWN_CACHE_PATH");
  assertEquals(getCachePath(), "./notion-cache.json");
});

Deno.test("getCachePath honors BURNDOWN_CACHE_PATH env var", () => {
  Deno.env.set("BURNDOWN_CACHE_PATH", "/var/lib/burndown/notion-cache.json");
  try {
    assertEquals(getCachePath(), "/var/lib/burndown/notion-cache.json");
  } finally {
    Deno.env.delete("BURNDOWN_CACHE_PATH");
  }
});
