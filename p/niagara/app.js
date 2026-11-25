const CONFIG = {
  seatsInVan: 7,
  bookedBase: 2,
  groupShown: 3,
  email: "uppercanadaexpress@gmail.com",
  formAction: "https://formsubmit.co/uppercanadaexpress@gmail.com",
  subject: "SaveOnCab — website enquiry",
  bands: [
    { min: 7, fare: 34.9 },
    { min: 5, fare: 39.9 },
    { min: 3, fare: 49.9 }
  ]
};

const PICKUPS = {
  niagara: { time: "06:45", label: "Niagara Falls — downtown" },
  stcath: { time: "07:05", label: "St. Catharines — Fairview Mall" }
};

const $ = (id) => document.getElementById(id);

const routeEl = $("route");
const dateEl = $("date");
const seatsEl = $("seats");
const bookedEl = $("booked");
const fareEl = $("fare");
const hintEl = $("fareHint");
const labelEl = $("departureLabel");

function money(value) {
  return "$" + value.toFixed(2);
}

function fareFor(total) {
  const band = CONFIG.bands.find((b) => total >= b.min);
  return band ? band.fare : CONFIG.bands[CONFIG.bands.length - 1].fare;
}

function isoDate(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function fillDates() {
  const options = [];
  const day = new Date();
  for (let i = 1; i <= 7 && options.length < 3; i++) {
    const d = new Date(day.getTime() + i * 86400000);
    const weekday = d.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    options.push(`<option value="${isoDate(d)}">${label}</option>`);
  }
  dateEl.innerHTML = options.join("");
}

function render() {
  const pickup = PICKUPS[routeEl.value];
  const seats = Number(seatsEl.value) || 1;
  const total = CONFIG.bookedBase + seats;
  const shown = Math.min(total, CONFIG.groupShown);
  const fare = fareFor(CONFIG.groupShown);

  bookedEl.textContent = shown;
  fareEl.textContent = money(fare);

  const chosen = dateEl.options[dateEl.selectedIndex];
  const day = chosen ? chosen.textContent : "";
  labelEl.textContent = day ? day + " · " + pickup.time : pickup.time;

  hintEl.textContent = total > CONFIG.groupShown
    ? "More than three want in. At 18:45 we finalise the vans — everyone rides, and no one pays more than this."
    : "At 18:45 we finalise the vans. If more people join, you pay less — never more.";
  hintEl.classList.remove("hint--warn");
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function setStatus(form, text, ok) {
  const el = form.querySelector("[data-status]");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("status--ok", "status--err");
  el.classList.add(ok ? "status--ok" : "status--err");
}

function ensureFrame() {
  let frame = $("sendFrame");
  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = "sendFrame";
    frame.name = "sendFrame";
    frame.style.display = "none";
    frame.setAttribute("aria-hidden", "true");
    document.body.appendChild(frame);
  }
  return frame;
}

function postPayload(payload) {
  ensureFrame();
  const form = document.createElement("form");
  form.action = CONFIG.formAction;
  form.method = "POST";
  form.target = "sendFrame";
  form.style.display = "none";

  const data = Object.assign({}, payload, {
    _subject: CONFIG.subject,
    _captcha: "false",
    _template: "table"
  });

  Object.entries(data).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => form.remove(), 5000);
}

function submitForm(form, payload) {
  if (!CONFIG.formAction) {
    setStatus(form, "Demo mode: the form is not connected to an inbox yet.", false);
    return;
  }
  postPayload(payload);
  form.reset();
  if (form.id === "book") {
    fillDates();
    render();
  }
  setStatus(form, "Thanks — your message is on its way. We will reply to your email.", true);
}

function wireBooking() {
  const form = $("book");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = form.querySelector('[name="email"]');
    const phone = form.querySelector('[name="phone"]');
    if (!email.value.trim()) {
      setStatus(form, "We need an email to confirm your seat.", false);
      email.focus();
      return;
    }
    if (!validEmail(email.value)) {
      setStatus(form, "That email does not look right.", false);
      email.focus();
      return;
    }
    const pickup = PICKUPS[routeEl.value];
    const seats = Number(seatsEl.value) || 1;
    submitForm(form, {
      type: "booking",
      pickup: pickup.label,
      date: dateEl.value,
      time: pickup.time,
      seats: seats,
      email: email.value.trim(),
      phone: phone.value.trim(),
      fare: fareFor(CONFIG.groupShown),
      passengers: CONFIG.bookedBase + seats
    });
  });
}

function wireForms() {
  document.querySelectorAll("form[data-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const missing = [...form.querySelectorAll("[required]")].some((field) => !field.value.trim());
      if (missing) {
        setStatus(form, "Fill in the required fields, please.", false);
        return;
      }
      const email = form.querySelector('input[type="email"]');
      if (email && !validEmail(email.value)) {
        setStatus(form, "That email does not look right.", false);
        return;
      }

      const values = Object.fromEntries(new FormData(form).entries());
      submitForm(form, { type: form.dataset.form, ...values });
    });
  });
}

fillDates();
[routeEl, dateEl, seatsEl].forEach((el) => el.addEventListener("change", render));
wireBooking();
wireForms();
render();
