import { expect, test } from "bun:test";
import worker from "./join.js";

// ce cauti aici ;l

let teamCopy = null;
const env = {
  RESEND_API_KEY: "re_test",
  TURNSTILE_SECRET: "secret",
  RATE_LIMIT: { limit: async () => ({ success: true }) },
  TEAM_EMAIL: { send: async (message) => void (teamCopy = message) },
};

let human = true;
let resendUp = true;
let sent = null;
let sends = 0;
globalThis.fetch = async (url, init) => {
  if (String(url).includes("turnstile"))
    return Response.json({ success: human });
  expect(String(url)).toBe("https://api.resend.com/emails");
  sends++;
  sent = JSON.parse(init.body);
  return resendUp
    ? Response.json({ id: "email_1" })
    : Response.json({ message: "daily quota exceeded" }, { status: 429 });
};

const applicant = {
  Prenume: "Ana-Maria",
  Nume: "Popescu",
  phone: "+40 712 345 678",
  email: "ana@example.com",
  universitate: "UPB, FIIR",
  departament: ["Mechanics", "PR"],
  lang: "ro",
  "cf-turnstile-response": "token",
};

function submit(
  fields,
  { origin = "https://systematicrobotics.ro", withEnv = env } = {},
) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of [value].flat()) body.append(key, v);
  }
  const request = new Request("https://join.example", {
    method: "POST",
    body,
    headers: { Origin: origin },
  });
  return worker.fetch(request, withEnv);
}
// sigur nu e generat cu ai
test("one email to the applicant, one card + Tally link per chosen department", async () => {
  const res = await submit(applicant);
  expect(res.status).toBe(200);
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
    "https://systematicrobotics.ro",
  );
  expect(sends).toBe(1);
  expect(sent.to).toEqual(["ana@example.com"]);
  expect(sent.html).toContain("Ana-Maria");
  expect(sent.html.match(/tally\.so/g)).toHaveLength(2);
  for (const [name, link] of [
    ["Mecanică", "https://tally.so/r/44ZXZr"],
    ["PR", "https://tally.so/r/gDBjPM"],
  ]) {
    expect(sent.html).toContain(name);
    expect(sent.html).toContain(link);
    expect(sent.text).toContain(link);
  }
  const prefill =
    "nume=Ana-Maria%20Popescu&email=ana%40example.com&telefon=%2B40712345678";
  expect(sent.text).toContain(`https://tally.so/r/44ZXZr?${prefill}`);
  expect(sent.html).toContain(
    `https://tally.so/r/44ZXZr?${prefill.replaceAll("&", "&amp;")}`,
  );

  await submit({
    ...applicant,
    departament: "Design",
    lang: "en",
    phone: "0723 456 789",
  });
  expect(sent.text).toContain("telefon=%2B40723456789");
  expect(sent.subject).toBe("Următorul pas în recrutare | sySTEMatic Robotics");
  expect(sent.html).toContain("Aplică acum");
  expect(sent.html).toContain('lang="ro"');
  expect(sent.html.match(/tally\.so/g)).toEqual(["tally.so"]);
  expect(sent.html).toContain("https://tally.so/r/68qJEN");
});

test("team copy goes through Email Routing and never blocks the applicant", async () => {
  teamCopy = null;
  await submit(applicant);
  expect(teamCopy.to).toBe("pr.systematic23@gmail.com");
  expect(teamCopy.replyTo).toBe("ana@example.com");
  expect(teamCopy.subject).toBe(
    "Aplicație nouă: Ana-Maria Popescu (Mecanică, PR)",
  );
  expect(teamCopy.text).toContain("Telefon: +40 712 345 678");
  expect(teamCopy.text).toContain("Universitate: UPB, FIIR");
  expect(teamCopy.text).not.toContain("ATENȚIE");

  const logError = console.error;
  console.error = () => {};
  try {
    resendUp = false;
    teamCopy = null;
    expect((await submit(applicant)).status).toBe(502);
    expect(teamCopy.text).toContain("ATENȚIE");
    resendUp = true;

    const brokenTeam = {
      ...env,
      TEAM_EMAIL: {
        send: async () => {
          throw new Error("E_SENDER_NOT_VERIFIED");
        },
      },
    };
    expect((await submit(applicant, { withEnv: brokenTeam })).status).toBe(200);
    const noBinding = { ...env, TEAM_EMAIL: undefined };
    expect((await submit(applicant, { withEnv: noBinding })).status).toBe(200);
  } finally {
    resendUp = true;
    console.error = logError;
  }
});

test("spam and bad input send nothing", async () => {
  sent = null;
  sends = 0;
  teamCopy = null;
  const limited = {
    ...env,
    RATE_LIMIT: { limit: async () => ({ success: false }) },
  };
  expect((await submit({ ...applicant, website: "x" })).status).toBe(200);
  expect(
    (await submit(applicant, { origin: "https://evil.example" })).status,
  ).toBe(403);
  expect(
    (await submit(applicant, { origin: "http://localhost:5500" })).status,
  ).toBe(403);
  expect((await submit(applicant, { withEnv: limited })).status).toBe(429);
  expect(
    (await submit({ ...applicant, Prenume: "Win http://spam.example" })).status,
  ).toBe(400);
  expect((await submit({ ...applicant, email: "a@x.ro, b@y.ro" })).status).toBe(
    400,
  );
  expect(
    (await submit({ ...applicant, departament: "constructor" })).status,
  ).toBe(400);
  human = false;
  expect((await submit(applicant)).status).toBe(403);
  human = true;
  expect(sends).toBe(0);
  expect(teamCopy).toBeNull();
});
