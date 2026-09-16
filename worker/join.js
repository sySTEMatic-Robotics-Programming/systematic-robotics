// folositi bun better than node !!!
// deploy:
// bunx wrangler deploy
// Secrets:
// bunx wrangler secret put RESEND_API_KEY
// bunx wrangler secret put TURNSTILE_SECRET
// test:
//  bun test

const SITE = "https://systematicrobotics.ro";
const TEAM = "pr.systematic23@gmail.com";
const SENDER = {
  name: "sySTEMatic Robotics",
  email: "recrutare@systematicrobotics.ro",
};

const DEPARTMENTS = {
  Mechanics: {
    form: "https://tally.so/r/44ZXZr",
    name: "Mecanică",
    about: "Proiectăm și construim roboții, piesă cu piesă.",
  },
  Programming: {
    form: "https://tally.so/r/aQWNRZ",
    name: "Programare",
    about: "Scriem codul care îi face pe roboți să gândească și să se miște.",
  },
  "CAD / CAE": {
    form: "https://tally.so/r/ODR1NM",
    name: "CAD / CAE",
    about: "Modelăm și simulăm fiecare piesă înainte să ajungă în atelier.",
  },
  PR: {
    form: "https://tally.so/r/gDBjPM",
    name: "PR",
    about: "Spunem povestea echipei și aducem parteneri alături de noi.",
  },
  Design: {
    form: "https://tally.so/r/68qJEN",
    name: "Design",
    about: "Creăm identitatea vizuală a echipei.",
  },
};

const COPY = {
  subject: "Următorul pas în recrutare | sySTEMatic Robotics",
  hi: "Salut",
  thanks: "Mulțumim că dorești să faci parte din echipa noastră!",
  next: (many) =>
    `Pasul următor: completează formularul de recrutare pentru ${many ? "fiecare departament ales" : "departamentul ales"}.`,
  button: "Aplică acum",
  bye: "Ne vedem curând,",
  team: "Echipa sySTEMatic Robotics",
};

const NAME = /^[\p{L}\p{M} '’-]{1,40}$/u;
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const PHONE = /^\+?[\d ().\/-]{6,20}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    if (request.method !== "POST" || origin !== SITE) {
      return new Response("Forbidden", { status: 403 });
    }
    const reply = (status) =>
      Response.json(
        { ok: status === 200 },
        { status, headers: { "Access-Control-Allow-Origin": origin } },
      );

    const ip = request.headers.get("CF-Connecting-IP") ?? "";
    if (!(await env.RATE_LIMIT.limit({ key: ip })).success) return reply(429);

    const form = await request.formData().catch(() => null);
    if (!form) return reply(400);
    if (form.get("website")) return reply(200);

    const app = parse(form);
    if (!app) return reply(400);
    if (
      !(await isHuman(
        form.get("cf-turnstile-response"),
        ip,
        env.TURNSTILE_SECRET,
      ))
    ) {
      return reply(403);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(email(app)),
    });
    if (!res.ok) console.error("Resend", res.status, await res.text());

    try {
      await env.TEAM_EMAIL.send(teamCopy(app, res.ok));
    } catch (err) {
      console.error("Team copy", err);
    }
    return reply(res.ok ? 200 : 502);
  },
};

function parse(form) {
  const get = (key) => String(form.get(key) ?? "").trim();
  const app = {
    first: get("Prenume"),
    last: get("Nume"),
    phone: get("phone"),
    email: get("email"),
    uni: get("universitate"),
    depts: [...new Set(form.getAll("departament"))],
    lang: form.get("lang") === "en" ? "en" : "ro",
  };
  const valid =
    NAME.test(app.first) &&
    NAME.test(app.last) &&
    PHONE.test(app.phone) &&
    app.email.length <= 254 &&
    EMAIL.test(app.email) &&
    app.uni.length >= 2 &&
    app.uni.length <= 120 &&
    app.depts.length > 0 &&
    app.depts.every((d) => Object.hasOwn(DEPARTMENTS, d));
  return valid ? app : null;
}

