let cachedKey: string | null = null;

export async function getNotionApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  // Try environment variable first (for deployment)
  const envKey = Deno.env.get("NOTION_API_KEY");
  if (envKey) {
    cachedKey = envKey;
    return envKey;
  }

  // Fall back to 1Password CLI
  const cmd = new Deno.Command("op", {
    args: [
      "item",
      "get",
      "Stacked Task Chart Notion Internal Integration Secret",
      "--fields",
      "credential",
      "--reveal",
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const result = await cmd.output();

  if (!result.success) {
    const stderr = new TextDecoder().decode(result.stderr);
    throw new Error(`1Password CLI failed: ${stderr}`);
  }

  cachedKey = new TextDecoder().decode(result.stdout).trim();
  return cachedKey;
}
