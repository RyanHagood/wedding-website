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

  const countGroup = document.createElement("div");
  countGroup.className = "form-group";

  const label = document.createElement("label");
  label.setAttribute("for", "guestCount");
  label.textContent = "Guests included";

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

  countGroup.append(label, select);

  const generatedFields = document.createElement("div");
  generatedFields.id = "newGuestFields";

  select.addEventListener("change", () => {
    generatedFields.replaceChildren();

    const count = Number(select.value);

    for (let i = 1; i <= count; i += 1) {
      generatedFields.append(
        createGuestFieldset({
          isNew: true,
          number: i
        })
      );
    }
  });

  setup.append(countGroup, generatedFields);
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

    const nameGroup = document.createElement("div");
    nameGroup.className = "form-group";

    nameGroup.innerHTML = `
    <label>Guest Name</label>
    <input
      class="guest-name"
      maxlength="100"
      autocomplete="name"
      required
    >
  `;

    fieldset.append(nameGroup);

  }

  fieldset.insertAdjacentHTML("beforeend", `
    <div class="form-group">
      <label for="attendence">Attendance</label>
      <select class="attendance" required>
        <option value="">Please Select</option>
        <option value="yes">Yes, I am able to attend</option>
        <option value="no">No, I am unable to attend</option>
      </select>
    </div>
    <div class="form-group">
      <label for="meal">Meal Choice</label>
      <select class="meal" required>
        <option value="">Please Select</option>
        <option value="Pork Tenderloin">Pork Tenderloin</option>
        <option value="Gnocchi">Gnocchi</option>
        <option value="Kentucky Fried Mushrooms">Kentucky Fried Mushrooms</option>
        <option value="Chicken">Chicken</option>
      </select>
    </div>
    <div class="form-group">
      <label for="dietary">Dietary Notes</label>
      <input class="dietary" maxlength="200">
    </div>
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
  <div class="rsvp-confirmation">
    <h2>Thank you!</h2>
    <p>
      Your RSVP has been recorded. You can reopen the invitation later
      and submit again to update it.
    </p>
  </div>
`;

setStatus("");

const confirmation = form.querySelector(".rsvp-confirmation");

if (confirmation) {
  const navbarHeight = document.querySelector(".probootstrap-navbar")?.offsetHeight || 0;
  const targetPosition =
    confirmation.getBoundingClientRect().top +
    window.scrollY -
    navbarHeight -
    120;

  window.scrollTo({
    top: targetPosition,
    behavior: "smooth"
  });
}
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

function initializeLookupFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get("rsvp") || params.get("code") || "").trim().toUpperCase();
  if (!code) return;

  partyCodeInput.value = code;

  const rsvpSection = document.querySelector('[data-section="rsvp"]');
  if (rsvpSection) {
    rsvpSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  lookupParty();
}

initializeLookupFromUrl();