// "0712 345 678" -> "+40712345678": Tally's phone number block pre-fills reliably in this format.
function international(phone) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+40${digits.slice(1)}`;
  return digits;
}

async function isHuman(token, ip, secret) {
  if (!token || !secret) return false;
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    },
  );
  return (await res.json()).success === true;
}

const DARK = "#0e021f";
const CARD = "#1b0a36";
const PURPLE = "#9143ff";
const YELLOW = "#f2f522";
const GREY = "#d1d5db";
const FONT = "'Chakra Petch',Arial,Helvetica,sans-serif";
const TITLE_FONT = "Magz,'Arial Black',Arial,sans-serif";
const SOCIAL = {
  Instagram: "https://www.instagram.com/systematic_robotics/",
  TikTok: "https://www.tiktok.com/@systematic_robotics",
  LinkedIn: "https://www.linkedin.com/company/systematic-robotics/",
  Facebook: "https://www.facebook.com/profile.php?id=61553168963681",
};

function email(app) {
  const t = COPY;
  // Tally hidden fields "nume", "email", "telefon" pre-fill the form with the applicant's data.
  const query = new URLSearchParams({
    nume: `${app.first} ${app.last}`,
    email: app.email,
    telefon: international(app.phone),
  })
    .toString()
    .replaceAll("+", "%20");
  const departments = app.depts.map((key) => ({
    ...DEPARTMENTS[key],
    form: `${DEPARTMENTS[key].form}?${query}`,
  }));

  const cards = departments
    .map(
      (d) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:${CARD};border:2px solid ${PURPLE};border-radius:16px">
  <tr><td style="padding:20px 22px;font-family:${FONT};text-align:left">
    <p style="margin:0 0 4px;font-size:20px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${YELLOW}">${d.name}</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:${GREY}">${d.about}</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td bgcolor="${YELLOW}" style="border-radius:24px"><a href="${d.form.replaceAll("&", "&amp;")}" style="display:inline-block;padding:12px 26px;font-family:${FONT};font-size:14px;font-weight:bold;text-transform:uppercase;color:#000000;text-decoration:none">${t.button} &rarr;</a></td>
    </tr></table>
  </td></tr>
</table>`,
    )
    .join("");

  const socials = Object.entries(SOCIAL)
    .map(
      ([label, url]) =>
        `<a href="${url}" style="color:#ffffff;text-decoration:none">${label}</a>`,
    )
    .join(" &middot; ");

  const html = `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<style>
@font-face{font-family:'Chakra Petch';font-weight:400;src:url(${SITE}/font-family/chakra/chakra-400-latin.woff2) format('woff2')}
@font-face{font-family:'Chakra Petch';font-weight:700;src:url(${SITE}/font-family/chakra/chakra-700-latin.woff2) format('woff2')}
@font-face{font-family:'Magz';src:url(${SITE}/font-family/Magz.otf) format('opentype')}
</style>
</head>
<body style="margin:0;padding:0;background:${DARK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${DARK}" style="background:${DARK}">
<tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:2px solid ${PURPLE};border-radius:24px">
    <tr><td style="padding:32px 24px;font-family:${FONT};font-size:16px;line-height:1.6;color:#ffffff;text-align:center">
      <img src="${SITE}/poze/email-logo.png" width="120" height="120" alt="sySTEMatic Robotics" style="display:block;margin:0 auto 20px;border:0">
      <h1 style="margin:0 0 12px;font-family:${TITLE_FONT};font-size:30px;line-height:1.2;font-weight:normal;font-style:italic;text-transform:uppercase;color:#ffffff">${t.hi}, <span style="color:${YELLOW}">${app.first}</span>!</h1>
      <p style="margin:0 0 8px">${t.thanks}</p>
      <p style="margin:0 0 24px;color:${GREY}">${t.next(departments.length > 1)}</p>
      ${cards}
      <p style="margin:24px 0 0">${t.bye}<br><b style="color:${YELLOW}">${t.team}</b></p>
    </td></tr>
  </table>
  <p style="margin:20px 0 0;font-family:${FONT};font-size:13px;line-height:1.8;color:#ffffff">
    <a href="${SITE}" style="color:${YELLOW};text-decoration:none">systematicrobotics.ro</a> &middot; ${socials}
  </p>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `${t.hi}, ${app.first}!`,
    t.thanks,
    t.next(departments.length > 1),
    ...departments.map((d) => `${d.name.toUpperCase()}: ${d.about}\n${d.form}`),
    `${t.bye}\n${t.team}\n${SITE}`,
  ].join("\n\n");

  return {
    from: `${SENDER.name} <${SENDER.email}>`,
    to: [app.email],
    reply_to: TEAM,
    subject: t.subject,
    html,
    text,
  };
}

function teamCopy(app, applicantEmailed) {
  const depts = app.depts.map((key) => DEPARTMENTS[key].name).join(", ");
  return {
    from: SENDER,
    to: TEAM,
    replyTo: app.email,
    subject: `Aplicație nouă: ${app.first} ${app.last} (${depts})`,
    text: [
      applicantEmailed
        ? ""
        : "ATENȚIE: e-mailul cu formularele NU a ajuns la candidat (eroare Resend, poate limita zilnică). Trimite-i linkurile manual.\n",
      `Nume: ${app.first} ${app.last}`,
      `Email: ${app.email}`,
      `Telefon: ${app.phone}`,
      `Universitate: ${app.uni}`,
      `Departamente: ${depts}`,
      `Pagina: ${app.lang}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
