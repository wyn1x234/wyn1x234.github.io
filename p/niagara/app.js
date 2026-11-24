const CONFIG = {
  seatsInVan: 7,
  bookedBase: 4,
  endpoint: "",
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
const barEl = $("bar");
const fareEl = $("fare");
const hintEl = $("fareHint");
const labelEl = $("departureLabel");
const mobileFareEl = $("mobileFare");

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
  const fare = fareFor(total);

  bookedEl.textContent = total;
  barEl.style.width = Math.min(100, (total / CONFIG.seatsInVan) * 100) + "%";
  fareEl.textContent = money(fare);
  if (mobileFareEl) mobileFareEl.textContent = money(fare);

  const chosen = dateEl.options[dateEl.selectedIndex];
  const day = chosen ? chosen.textContent : "";
  labelEl.textContent = day ? day + " · " + pickup.time : pickup.time;

  if (total >= CONFIG.seatsInVan) {
    hintEl.textContent = "The van is full. Your cap still holds — more cars are added as demand grows.";
    hintEl.classList.add("hint--warn");
  } else {
    hintEl.textContent = "This is your cap. More passengers can only lower it.";
    hintEl.classList.remove("hint--warn");
  }
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

async function submitForm(form, payload) {
  if (!CONFIG.endpoint) {
    setStatus(form, "Demo mode: the form is not connected to an inbox yet.", false);
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const res = await fetch(CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Request failed");
    form.reset();
    if (form.id === "book") {
      fillDates();
      render();
    }
    setStatus(form, "Thanks — we have it. Check your inbox for a confirmation.", true);
  } catch (err) {
    setStatus(form, "Something went wrong. Please try again in a minute.", false);
  } finally {
    button.disabled = false;
  }
}

function wireBooking() {
  const form = $("book");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const pickup = PICKUPS[routeEl.value];
    const seats = Number(seatsEl.value) || 1;
    const total = CONFIG.bookedBase + seats;
    submitForm(form, {
      type: "booking",
      pickup: pickup.label,
      date: dateEl.value,
      time: pickup.time,
      seats: seats,
      fare: fareFor(total),
      cap: fareFor(total),
      passengers: total
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
