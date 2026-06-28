#!/usr/bin/env node
/**
 * Pre-TestFlight / pre-submit production checks.
 * Usage: node scripts/verify-production.mjs [baseUrl]
 */
const PRODUCTION_URL = "https://gusha-api.onrender.com";
const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const resolvedEnvUrl =
  envUrl && !envUrl.includes("manus.space") ? envUrl : null;
const baseUrl = (process.argv[2] || resolvedEnvUrl || PRODUCTION_URL).replace(/\/$/, "");

const checks = [];

async function run() {
  console.log(`\nGusha production verification\nBase URL: ${baseUrl}\n`);

  // 1. Health + database
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    const pass = res.ok && data.database === "ok";
    checks.push({
      name: "API health + database",
      pass,
      detail: JSON.stringify(data),
    });
  } catch (e) {
    checks.push({ name: "API health + database", pass: false, detail: String(e) });
  }

  // 2. Guest auth (required for App Review Get Started flow)
  try {
    const res = await fetch(`${baseUrl}/api/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "22222222-2222-4222-8222-222222222222",
        displayName: "Production Verify",
      }),
    });
    const text = await res.text();
    let pass = res.ok;
    try {
      const json = JSON.parse(text);
      pass = pass && Boolean(json.sessionToken && json.user?.openId);
    } catch {
      pass = false;
    }
    checks.push({
      name: "Guest auth POST /api/auth/guest",
      pass,
      detail: pass ? "session created" : text.slice(0, 200),
    });
  } catch (e) {
    checks.push({ name: "Guest auth POST /api/auth/guest", pass: false, detail: String(e) });
  }

  // 3. Privacy policy
  try {
    const res = await fetch(`${baseUrl}/privacy`);
    const html = await res.text();
    const pass =
      res.ok &&
      html.includes("Gusha") &&
      html.includes("office@tgbc.co.il") &&
      !html.includes("privacy@gusha.app");
    checks.push({
      name: "Privacy policy (/privacy)",
      pass,
      detail: pass ? "updated emails found" : `status ${res.status}`,
    });
  } catch (e) {
    checks.push({ name: "Privacy policy (/privacy)", pass: false, detail: String(e) });
  }

  // 4. Terms of service
  try {
    const res = await fetch(`${baseUrl}/terms`);
    const html = await res.text();
    const pass =
      res.ok &&
      html.includes("Terms of Service") &&
      html.includes("office@tgbc.co.il");
    checks.push({
      name: "Terms of service (/terms)",
      pass,
      detail: pass ? "updated emails found" : `status ${res.status}`,
    });
  } catch (e) {
    checks.push({ name: "Terms of service (/terms)", pass: false, detail: String(e) });
  }

  // 5. Delete account page
  try {
    const res = await fetch(`${baseUrl}/delete-account`);
    const html = await res.text();
    const pass = res.ok && !html.includes("Subscription information");
    checks.push({
      name: "Delete account page",
      pass,
      detail: pass ? "status 200, no subscription text" : `status ${res.status}`,
    });
  } catch (e) {
    checks.push({ name: "Delete account page", pass: false, detail: String(e) });
  }

  // 6. Support page (App Store Support URL)
  try {
    const res = await fetch(`${baseUrl}/support`);
    const html = await res.text();
    const pass =
      res.ok &&
      html.includes("Support") &&
      html.includes("office@tgbc.co.il") &&
      html.includes("no in-app purchases");
    checks.push({
      name: "Support page (/support)",
      pass,
      detail: pass ? "support contact + review hints" : `status ${res.status}`,
    });
  } catch (e) {
    checks.push({ name: "Support page (/support)", pass: false, detail: String(e) });
  }

  let failed = 0;
  for (const c of checks) {
    const icon = c.pass ? "PASS" : "FAIL";
    if (!c.pass) failed++;
    console.log(`${icon}  ${c.name}`);
    console.log(`      ${c.detail}\n`);
  }

  console.log(failed === 0 ? "All checks passed.\n" : `${failed} check(s) failed — fix before TestFlight review.\n`);
  process.exit(failed === 0 ? 0 : 1);
}

run();
