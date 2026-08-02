// Replace this with the /exec URL from your deployed Apps Script web app.
const API_URL = "https://script.google.com/macros/s/AKfycbw9goQhWUVbKE4a6TlF1GsP6pUeGaHzMgQtr8JQKQ3uka4UIlyFhKxLl7hqd7u4wcAu/exec";

const lookupSection = document.querySelector("#lookupSection");
const lookupButton = document.querySelector("#lookupButton");
const partyCodeInput = document.querySelector("#partyCode");
const form = document.querySelector("#rsvpForm");
const partyName = document.querySelector("#partyName");
const guestFields = document.querySelector("#guestFields");
const contactEmail = document.querySelector("#contactEmail");
const message = document.querySelector("#message");
const submitButton = document.querySelector("#submitButton");
const status = document.querySelector("#status");

let currentParty = null;

function setStatus(text, isError = false) {
  status.textContent = text;
  status.className = isError ? "error" : "success";
}

function requireConfiguredApi() {
  if (!API_URL.startsWith("https://script.google.com/macros/s/")) {
    throw new Error("Add your Apps Script /exec URL to rsvp.js first.");
  }
}

async function parseApiResponse(response) {
  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch (_error) {
    throw new Error("The RSVP service returned an unexpected response. Check the Apps Script deployment permissions and URL.");
  }

  if (!response.ok) {
    throw new Error(data.error || `The RSVP service returned HTTP ${response.status}.`);
  }
  return data;
}

async function lookupParty() {
  try {
    requireConfiguredApi();
    const code = partyCodeInput.value.trim().toUpperCase();
    if (!code) throw new Error("Enter your invitation code.");

    lookupButton.disabled = true;
    setStatus("Looking up your invitation…");

    const url = new URL(API_URL);
    url.searchParams.set("action", "lookup");
    url.searchParams.set("code", code);

    const response = await fetch(url);
    const data = await parseApiResponse(response);
    if (!data.ok) throw new Error(data.error || "Invitation not found.");

    currentParty = data.party;
    renderParty(currentParty);
    setStatus("");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    lookupButton.disabled = false;
  }
}

function renderParty(party) {
  partyName.textContent = party.displayName;
  guestFields.replaceChildren();
  contactEmail.value = party.contactEmail || "";
  message.value = party.message || "";

  if (party.needsGuestSetup) {
    renderGuestSetup(party.maxGuests || 6);
  } else {
    for (const guest of party.guests) {
      guestFields.append(createGuestFieldset(guest));
    }
  }

  lookupSection.hidden = true;
  form.hidden = false;
}

function renderGuestSetup(maxGuests) {
  const setup = document.createElement("div");
  setup.className = "guest-setup";

  const label = document.createElement("label");
  label.setAttribute("for", "guestCount");
  label.textContent = "How many people are included in this invitation?";

  const select = document.createElement("select");
  select.id = "guestCount";
  select.required = true;
  select.innerHTML = '<option value="">Choose…</option>';

  for (let count = 1; count <= maxGuests; count += 1) {
    const option = document.createElement("option");
    option.value = String(count);
    option.textContent = String(count);
    select.append(option);
  }

  const generatedFields = document.createElement("div");
  generatedFields.id = "newGuestFields";

  select.addEventListener("change", () => {
    generatedFields.replaceChildren();
    const count = Number(select.value);
    for (let i = 1; i <= count; i += 1) {
      generatedFields.append(createGuestFieldset({ isNew: true, number: i }));
    }
  });

  setup.append(label, select, generatedFields);
  guestFields.append(setup);
}

function createGuestFieldset(guest) {
  const fieldset = document.createElement("fieldset");
  if (guest.guestId) fieldset.dataset.guestId = guest.guestId;
  if (guest.isNew) fieldset.dataset.newGuest = "true";

  const legend = document.createElement("legend");
  legend.textContent = guest.isNew ? `Guest ${guest.number}` : guest.name;
  fieldset.append(legend);

  if (guest.isNew) {
    const nameLabel = document.createElement("label");
    nameLabel.innerHTML = `
      <span>Guest name</span>
      <input class="guest-name" maxlength="100" autocomplete="name" required>
    `;
    fieldset.append(nameLabel);
  }

  fieldset.insertAdjacentHTML("beforeend", `
    <label>
      <span>Attendance</span>
      <select class="attendance" required>
        <option value="">Choose…</option>
        <option value="yes">Joyfully accepts</option>
        <option value="no">Regretfully declines</option>
      </select>
    </label>
    <label>
      <span>Meal choice</span>
      <select class="meal">
        <option value="">Not selected</option>
        <option value="chicken">Chicken</option>
        <option value="vegetarian">Vegetarian</option>
        <option value="kids">Kids meal</option>
      </select>
    </label>
    <label>
      <span>Dietary notes</span>
      <input class="dietary" maxlength="200">
    </label>
  `);

  fieldset.querySelector(".attendance").value = guest.attending || "";
  fieldset.querySelector(".meal").value = guest.meal || "";
  fieldset.querySelector(".dietary").value = guest.dietaryNotes || "";

  return fieldset;
}

function collectResponses() {
  return [...guestFields.querySelectorAll("fieldset")].map((fieldset) => ({
    guestId: fieldset.dataset.guestId || "",
    guestName: fieldset.querySelector(".guest-name")?.value.trim() || "",
    attending: fieldset.querySelector(".attendance").value,
    meal: fieldset.querySelector(".meal").value,
    dietaryNotes: fieldset.querySelector(".dietary").value.trim()
  }));
}

async function submitRsvp(event) {
  event.preventDefault();

  try {
    requireConfiguredApi();
    if (!currentParty) throw new Error("Look up an invitation first.");

    const responses = collectResponses();
    if (!responses.length) {
      throw new Error("Choose how many guests are included in this invitation.");
    }
    if (responses.some((item) => !item.attending)) {
      throw new Error("Choose an attendance response for every guest.");
    }
    if (currentParty.needsGuestSetup && responses.some((item) => !item.guestName)) {
      throw new Error("Enter a name for every guest.");
    }

    submitButton.disabled = true;
    setStatus("Saving your RSVP…");

    // text/plain keeps this a "simple" cross-origin request and avoids
    // an OPTIONS preflight that Apps Script web apps do not handle directly.
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "submit",
        code: currentParty.code,
        contactEmail: contactEmail.value.trim(),
        message: message.value.trim(),
        responses
      })
    });

    const data = await parseApiResponse(response);
    if (!data.ok) throw new Error(data.error || "The RSVP could not be saved.");

    form.innerHTML = `
      <h2>Thank you</h2>
      <p>Your RSVP has been recorded. You can reopen the invitation later
      and submit again to update it.</p>
    `;
    setStatus("");
  } catch (error) {
    setStatus(error.message, true);
    submitButton.disabled = false;
  }
}

lookupButton.addEventListener("click", lookupParty);
partyCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") lookupParty();
});
form.addEventListener("submit", submitRsvp);
