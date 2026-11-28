const CONFIG = {
  seatsInVan: 7,
  bookedBase: 2,
  groupShown: 3,
  email: "uppercanadaexpress@gmail.com",
  formAction: "https://formsubmit.co/uppercanadaexpress@gmail.com",
  subject: "SaveOnCab — website enquiry"
};

const ROUTES = {
  burlington: {
    label: "Niagara Falls — Burlington GO",
    departure: "6:45 AM",
    pickup: "Niagara Falls 6:45 AM · St. Catharines 7:05 AM",
    fares: { 7: 34.9, 6: 39.9, 5: 49.9, 4: 49.9, 3: 59.9 }
  },
  welland: {
    label: "Niagara Falls — Niagara College, Welland",
    departure: "7:30 AM",
    pickup: "Niagara Falls 7:30 AM",
    fares: { 7: 9.5, 6: 11, 5: 13, 4: 16, 3: 22 }
  },
  brock: {
    label: "Niagara Falls — Brock University, Thorold",
    departure: "7:30 AM",
    pickup: "Niagara Falls 7:30 AM",
    fares: { 7: 8, 6: 10, 5: 11, 4: 12.5, 3: 17 }
  },
  stoney: {
    label: "Niagara Falls — Confederation GO, Stoney Creek",
    departure: "7:30 AM",
    pickup: "Niagara Falls 7:30 AM",
    fares: { 7: 19.5, 6: 23, 5: 27.5, 4: 34, 3: 45 }
  }
};

const $ = (id) => document.getElementById(id);

const routeEl = $("route");
const dateEl = $("date");
const seatsEl = $("seats");
const bookedEl = $("booked");
const fareEl = $("fare");
const hintEl = $("fareHint");
const totalEl = $("totalHint");
const labelEl = $("departureLabel");

function money(value) {
  return "$" + value.toFixed(2);
}

function fareFor(total, routeKey) {
  const fares = ROUTES[routeKey].fares;
  const key = Math.min(CONFIG.seatsInVan, Math.max(3, total));
  return fares[key];
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
  const route = ROUTES[routeEl.value];
  const seats = Number(seatsEl.value) || 1;
  const total = CONFIG.bookedBase + seats;
  const shown = Math.min(total, CONFIG.groupShown);
  const fare = fareFor(CONFIG.groupShown, routeEl.value);

  bookedEl.textContent = shown;
  fareEl.textContent = money(fare);
  totalEl.textContent = "Total for " + seats + (seats === 1 ? " seat: " : " seats: ") + money(fare * seats) + ".";

  const chosen = dateEl.options[dateEl.selectedIndex];
  const day = chosen ? chosen.textContent : "";
  labelEl.textContent = day ? day + " · " + route.departure : route.departure;

  hintEl.textContent = total > CONFIG.groupShown
    ? "More than three want in. At 6:45 PM we finalise the groups — everyone rides, and no one pays more than this."
    : "At 6:45 PM we finalise the groups. If more people join, your fare goes down — it never goes up.";
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
    const route = ROUTES[routeEl.value];
    const seats = Number(seatsEl.value) || 1;
    submitForm(form, {
      type: "booking",
      route: route.label,
      pickup: route.pickup,
      date: dateEl.value,
      time: route.departure,
      seats: seats,
      email: email.value.trim(),
      phone: phone.value.trim(),
      fare: fareFor(CONFIG.groupShown, routeEl.value),
      passengers: CONFIG.bookedBase + seats
    });
  });
}

function wireCalc() {
  const pickup = $("calcPickup");
  const seats = $("calcSeats");
  const fareOut = $("calcFare");
  const totalOut = $("calcTotal");
  const timeOut = $("calcTime");
  if (!pickup) return;

  const update = () => {
    const count = Number(seats.value) || 1;
    const fare = fareFor(CONFIG.bookedBase + count, pickup.value);
    fareOut.textContent = money(fare);
    totalOut.textContent = money(fare * count);
    timeOut.textContent = ROUTES[pickup.value].departure;
  };

  [pickup, seats].forEach((el) => el.addEventListener("change", update));
  update();
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
wireCalc();
render();
