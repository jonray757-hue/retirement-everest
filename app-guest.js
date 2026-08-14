function getLocationSlug() {
  const p = new URLSearchParams(location.search);
  return p.get('location') || p.get('loc') || '';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Never show internal venue quotes / host notes on guest pages.
 * Host-only pricing lives in costModel.note / venue CRM — not formNote.
 */
function guestSafeFormNote(note) {
  if (!note || typeof note !== 'string') return '';
  const n = note.trim();
  if (!n) return '';
  // Internal ops markers that must never reach guests
  if (/REAL QUOTE|OUTLOOK\s|QUOTE:|F&B min|FOOD ONLY|ldry\.com|@\w+\.(com|org)|deposit|LOI|PARKED|UNDER \$\d|OVER \$\d|cost model|PLACEHOLDER|do not model|Import Kayla|series budget|\$\d[\d,]*(?:\/pp|\/head| room| F&B)/i.test(n)) {
    console.warn('[RE] Blocked internal formNote from guest page');
    return '';
  }
  return n;
}

function tags(item) {
  let t = '';
  if (item.vegan) t += '<span class="tag">Vegan</span>';
  else if (item.veg) t += '<span class="tag">Veg</span>';
  if (item.special) t += '<span class="tag tag-special">Special</span>';
  if (item.cat) t += `<span class="tag tag-cat">${esc(item.cat)}</span>`;
  if (item.sleeps) t += `<span class="tag tag-sleeps">Sleeps ${item.sleeps}</span>`;
  return t;
}

function cardHTML(id, pick, person, item, selected) {
  const pid = person != null ? `-${person}` : '';
  const sel = selected ? ' selected' : '';
  return `<div class="card${sel}" id="card-${pick}${pid}-${item.id}" data-pick="${pick}" data-id="${item.id}" ${person != null ? `data-person="${person}"` : ''}>
    <div class="card-radio"><div class="card-dot"></div></div>
    <div class="card-name">${esc(item.name)}${tags(item)}</div>
    <div class="card-desc">${esc(item.desc || item.blurb || '')}</div>
  </div>`;
}

function accordionSectionsHTML(item) {
  const sections = item.sections || [];
  if (!sections.length) {
    return item.desc ? `<p class="acc-desc">${esc(item.desc)}</p>` : '';
  }
  return sections.map(sec => `
    <div class="acc-section">
      <div class="acc-section-title">${esc(sec.title)}</div>
      <ul class="acc-list">${(sec.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    </div>`).join('');
}

function accordionItemHTML(kind, item) {
  return `
    <div class="acc-item" id="acc-${kind}-${item.id}" data-kind="${kind}" data-id="${item.id}">
      <button type="button" class="acc-head" data-acc-toggle="${kind}-${item.id}" aria-expanded="false">
        <span class="acc-head-text">
          <span class="acc-name">${esc(item.name)}</span>
          ${item.blurb ? `<span class="acc-blurb">${esc(item.blurb)}</span>` : ''}
        </span>
        <span class="acc-chevron" aria-hidden="true">▾</span>
      </button>
      <div class="acc-body" hidden>
        ${accordionSectionsHTML(item)}
        <button type="button" class="acc-vote-btn" data-vote="${kind}" data-id="${item.id}">
          Vote for this ${kind === 'buffet' ? 'buffet' : 'option'}
        </button>
      </div>
    </div>`;
}

function bevCardHTML(item) {
  const soft = item.cat === 'Soft' || item.id === 'd-soft';
  const icon = soft ? '✓' : '🥂';
  return `
    <button type="button" class="bev-card" id="card-drink-${item.id}" data-pick="drink" data-id="${item.id}">
      <span class="bev-icon">${icon}</span>
      <span class="bev-name">${esc(item.name)}</span>
      <span class="bev-desc">${esc(item.desc || item.blurb || '')}</span>
    </button>`;
}

function setVoteStatus(kind, item) {
  const el = document.getElementById(`${kind}-vote-status`);
  if (!el || !item) return;
  el.innerHTML = `Your vote: <strong>${esc(item.name)}</strong>`;
  el.classList.add('has-vote');
}

function markAccordionVoted(kind, id) {
  document.querySelectorAll(`.acc-item[data-kind="${kind}"]`).forEach(node => {
    node.classList.toggle('voted', node.dataset.id === id);
  });
}

function skipCard(person, kind, label, selected) {
  const sel = selected ? ' selected' : '';
  return `<div class="card${sel}" id="card-${kind}-${person}-skip" data-pick="${kind}" data-person="${person}" data-id="" style="display:flex;align-items:center;padding-left:16px;">
    <div class="card-radio" style="position:static;transform:none;margin-right:10px;"><div class="card-dot" style="opacity:${selected?1:0};"></div></div>
    <div><div class="card-name">No thanks, I'll wait</div><div class="card-desc">Skip the ${label}</div></div>
  </div>`;
}

let LOC, partySize = 1, selRoom = null;
let selections = [{ starter: null, drink: null, dinner: null }];
let selSalad = null, selEntree = null, selDessert = null;
let selStarter = null, selMain = null, selDrink = null, starterFilter = 'all';
let selBuffet = null;
/** BBQ menu tally: up to 2 side ids (legacy — plate picks removed) */
let selSides = [];
/** BBQ diet: 'none' | 'yes' */
let selDiet = null;
/* --- Seat reservations (Kennedy BBQ) --- */
let seatPartyType = 'solo';       // 'solo' | 'couple'
let coupleMode = 'new';           // 'new' = first-time reserve | 'join' = partner already reserved
let selSeats = [];                // e.g. ['A3'] or ['A3','A4']
let seatState = null;             // last fetched shared seat state
let seatFriendly = new Set();     // solo-safe seats
let seatAccomRequested = false;   // "can't find a seat" pressed
let seatMapMode = 'main';         // 'main' | 'waitlist'
let joinablePartners = [];        // dropdown options for "partner already reserved"
let selectedPartnerKey = '';      // key from listJoinablePartners

function waitlistCopy() {
  return (window.RESeating && RESeating.WAITLIST_CONFIRM) ||
    'WAITLIST HOLD — this is not a confirmed seat. If that seat opens we will contact you so you can claim it. You must claim it promptly when we reach you, or it will be offered to the next person on the list.';
}

function viewSeatState() {
  if (!seatState) return { seats: {} };
  if (seatMapMode === 'waitlist') {
    return { ...seatState, seats: (seatState.waitlist && seatState.waitlist.seats) || {} };
  }
  return seatState;
}

function initGuest() {
  const slug = getLocationSlug();
  LOC = RETIREMENT_EVEREST.locations[slug];
  /* Parent venue (kennedy-school) still has the old buffet-poll form with no seats.
     Always use the locked guest package so the seat chart is on the page. */
  if (LOC?.guestSlug && RETIREMENT_EVEREST.locations[LOC.guestSlug]) {
    LOC = RETIREMENT_EVEREST.locations[LOC.guestSlug];
  }
  if (!LOC) {
    document.body.innerHTML = '<div style="padding:80px 24px;text-align:center;color:#888;"><h2>Location not found</h2><p><a href="index.html">← Back to locations</a></p></div>';
    return;
  }
  document.body.className = `theme-${LOC.theme}`;
  document.title = `Retirement Everest — ${LOC.shortName}`;
  renderPage();
  bindEvents();
}

function renderPage() {
  const expectHTML = LOC.expect.map((e,i) => `
    <div class="expect-item"><div class="expect-num">${String(i+1).padStart(2,'0')}</div>
    <div class="expect-title">${esc(e.title)}</div><div class="expect-desc">${esc(e.desc)}</div></div>`).join('');
  const metaHTML = LOC.meta.map(m => `<div class="meta-item"><strong>${esc(m.strong)}</strong>${esc(m.label)}</div>`).join('');
  const aboutHTML = LOC.about.map(p => `<p>${p}</p>`).join('');

  const hero = RETIREMENT_EVEREST.hero;
  const heroBust = '20260802e';
  const heroImgHTML = hero?.image ? `
      <picture>
        ${hero.imageMobile ? `<source media="(max-width: 768px)" srcset="${hero.imageMobile}?v=${heroBust}">` : ''}
        <img src="${hero.image}?v=${heroBust}" alt="${hero.alt || 'Retirement Everest'}" loading="eager">
      </picture>
      <div class="hero-overlay"></div>` : '';

  document.getElementById('app').innerHTML = `
    <div class="hero${hero?.image ? ' hero--has-poster' : ''}">
      <div class="hero-bg theme-${LOC.theme}-bg${hero?.image ? ' has-image' : ''}">${heroImgHTML}</div>
      <div class="hero-content">
        <div class="eyebrow">From Award-Winning Film Producers Brett Kitchen &amp; Ethan Kap</div>
        <h1>Retirement<em>Everest</em></h1>
        <p class="hero-sub">${LOC.heroSub}</p>
        <div class="event-meta">${metaHTML}</div>
      </div>
    </div>
    <div class="about"><div class="section-label">${LOC.aboutLabel}</div><h2>${LOC.aboutHeadline}</h2>${aboutHTML}</div>
    <div class="expect"><div class="section-label">What to Expect</div><div class="expect-grid">${expectHTML}</div></div>
    <div class="divider"><div class="divider-quote">"The biggest financial risks in retirement aren't the ones most people are <span>preparing for.</span>"</div></div>
    <div class="order-section" id="order">
      <div class="section-label">${LOC.formLabel}</div>
      <h2>${LOC.formTitle}</h2>
      ${LOC.formIntro ? `<p class="order-intro">${LOC.formIntro}</p>` : ''}
      ${guestSafeFormNote(LOC.formNote) ? `<div class="order-note">${guestSafeFormNote(LOC.formNote)}</div>` : ''}
      <div id="form-fields"></div>
      <div class="guest-contact-card" id="guest-contact-card">
        <div class="guest-contact-card-head">
          <div class="guest-contact-card-title">Your contact info</div>
          <div class="guest-contact-card-sub">Required · so we can match your notes to you</div>
        </div>
        <div class="field-wrap guest-contact-field"><label class="field-label" for="guestName">Your full name</label>
          <input type="text" id="guestName" placeholder="First and last name" autocomplete="name"></div>
        <div class="err-msg" id="err-name">Please enter your full name.</div>
        <div class="grid2 guest-contact-grid">
          <div class="field-wrap guest-contact-field" style="margin-bottom:0"><label class="field-label" for="guestEmail">Email</label>
            <input type="email" id="guestEmail" placeholder="you@email.com" autocomplete="email"></div>
          <div class="field-wrap guest-contact-field" style="margin-bottom:0"><label class="field-label" for="guestPhone">Mobile phone</label>
            <input type="tel" id="guestPhone" placeholder="(503) 555-0100" autocomplete="tel"></div>
        </div>
        <div class="err-msg" id="err-contact">Add an email <em>or</em> mobile number (at least one).</div>
        <p class="guest-contact-hint">We only use this for your event confirmation — not a mailing list pitch.</p>
      </div>
      <div class="submit-area">
        <button class="submit-btn" id="submitBtn">${LOC.bbqMenuPick ? 'Submit Diet &amp; Drink Notes' : (LOC.type === 'preorder' || LOC.type === 'buffet' ? 'Confirm My Preferences' : 'Confirm My Reservation')}</button>
        <p class="submit-legal">${LOC.bbqMenuPick
          ? 'Submitting this page does not reserve a seat. Johnny Harris confirms every seat personally. Use this form only after he has spoken with you.'
          : `Your selections help us prepare for your ${LOC.type === 'retreat' ? 'stay' : 'evening'}. By submitting, you confirm your intent to attend.`}</p>
      </div>
    </div>
    <div class="success" id="success">
      <div class="success-ring">✓</div>
      <h2>${LOC.bbqMenuPick ? 'Notes received.' : "You're confirmed."}</h2>
      <p>${LOC.bbqMenuPick
        ? 'Thank you — we have your diet notes and drink preference. A seat is only reserved after Johnny Harris confirms it with you personally.'
        : `We look forward to hosting you at ${LOC.shortName}. A reminder with details will follow closer to the date.`}</p>
      <div class="success-card" id="success-card"></div>
    </div>
    <footer>
      ${LOC.footer}
      <div class="guest-admin">
        <a href="host.html?location=${encodeURIComponent(LOC.slug)}">Command center</a>
      </div>
    </footer>
  `;
  renderFormFields();
}

function simpleCardHTML(pick, item, selected) {
  const sel = selected ? ' selected' : '';
  return `<div class="card${sel}" id="card-${pick}-${item.id}" data-pick="${pick}" data-id="${item.id}">
    <div class="card-radio"><div class="card-dot"></div></div>
    <div class="card-name">${esc(item.name)}</div>
    ${item.desc ? `<div class="card-desc">${esc(item.desc)}</div>` : ''}
  </div>`;
}

function menuBoardCol(title, items) {
  return `
    <div class="menu-board-col">
      <div class="menu-board-h">${esc(title)}</div>
      <ul class="menu-board-list">
        ${(items || []).map(i => `<li>
          <span class="menu-board-name">${esc(i.name)}${i.vegan ? ' <em>(vegan)</em>' : ''}</span>
          ${i.desc ? `<span class="menu-board-desc">${esc(i.desc)}</span>` : ''}
        </li>`).join('')}
      </ul>
    </div>`;
}

function renderBbqMenuPickForm() {
  const sides = LOC.menus.sides || [];
  const entrees = LOC.menus.entrees || [];
  const desserts = LOC.menus.desserts || [];
  const buffetLabel = LOC.menus.buffetName || 'Backyard Barbecue Buffet';
  return `
    <div class="locked-buffet" id="locked-buffet-panel">
      <div class="locked-buffet-badge">Tonight’s dinner · served for the room</div>
      <div class="locked-buffet-name">${esc(buffetLabel)}</div>
      <div class="locked-buffet-blurb">Guests do not pick individual plates. This is what the kitchen is serving — tell us about dietary restrictions and your drink below.</div>
    </div>
    <div class="menu-board" id="menu-board">
      ${menuBoardCol('Entrées', entrees)}
      ${menuBoardCol('Sides &amp; salads', sides)}
      ${menuBoardCol('Desserts', desserts)}
    </div>
    <div class="section-gap"></div>
    <div class="pick-head"><span class="pick-title">Dietary restrictions</span><span class="pick-req">Required</span></div>
    <p class="order-intro" style="margin-top:0;font-size:0.9rem">
      Allergies, vegan, no pork, gluten-free, religious restrictions — anything the kitchen should know.
    </p>
    <div class="bev-row" id="diet-cards">
      <button type="button" class="bev-card" id="card-diet-none" data-pick="diet" data-id="none">
        <span class="bev-icon">✓</span>
        <span class="bev-name">No restrictions</span>
        <span class="bev-desc">I can eat from this buffet as served</span>
      </button>
      <button type="button" class="bev-card" id="card-diet-yes" data-pick="diet" data-id="yes">
        <span class="bev-icon">!</span>
        <span class="bev-name">Yes — I have restrictions</span>
        <span class="bev-desc">Allergies, vegan, no pork, gluten-free, etc.</span>
      </button>
    </div>
    <div class="err-msg" id="err-diet">Please tell us whether you have dietary restrictions.</div>
    <div class="field-wrap" id="diet-notes-wrap" style="display:none;margin-bottom:0">
      <label class="field-label" for="guestNotes">Please describe your restrictions or allergies</label>
      <textarea id="guestNotes" rows="3" placeholder="e.g. nut allergy, no pork, gluten-free, vegan guest…" autocomplete="off"></textarea>
      <div class="err-msg" id="err-diet-notes">Please describe your restrictions or allergies.</div>
    </div>
    <div class="section-gap"></div>
    <div class="pick-head"><span class="pick-title">Adult beverage?</span><span class="pick-req">Yes or no</span></div>
    <p class="order-intro" style="margin-top:0;font-size:0.9rem">
      Coffee, tea, soda, and water are <strong>already included</strong>. We only need to know if you’d like an adult drink (beer, cider, wine, or cocktail) so we can plan the bar — or let you order from the bar on your own.
    </p>
    <div class="bev-row" id="drink-cards">
      ${LOC.menus.drinks.map(d => bevCardHTML(d)).join('')}
    </div>
    <div class="err-msg" id="err-drink">Please tell us whether you’d like an adult beverage.</div>
    ${window.RESeating ? renderSeatSection() : ''}`;
}

function renderSeatSection() {
  return `
    <div class="section-gap"></div>
    <div class="pick-head"><span class="pick-title">Reserve Your Seats</span><span class="pick-req">Tables A–E · facing the screen</span></div>
    <p class="order-intro" style="margin-top:0;font-size:0.9rem">
      Round tables of eight, arranged so <strong>no one's back is to the screen</strong>.
      Pick your seat now and it's yours — reserved seats are blacked out for everyone else.
    </p>
    <div class="field-wrap"><label class="field-label">Who's attending?</label>
      <div class="party-toggle">
        <div class="party-btn selected" id="seatparty-solo" data-seatparty="solo"><div class="party-num">1</div><div class="party-label">Just Me</div></div>
        <div class="party-btn" id="seatparty-couple" data-seatparty="couple"><div class="party-num">2</div><div class="party-label">Me &amp; My Spouse / Partner</div></div>
      </div></div>
    <div class="field-wrap" id="spouse-wrap" style="display:none">
      <label class="field-label">How are you reserving?</label>
      <div class="party-toggle" style="margin-bottom:16px">
        <div class="party-btn selected" id="couplemode-new" data-couplemode="new">
          <div class="party-label" style="font-size:0.85rem;line-height:1.35">We're reserving together<br><span style="opacity:0.75;font-size:0.78rem">First time — pick two seats</span></div>
        </div>
        <div class="party-btn" id="couplemode-join" data-couplemode="join">
          <div class="party-label" style="font-size:0.85rem;line-height:1.35">Partner already reserved<br><span style="opacity:0.75;font-size:0.78rem">Join their seats — no new seats</span></div>
        </div>
      </div>
      <div id="spouse-new-fields">
        <label class="field-label" for="spouseName">Spouse / partner full name</label>
        <input type="text" id="spouseName" placeholder="Their first and last name" autocomplete="off">
        <p class="order-intro" style="margin:8px 0 0;font-size:0.78rem">We'll put their name on the seat beside yours. They can come back later and submit their own diet &amp; drink notes by choosing “Partner already reserved.”</p>
      </div>
      <div id="spouse-join-fields" style="display:none">
        <label class="field-label" for="partnerSelect">Who already reserved your seats?</label>
        <select id="partnerSelect" style="width:100%;padding:12px 14px;border-radius:8px;border:1px solid var(--border,#333);background:var(--panel,#1a1a1a);color:var(--text,#eee);font-size:1rem">
          <option value="">Loading people who reserved…</option>
        </select>
        <p class="order-intro" style="margin:8px 0 0;font-size:0.78rem">Pick your partner from the list. Your seats stay with them — you only submit <strong>your</strong> diet &amp; drink notes (no extra seats blocked).</p>
        <div id="partner-join-summary" style="display:none;margin-top:12px;padding:12px 14px;border-radius:8px;border:1px solid var(--accent,#c9a44a);background:rgba(201,164,74,0.08);font-size:0.9rem;color:var(--text,#eee)"></div>
      </div>
    </div>
    <div id="seat-pick-block">
      <div id="seatmap-container" style="background:rgba(0,0,0,0.25);border:1px solid var(--border,#333);border-radius:12px;padding:14px">
        <div class="empty" style="padding:30px;text-align:center;color:var(--muted,#888)">Loading live seat map…</div>
      </div>
      <div class="vote-status" id="seat-status">Tap an open seat to reserve it.</div>
      <div class="err-msg" id="err-seat">Please pick your seat (or tap the button below and we'll arrange one for you).</div>
      <div id="waitlist-banner" style="display:none;margin-top:12px;padding:12px 14px;border-radius:8px;border:1px solid #c9a44a;background:rgba(201,164,74,0.08);font-size:0.85rem;color:var(--text,#eee);line-height:1.45">
        <strong style="color:var(--accent,#c9a44a)">Waitlist hold</strong> — you are not confirmed yet. If this seat opens we will contact you so you can claim it. You must claim it promptly when we reach you, or it will be offered to the next person on the list.
      </div>
      <div style="margin-top:12px;text-align:center">
        <button type="button" class="submit-btn" id="waitlistToggleBtn"
          style="background:transparent;border:1px solid var(--accent,#c9a44a);color:var(--accent,#c9a44a);font-size:0.82rem;padding:10px 16px">
          Room is full? Join the waitlist instead
        </button>
      </div>
      <div style="margin-top:14px;text-align:center">
        <button type="button" class="submit-btn" id="seatHelpBtn"
          style="background:transparent;border:1px solid var(--accent,#c9a44a);color:var(--accent,#c9a44a);font-size:0.85rem;padding:12px 18px">
          Can't find seats that work? Tap here — we'll make arrangements for you
        </button>
        <div id="seat-help-note" style="display:none;margin-top:10px;color:var(--accent,#c9a44a);font-size:0.85rem">
          ✓ Got it — submit your preferences below and we'll personally arrange seating that works for you.
        </div>
      </div>
    </div>`;
}

function paintSeatMap(state, orderBackup) {
  const box = document.getElementById('seatmap-container');
  if (!box || !window.RESeating) return;
  seatState = state || RESeating.emptyState();
  const totalN = RESeating.allSeats().length;
  const mainFull = Object.keys(seatState.seats || {}).length >= totalN;
  if (mainFull && seatMapMode === 'main') seatMapMode = 'waitlist';
  const view = viewSeatState();
  seatFriendly = RESeating.soloFriendly(view);
  selSeats = selSeats.filter(id => !view.seats?.[id]);
  if (orderBackup) {
    joinablePartners = typeof RESeating.listJoinablePartners === 'function'
      ? RESeating.listJoinablePartners(seatState, orderBackup)
      : [];
    refreshPartnerSelect();
    applyCoupleModeUI();
  }
  const takenN = Object.keys(view.seats || {}).length;
  const takenNote = takenN
    ? `<div style="margin-bottom:6px;font-size:0.78rem;color:var(--muted,#888)"><strong style="color:var(--text,#ddd)">${takenN}</strong> ${seatMapMode === 'waitlist' ? 'waitlist hold' : 'seat'}${takenN === 1 ? '' : 's'} already taken (blacked out)${seatMapMode === 'main' ? ` · ${totalN - takenN} open` : ''}</div>`
    : '';
  box.innerHTML = takenNote + RESeating.renderMapSVG(seatState, {
    mode: 'guest', selected: selSeats, friendly: seatFriendly, partyType: seatPartyType,
    map: seatMapMode === 'waitlist' ? 'waitlist' : 'main'
  }) + RESeating.legendHTML('guest') +
  `<div style="text-align:right;margin-top:4px"><button type="button" class="submit-btn" id="seatRefreshBtn" style="background:transparent;border:none;color:var(--muted,#888);font-size:0.75rem;padding:4px;text-decoration:underline">↻ Refresh map</button></div>`;
  const banner = document.getElementById('waitlist-banner');
  if (banner) banner.style.display = seatMapMode === 'waitlist' ? '' : 'none';
  const wbtn = document.getElementById('waitlistToggleBtn');
  if (wbtn) {
    wbtn.textContent = seatMapMode === 'waitlist'
      ? '← Back to confirmed seating chart'
      : (mainFull ? 'Jordan Room is full — join the waitlist' : 'Room is full? Join the waitlist instead');
  }
  updateSeatStatus();
}

async function loadSeatMap() {
  const box = document.getElementById('seatmap-container');
  if (!box || !window.RESeating) return;
  try {
    localStorage.removeItem('re_seats_cache_v1');
    localStorage.removeItem('re_seats_cache_v2');
    localStorage.removeItem('re_seats_cache_v3');
  } catch (_) {}

  /* Draw the floor plan immediately so a slow cloud fetch never hides the diagram. */
  const cached = typeof RESeating.getCachedState === 'function' ? RESeating.getCachedState() : null;
  paintSeatMap(cached || RESeating.emptyState(), []);

  const ordersPromise = (async () => {
    let orderBackup = [];
    try {
      if (window.RESharedOrders?.fetchSharedOrders) {
        orderBackup = await RESharedOrders.fetchSharedOrders(LOC.id || LOC.slug);
      }
    } catch (e) {
      console.warn('[RE] order backup for seats failed', e);
    }
    try {
      const localOrders = JSON.parse(localStorage.getItem(LOC.storageKey) || '[]');
      orderBackup = window.RESharedOrders?.mergeOrders
        ? RESharedOrders.mergeOrders(localOrders, orderBackup)
        : [...orderBackup, ...localOrders];
    } catch (_) {}
    return orderBackup;
  })();

  const seatsPromise = RESeating.fetchState({
    orders: [],
    healRemote: false,
    offlineOrders: false
  }).catch((e) => {
    console.warn('[RE] seat map load failed', e);
    const fallback = cached || (RESeating.emptyState ? RESeating.emptyState() : { seats: {}, couples: [], accommodations: [] });
    fallback.offline = true;
    return fallback;
  });

  const [orderBackup, live] = await Promise.all([ordersPromise, seatsPromise]);
  paintSeatMap(live, orderBackup);
}

function refreshPartnerSelect() {
  const sel = document.getElementById('partnerSelect');
  if (!sel) return;
  const prev = selectedPartnerKey || sel.value || '';
  if (!joinablePartners.length) {
    sel.innerHTML = '<option value="">No couple reservations yet — ask your partner to reserve first, or choose “reserving together”</option>';
    selectedPartnerKey = '';
  } else {
    sel.innerHTML =
      '<option value="">Select your partner who already reserved…</option>' +
      joinablePartners.map(p =>
        `<option value="${esc(p.key)}">${esc(p.label)}</option>`
      ).join('');
    if (prev && joinablePartners.some(p => p.key === prev)) {
      sel.value = prev;
      selectedPartnerKey = prev;
    }
  }
  updatePartnerJoinSummary();
}

function getSelectedPartner() {
  if (!selectedPartnerKey) return null;
  return joinablePartners.find(p => p.key === selectedPartnerKey) || null;
}

function updatePartnerJoinSummary() {
  const box = document.getElementById('partner-join-summary');
  if (!box) return;
  const p = getSelectedPartner();
  if (!p) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.style.display = 'block';
  box.innerHTML = `✓ You'll sit with <strong>${esc(p.name)}</strong>${p.spouseExpected ? ` (they reserved for <strong>${esc(p.spouseExpected)}</strong>)` : ''}<br>
    <span style="color:var(--accent,#c9a44a);font-weight:700">${esc(p.seatLabel || 'Seats reserved')}</span>
    — no extra seats will be blocked.`;
}

function applyCoupleModeUI() {
  const isCouple = seatPartyType === 'couple';
  const isJoin = isCouple && coupleMode === 'join';
  const sw = document.getElementById('spouse-wrap');
  if (sw) sw.style.display = isCouple ? '' : 'none';
  document.getElementById('couplemode-new')?.classList.toggle('selected', coupleMode === 'new');
  document.getElementById('couplemode-join')?.classList.toggle('selected', coupleMode === 'join');
  const newF = document.getElementById('spouse-new-fields');
  const joinF = document.getElementById('spouse-join-fields');
  if (newF) newF.style.display = isCouple && coupleMode === 'new' ? '' : 'none';
  if (joinF) joinF.style.display = isCouple && coupleMode === 'join' ? '' : 'none';
  const pick = document.getElementById('seat-pick-block');
  if (pick) pick.style.display = isJoin ? 'none' : '';
  if (isJoin) {
    selSeats = [];
    seatAccomRequested = false;
  }
  updatePartnerJoinSummary();
  updateSeatStatus();
}

function updateSeatStatus() {
  const el = document.getElementById('seat-status');
  if (!el) return;
  if (seatPartyType === 'couple' && coupleMode === 'join') {
    const p = getSelectedPartner();
    el.textContent = p
      ? `Joining ${p.name} at ${p.seatLabel || 'their reserved seats'} — no seat pick needed.`
      : 'Select your partner who already reserved from the dropdown above.';
    return;
  }
  if (seatAccomRequested) { el.textContent = "We'll arrange your seating personally — nothing to pick."; return; }
  if (seatMapMode === 'waitlist') {
    if (!selSeats.length) {
      el.textContent = seatPartyType === 'couple'
        ? 'Waitlist: tap a hold seat — we\'ll grab the seat beside it for your spouse.'
        : 'Waitlist: tap an open hold seat. This is not a confirmed chair.';
    } else {
      el.textContent = `Waitlist hold: ${RESeating.seatLabel(selSeats)} — we will contact you if it opens.`;
    }
    return;
  }
  if (!selSeats.length) {
    el.textContent = seatPartyType === 'couple'
      ? 'Tap an open seat — we\'ll grab the seat beside it for your spouse automatically.'
      : 'Tap an open seat to reserve it.';
  } else {
    el.textContent = `Your pick: ${RESeating.seatLabel(selSeats)}${seatPartyType === 'couple' ? ' (side by side)' : ''}`;
  }
}

function handleSeatClick(id) {
  const view = viewSeatState();
  if (!view || view.seats[id]) return;
  document.getElementById('err-seat')?.classList.remove('show');
  // toggle off
  if (selSeats.includes(id)) { selSeats = []; refreshSeatMapUI(); return; }
  if (seatPartyType === 'solo') {
    if (seatFriendly.size && !seatFriendly.has(id)) {
      alert('That seat is being held so a couple can sit together. Please pick one of the solid-outline seats — or tap the arrangements button and we\'ll take care of you.');
      return;
    }
    selSeats = [id];
  } else {
    const partner = RESeating.bestPartnerSeat(id, view);
    if (!partner) {
      alert('No open seat right beside that one. Try another spot with two seats together — or tap the arrangements button and we\'ll make sure you sit together.');
      return;
    }
    selSeats = [id, partner].sort();
  }
  refreshSeatMapUI();
}

function refreshSeatMapUI() {
  const box = document.getElementById('seatmap-container');
  if (!box || !seatState) return;
  const svgWrap = box.querySelector('svg');
  if (svgWrap) {
    svgWrap.outerHTML = RESeating.renderMapSVG(seatState, {
      mode: 'guest', selected: selSeats, friendly: seatFriendly, partyType: seatPartyType,
      map: seatMapMode === 'waitlist' ? 'waitlist' : 'main'
    });
  }
  updateSeatStatus();
}

async function requestSeatAccommodation() {
  const name = document.getElementById('guestName')?.value.trim();
  const email = (document.getElementById('guestEmail')?.value || '').trim();
  const phone = (document.getElementById('guestPhone')?.value || '').trim();
  if (!name || (!email && !phone)) {
    alert('Add your name and an email or mobile number first, so we know who to arrange seating for.');
    document.getElementById('guestName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const btn = document.getElementById('seatHelpBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  const spouse = (document.getElementById('spouseName')?.value || '').trim() || null;
  const req = { name, email, phone, partyType: seatPartyType, spouse, locationId: LOC.id };
  try { await RESeating.addAccommodation(req); } catch (e) { console.warn('[RE] accommodation log failed', e); }
  RESeating.pushSeatEventToGHL({
    event: 'seat_accommodation_requested',
    form: 'seat-accommodation',
    name, email, phone,
    partyType: seatPartyType, spouse: spouse || '',
    location: LOC.id, locationName: LOC.name,
    preferencesSummary: `SEATING HELP NEEDED\nName: ${name}\nParty: ${seatPartyType}${spouse ? ` (with ${spouse})` : ''}\nCouldn't find suitable open seats — please arrange.`
  });
  seatAccomRequested = true;
  selSeats = [];
  if (btn) { btn.style.display = 'none'; }
  const note = document.getElementById('seat-help-note');
  if (note) note.style.display = 'block';
  document.getElementById('err-seat')?.classList.remove('show');
  refreshSeatMapUI();
}

function renderFormFields() {
  const el = document.getElementById('form-fields');
  if (LOC.type === 'buffet' && LOC.bbqMenuPick) {
    selBuffet = LOC.lockedBuffetId || 'b-bbq';
    selSides = [];
    selEntree = null;
    selDessert = null;
    selDrink = null;
    selDiet = null;
    el.innerHTML = renderBbqMenuPickForm();
    if (window.RESeating) loadSeatMap();
  } else if (LOC.type === 'buffet') {
    el.innerHTML = `
      <div class="pick-head"><span class="pick-title">Preferred Buffet</span><span class="pick-req">Expand · see menu · Vote</span></div>
      <p class="order-intro" style="margin-top:0;font-size:0.9rem">We order <strong>one buffet for the whole group</strong>. Open a package to read the full menu, then tap <strong>Vote for this buffet</strong>.</p>
      <div class="accordion" id="buffet-accordion">${LOC.menus.buffets.map(b => accordionItemHTML('buffet', b)).join('')}</div>
      <div class="vote-status" id="buffet-vote-status">No buffet vote yet</div>
      <div class="err-msg" id="err-buffet">Please vote for a preferred buffet.</div>
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Shared Appetizers</span><span class="pick-req">Expand · vote your favorite</span></div>
      <p class="order-intro" style="margin-top:0;font-size:0.9rem">Buffets don’t include a plated starter. Expand a shared package (or “no appetizers”), then vote so we know what the group prefers.</p>
      <div class="accordion" id="starter-accordion">${LOC.menus.starters.map(s => accordionItemHTML('starter', s)).join('')}</div>
      <div class="vote-status" id="starter-vote-status">No appetizer vote yet</div>
      <div class="err-msg" id="err-starter">Please vote for an appetizer option (or no appetizers).</div>
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Adult beverage?</span><span class="pick-req">Yes or no</span></div>
      <p class="order-intro" style="margin-top:0;font-size:0.9rem">Coffee, tea, soda, and water are <strong>already included</strong>. Tell us only if you’d like an adult drink so we can plan the bar.</p>
      <div class="bev-row" id="drink-cards">
        ${LOC.menus.drinks.map(d => bevCardHTML(d)).join('')}
      </div>
      <div class="err-msg" id="err-drink">Please tell us whether you’d like an adult beverage.</div>`;
  } else if (LOC.type === 'preorder') {
    el.innerHTML = `
      <div class="pick-head"><span class="pick-title">Arrival Bite</span><span class="pick-req">Optional · select one or skip</span></div>
      <div class="starter-filter" id="starter-filter">
        <button type="button" class="filter-btn active" data-filter="all">All</button>
        <button type="button" class="filter-btn" data-filter="Snack">Shares &amp; Snacks</button>
        <button type="button" class="filter-btn" data-filter="Salad">Greens</button>
      </div>
      <div class="cards" id="starter-cards"></div>
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Main Course</span><span class="pick-req">Select one</span></div>
      <div class="cards" id="main-cards">${LOC.menus.mains.map(m => cardHTML('main', 'main', null, m, false)).join('')}</div>
      <div class="err-msg" id="err-main">Please choose a main course.</div>
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Choose Your Drink</span><span class="pick-req">Select one</span></div>
      <div class="cards" id="drink-cards">${LOC.menus.drinks.map(d => cardHTML('drink', 'drink', null, d, false)).join('')}</div>
      <div class="err-msg" id="err-drink">Please choose a drink.</div>`;
    renderStarterCards();
  } else if (LOC.type === 'screening') {
    const drinkSection = LOC.menus.drinks?.length ? `
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Choose Your Drink</span><span class="pick-req">Select one</span></div>
      <div class="cards" id="drink-cards">${LOC.menus.drinks.map(d => cardHTML('drink', 'drink', null, d, false)).join('')}</div>
      <div class="err-msg" id="err-drink">Please choose a drink.</div>` : '';
    el.innerHTML = `
      <div class="pick-head"><span class="pick-title">Salad</span><span class="pick-req">Select one</span></div>
      <div class="cards" id="salad-cards">${LOC.menus.salads.map(s => cardHTML('salad','salad',null,s,false)).join('')}</div>
      <div class="err-msg" id="err-salad">Please choose a salad.</div>
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Entrée</span><span class="pick-req">Select one</span></div>
      <div class="cards" id="entree-cards">${LOC.menus.entrees.map(s => cardHTML('entree','entree',null,s,false)).join('')}</div>
      <div class="err-msg" id="err-entree">Please choose an entrée.</div>
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Dessert</span><span class="pick-req">Select one</span></div>
      <div class="cards" id="dessert-cards">${LOC.menus.desserts.map(s => cardHTML('dessert','dessert',null,s,false)).join('')}</div>
      <div class="err-msg" id="err-dessert">Please choose a dessert.</div>${drinkSection}`;
  } else {
    el.innerHTML = `
      <div class="field-wrap"><label class="field-label">Who's Joining You?</label>
        <div class="party-toggle">
          <div class="party-btn selected" id="party-1" data-party="1"><div class="party-num">1</div><div class="party-label">Just Me</div></div>
          <div class="party-btn" id="party-2" data-party="2"><div class="party-num">2</div><div class="party-label">Me &amp; a Guest</div></div>
        </div></div>
      <div class="pick-head"><span class="pick-title">Choose Your Room</span><span class="pick-req">Select one</span></div>
      <div class="cards" id="rooms-cards">${LOC.menus.rooms.map(r => cardHTML('room','room',null,r,false)).join('')}</div>
      <div class="err-msg" id="err-room">Please choose a room type.</div>
      <div class="section-gap" id="people-container"></div>`;
    renderPeople();
  }
}

function preorderSkipCard(selected) {
  const sel = selected ? ' selected' : '';
  return `<div class="card${sel}" id="card-starter-skip" data-pick="starter" data-id="" style="display:flex;align-items:center;padding-left:16px;">
    <div class="card-radio" style="position:static;transform:none;margin-right:10px;"><div class="card-dot" style="opacity:${selected ? 1 : 0};"></div></div>
    <div><div class="card-name">No thanks, I'll wait for dinner</div><div class="card-desc">Skip the arrival bite</div></div>
  </div>`;
}

function renderStarterCards() {
  const filtered = starterFilter === 'all'
    ? LOC.menus.starters
    : LOC.menus.starters.filter(s => s.cat === starterFilter);
  document.getElementById('starter-cards').innerHTML =
    preorderSkipCard(!selStarter) +
    filtered.map(s => cardHTML('starter', 'starter', null, s, selStarter === s.id)).join('');
}

function renderPeople() {
  const labels = partySize === 1 ? ['Your Selections'] : ['Person 1', 'Person 2'];
  document.getElementById('people-container').innerHTML = labels.map((label, i) => `
    <div class="person-block">
      <div class="person-header">${label}</div>
      <div class="pick-head"><span class="pick-title">Before the Film: A Starter</span><span class="pick-req">Optional</span></div>
      <div class="cards">${skipCard(i,'starter','starter',true)}${LOC.menus.starters.map(s => cardHTML('starter','starter',i,s,false)).join('')}</div>
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Before the Film: A Drink</span><span class="pick-req">Optional</span></div>
      <div class="cards">${skipCard(i,'drink','drink',true)}${LOC.menus.drinks.map(s => cardHTML('drink','drink',i,s,false)).join('')}</div>
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Dinner</span><span class="pick-req">Select one</span></div>
      <div class="cards">${LOC.menus.dinners.map(s => cardHTML('dinner','dinner',i,s,false)).join('')}</div>
      <div class="err-msg" id="err-dinner-${i}">Please choose a dinner entrée.</div>
    </div>`).join('');
  while (selections.length < partySize) selections.push({ starter: null, drink: null, dinner: null });
  selections = selections.slice(0, partySize);
}

function bindEvents() {
  document.getElementById('submitBtn').addEventListener('click', submitOrder);
  document.getElementById('app').addEventListener('click', handleCardClick);
  document.getElementById('app').addEventListener('change', (e) => {
    if (e.target && e.target.id === 'partnerSelect') {
      selectedPartnerKey = e.target.value || '';
      document.getElementById('partnerSelect')?.classList.remove('err');
      updatePartnerJoinSummary();
      updateSeatStatus();
    }
  });
}

function handleCardClick(e) {
  /* Seat picker (Kennedy BBQ) — must run before generic .party-btn handling */
  const seatPartyBtn = e.target.closest('[data-seatparty]');
  if (seatPartyBtn) {
    seatPartyType = seatPartyBtn.dataset.seatparty;
    document.getElementById('seatparty-solo')?.classList.toggle('selected', seatPartyType === 'solo');
    document.getElementById('seatparty-couple')?.classList.toggle('selected', seatPartyType === 'couple');
    if (seatPartyType === 'solo') coupleMode = 'new';
    selSeats = [];
    selectedPartnerKey = '';
    applyCoupleModeUI();
    refreshSeatMapUI();
    return;
  }
  const coupleModeBtn = e.target.closest('[data-couplemode]');
  if (coupleModeBtn) {
    coupleMode = coupleModeBtn.dataset.couplemode === 'join' ? 'join' : 'new';
    selSeats = [];
    selectedPartnerKey = '';
    const ps = document.getElementById('partnerSelect');
    if (ps) ps.value = '';
    applyCoupleModeUI();
    if (coupleMode === 'join') {
      // Refresh list of people who already reserved
      loadSeatMap();
    } else {
      refreshSeatMapUI();
    }
    return;
  }
  const seatEl = e.target.closest('[data-seat]');
  if (seatEl) { handleSeatClick(seatEl.dataset.seat); return; }
  if (e.target.closest('#seatRefreshBtn')) { selSeats = []; loadSeatMap(); return; }
  if (e.target.closest('#seatHelpBtn')) { requestSeatAccommodation(); return; }
  if (e.target.closest('#waitlistToggleBtn')) {
    seatMapMode = seatMapMode === 'waitlist' ? 'main' : 'waitlist';
    selSeats = [];
    seatAccomRequested = false;
    paintSeatMap(seatState, []);
    return;
  }

  const filterBtn = e.target.closest('.filter-btn[data-filter]');
  if (filterBtn) {
    starterFilter = filterBtn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === filterBtn));
    renderStarterCards();
    return;
  }

  const partyBtn = e.target.closest('.party-btn');
  if (partyBtn) {
    partySize = parseInt(partyBtn.dataset.party, 10);
    document.getElementById('party-1')?.classList.toggle('selected', partySize === 1);
    document.getElementById('party-2')?.classList.toggle('selected', partySize === 2);
    renderPeople();
    return;
  }

  // BBQ: diet + beverage only (menu is display — no plate picks)
  if (LOC.type === 'buffet' && LOC.bbqMenuPick) {
    const bev = e.target.closest('.bev-card[data-pick="drink"]');
    if (bev) {
      if (selDrink) document.getElementById(`card-drink-${selDrink}`)?.classList.remove('selected');
      selDrink = bev.dataset.id;
      bev.classList.add('selected');
      document.getElementById('err-drink')?.classList.remove('show');
      return;
    }
    const dietCard = e.target.closest('.bev-card[data-pick="diet"]');
    if (dietCard) {
      if (selDiet) document.getElementById(`card-diet-${selDiet}`)?.classList.remove('selected');
      selDiet = dietCard.dataset.id;
      dietCard.classList.add('selected');
      document.getElementById('err-diet')?.classList.remove('show');
      const notesWrap = document.getElementById('diet-notes-wrap');
      if (notesWrap) notesWrap.style.display = selDiet === 'yes' ? '' : 'none';
      if (selDiet !== 'yes') document.getElementById('err-diet-notes')?.classList.remove('show');
      return;
    }
    return;
  }

  // Buffet poll UI: accordion + vote + beverage (before .card early-return)
  if (LOC.type === 'buffet') {
    const toggle = e.target.closest('[data-acc-toggle]');
    if (toggle) {
      const key = toggle.dataset.accToggle;
      const item = document.getElementById(`acc-${key}`);
      if (!item) return;
      const body = item.querySelector('.acc-body');
      const open = body && !body.hidden;
      const list = item.parentElement;
      list?.querySelectorAll('.acc-item').forEach(sib => {
        const b = sib.querySelector('.acc-body');
        const h = sib.querySelector('.acc-head');
        if (b) b.hidden = true;
        if (h) h.setAttribute('aria-expanded', 'false');
        sib.classList.remove('open');
      });
      if (!open && body) {
        body.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        item.classList.add('open');
      }
      return;
    }
    const voteBtn = e.target.closest('[data-vote]');
    if (voteBtn) {
      const kind = voteBtn.dataset.vote;
      const vid = voteBtn.dataset.id;
      if (kind === 'buffet') {
        const item = LOC.menus.buffets.find(b => b.id === vid);
        selBuffet = vid;
        markAccordionVoted('buffet', vid);
        setVoteStatus('buffet', item);
        document.getElementById('err-buffet')?.classList.remove('show');
      } else if (kind === 'starter') {
        const item = LOC.menus.starters.find(s => s.id === vid);
        selStarter = vid;
        markAccordionVoted('starter', vid);
        setVoteStatus('starter', item);
        document.getElementById('err-starter')?.classList.remove('show');
      }
      return;
    }
    const bev = e.target.closest('.bev-card[data-pick="drink"]');
    if (bev) {
      if (selDrink) document.getElementById(`card-drink-${selDrink}`)?.classList.remove('selected');
      selDrink = bev.dataset.id;
      bev.classList.add('selected');
      document.getElementById('err-drink')?.classList.remove('show');
      return;
    }
  }

  const card = e.target.closest('.card[data-pick]');
  if (!card) return;
  const pick = card.dataset.pick;
  const id = card.dataset.id || null;
  const person = card.dataset.person != null ? parseInt(card.dataset.person, 10) : null;

  if (pick === 'room') {
    if (selRoom) document.getElementById(`card-room-${selRoom}`)?.classList.remove('selected');
    selRoom = id;
    card.classList.add('selected');
    document.getElementById('err-room')?.classList.remove('show');
    return;
  }

  if (LOC.type === 'preorder') {
    if (pick === 'starter') {
      const prevId = selStarter ? `card-starter-${selStarter}` : 'card-starter-skip';
      document.getElementById(prevId)?.classList.remove('selected');
      selStarter = id || null;
      const newId = id ? `card-starter-${id}` : 'card-starter-skip';
      document.getElementById(newId)?.classList.add('selected');
      return;
    }
    if (pick === 'main') {
      if (selMain) document.getElementById(`card-main-${selMain}`)?.classList.remove('selected');
      selMain = id;
      card.classList.add('selected');
      document.getElementById('err-main')?.classList.remove('show');
      return;
    }
    if (pick === 'drink') {
      if (selDrink) document.getElementById(`card-drink-${selDrink}`)?.classList.remove('selected');
      selDrink = id;
      card.classList.add('selected');
      document.getElementById('err-drink')?.classList.remove('show');
      return;
    }
  }

  if (LOC.type === 'screening') {
    if (pick === 'salad') {
      if (selSalad) document.getElementById(`card-salad-${selSalad}`)?.classList.remove('selected');
      selSalad = id;
    } else if (pick === 'entree') {
      if (selEntree) document.getElementById(`card-entree-${selEntree}`)?.classList.remove('selected');
      selEntree = id;
    } else if (pick === 'dessert') {
      if (selDessert) document.getElementById(`card-dessert-${selDessert}`)?.classList.remove('selected');
      selDessert = id;
    } else if (pick === 'drink') {
      if (selDrink) document.getElementById(`card-drink-${selDrink}`)?.classList.remove('selected');
      selDrink = id;
    }
    card.classList.add('selected');
    document.getElementById(`err-${pick}`)?.classList.remove('show');
    return;
  }

  if (person != null) {
    const prev = selections[person][pick];
    const prevId = prev ? `card-${pick}-${person}-${prev}` : `card-${pick}-${person}-skip`;
    document.getElementById(prevId)?.classList.remove('selected');
    selections[person][pick] = id;
    const newId = id ? `card-${pick}-${person}-${id}` : `card-${pick}-${person}-skip`;
    document.getElementById(newId)?.classList.add('selected');
    if (pick === 'dinner') document.getElementById(`err-dinner-${person}`)?.classList.remove('show');
    return;
  }

}

/** Split "Jane Marie Smith" → first / last for GHL contact create */
function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * Push preference submit to HAG GHL inbound webhook.
 * Guest page cannot use host localStorage integrations — URL lives on RETIREMENT_EVEREST.
 */
async function pushGuestOrderToGHL(order) {
  const url = RETIREMENT_EVEREST.ghlWebhookUrl || LOC.ghlWebhookUrl;
  if (!url) {
    console.warn('[RE] No ghlWebhookUrl configured — skip GHL push');
    return { ok: false, reason: 'no-url' };
  }
  const { firstName, lastName } = splitName(order.name);
  const locSlug = order.locationId || LOC.id || LOC.slug || '';
  /* Full RE location block: camelCase + snake_case for {{contact.re_event_location}} */
  const locFields =
    typeof buildGhlLocationFields === 'function'
      ? buildGhlLocationFields(LOC.slug || locSlug || LOC)
      : {
          location: locSlug,
          locationSlug: locSlug,
          locationName: LOC.name || LOC.shortName || locSlug,
          locationShort: LOC.shortName || LOC.name || locSlug,
          eventLocation: LOC.shortName || LOC.name || locSlug,
          reEventLocation: LOC.shortName || LOC.name || locSlug,
          re_event_location: LOC.shortName || LOC.name || locSlug,
          reEventLocationSlug: locSlug,
          re_event_location_slug: locSlug,
          venue: LOC.venue || '',
          reVenueName: LOC.venue || '',
          re_venue_name: LOC.venue || '',
          city: LOC.city || '',
          reVenueCity: LOC.city || '',
          re_venue_city: LOC.city || '',
          eventDate: LOC.defaultEvent?.eventDate || '',
          reEventDate: LOC.defaultEvent?.eventDate || '',
          re_event_date: LOC.defaultEvent?.eventDate || ''
        };
  const eventLocationLabel = locFields.re_event_location || locFields.eventLocation || LOC.shortName || '';
  const locVenue = locFields.venue || LOC.venue || '';
  const locCity = locFields.city || LOC.city || '';
  const eventDate = locFields.eventDate || '';
  const isBbq = !!(LOC.bbqMenuPick || order.form === 'bbq-menu-pick' || order.form === 'bbq-menu-display');
  const hasSeats = !!(order.seatLabel || (Array.isArray(order.seats) && order.seats.length));
  const isWaitlist = !!(order.waitlist || order.waitlistHold);
  const pipelineStage = isWaitlist ? 'Waitlist' : hasSeats ? 'Seated' : 'Preferences Received';

  const payload = {
    // Contact (map these in GHL inbound webhook)
    firstName,
    lastName,
    name: order.name,
    email: order.email || '',
    phone: order.phone || '',
    // Event type
    event: 'preference_submitted',
    pipeline: '08/27/26 - RE Premiere Event',
    pipelineName: '08/27/26 - RE Premiere Event',
    pipelineStage,
    pipelineStageName: pipelineStage,
    status: isWaitlist ? 'waitlist' : hasSeats ? 'seated' : 'registered',
    tag: isWaitlist ? 're-waitlist' : hasSeats ? 're-seated' : 're-prefs-received',
    waitlist: isWaitlist ? 'yes' : '',
    waitlistHold: isWaitlist ? 'yes' : '',
    confirmationNote: isWaitlist ? waitlistCopy() : '',
    source: 'retirement-everest-guest',
    brand: RETIREMENT_EVEREST.ghlBrand || 'HAG',
    ghlLocationId: RETIREMENT_EVEREST.ghlLocationId || '',
    // --- RE location custom fields (all aliases) ---
    // Map ANY of: re_event_location | reEventLocation | eventLocation | locationShort
    // → custom field RE Event Location ({{contact.re_event_location}})
    ...locFields,
    // BBQ / food prefs
    buffet: order.buffet || '',
    sides: Array.isArray(order.sides) ? order.sides.join(' · ') : (order.sides || ''),
    side1: Array.isArray(order.sides) ? (order.sides[0] || '') : '',
    side2: Array.isArray(order.sides) ? (order.sides[1] || '') : '',
    entree: order.entree || order.main || '',
    dessert: order.dessert || '',
    drink: order.drink || '',
    drinkCat: order.drinkCat || '',
    dietHasRestrictions: order.dietHasRestrictions ? 'yes' : 'no',
    notes: order.notes || '',
    // Seating / couple linking
    partyType: order.partyType || '',
    spouse: order.spouse || '',
    coupleMode: order.coupleMode || '',
    joinedPartner: order.joinedPartner ? 'yes' : '',
    partnerName: order.linkedPartnerName || order.spouse || '',
    partnerEmail: order.linkedPartnerEmail || '',
    partnerPhone: order.linkedPartnerPhone || '',
    seats: Array.isArray(order.seats) ? order.seats.join(', ') : '',
    seatLabel: order.seatLabel || '',
    seatAccommodation: order.seatAccommodation ? 'yes' : '',
    // Full blob for custom field / notes
    preferencesSummary: [
      `${eventLocationLabel}${locVenue ? ` · ${locVenue}` : ''}${eventDate ? ` · ${eventDate}` : ''}`,
      `Stage: ${pipelineStage}`,
      isBbq ? 'Form: BBQ menu (display) + diet + drink + seats' : 'Form: old buffet poll — not the live BBQ menu',
      order.buffet ? `Dinner: ${order.buffet} (group buffet — no plate pick)` : '',
      order.dietHasRestrictions ? 'Dietary restrictions: YES' : (order.dietHasRestrictions === false ? 'Dietary restrictions: none' : ''),
      order.sides?.length ? `Sides (legacy pick): ${order.sides.join(' · ')}` : '',
      order.entree ? `Entrée (legacy pick): ${order.entree}` : '',
      order.dessert ? `Dessert (legacy pick): ${order.dessert}` : '',
      !isBbq && order.starter ? `Poll appetizer (ignore): ${order.starter}` : '',
      order.drink ? `Drink: ${order.drinkCat === 'Adult' ? 'Yes — adult beverage' : 'No — soft drinks included'}` : '',
      order.notes ? `Notes: ${order.notes}` : '',
      order.joinedPartner
        ? `Party: joined ${order.linkedPartnerName || order.spouse || 'partner'}`
        : (order.partyType === 'couple' ? `Party: couple${order.spouse ? ` with ${order.spouse}` : ''}` : (order.partyType ? 'Party: solo' : '')),
      order.seatLabel ? `${isWaitlist ? 'Waitlist hold' : 'Seats'}: ${order.seatLabel}` : 'Seats: not picked yet',
      isWaitlist ? waitlistCopy() : '',
      order.seatAccommodation ? 'Seating: host will arrange' : ''
    ].filter(Boolean).join('\n'),
    submittedAt: order.ts || new Date().toISOString()
  };
  try {
    // GHL allows CORS (*). Must use mode:cors + application/json.
    // no-cors strips JSON content-type → GHL returns "invalid data" and does nothing.
    const res = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text().catch(() => '');
    console.log('[RE] GHL webhook', res.status, text, payload.email || payload.phone || payload.name);
    if (!res.ok) return { ok: false, reason: `http-${res.status}`, body: text };
    // GHL returns JSON status even on some errors with HTTP 200
    if (/invalid data|error/i.test(text) && !/success/i.test(text)) {
      return { ok: false, reason: 'ghl-rejected', body: text };
    }
    return { ok: true, body: text };
  } catch (err) {
    console.error('[RE] GHL webhook failed', err);
    // Fallback: form-urlencoded (also accepted by GHL)
    try {
      const form = new URLSearchParams();
      Object.entries(payload).forEach(([k, v]) => {
        if (v != null && v !== '') form.append(k, String(v));
      });
      const res2 = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      });
      const text2 = await res2.text().catch(() => '');
      console.log('[RE] GHL webhook form fallback', res2.status, text2);
      return { ok: res2.ok, body: text2, via: 'form' };
    } catch (err2) {
      return { ok: false, reason: String(err2) };
    }
  }
}

/** Scroll the first validation problem into view (name/contact live near submit). */
function scrollToFirstError(candidates) {
  for (const sel of candidates) {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) continue;
    const isErrMsg = el.classList?.contains('err-msg');
    const isInputErr = el.classList?.contains('err');
    const isShown = !isErrMsg || el.classList.contains('show');
    if ((isErrMsg && isShown) || isInputErr || el.getAttribute?.('data-force-focus') === '1') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof el.focus === 'function' && !isErrMsg) {
        try {
          el.focus({ preventScroll: true });
        } catch (_) {
          el.focus();
        }
      }
      return true;
    }
  }
  // Fallback: any visible error message
  const shown = document.querySelector('.err-msg.show, input.err, select.err');
  if (shown) {
    shown.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (shown.tagName === 'INPUT' || shown.tagName === 'SELECT') {
      try {
        shown.focus({ preventScroll: true });
      } catch (_) {
        shown.focus();
      }
    }
    return true;
  }
  return false;
}

async function submitOrder() {
  // Clear previous contact errors
  document.getElementById('err-name')?.classList.remove('show');
  document.getElementById('err-contact')?.classList.remove('show');

  const name = document.getElementById('guestName').value.trim();
  const email = (document.getElementById('guestEmail')?.value || '').trim();
  const phone = (document.getElementById('guestPhone')?.value || '').trim();
  const nameEl = document.getElementById('guestName');
  const emailEl = document.getElementById('guestEmail');
  const phoneEl = document.getElementById('guestPhone');
  nameEl?.classList.toggle('err', !name);
  const contactOk = !!(email || phone);
  if (emailEl) emailEl.classList.toggle('err', !contactOk);
  if (phoneEl) phoneEl.classList.toggle('err', !contactOk);

  if (!name) {
    document.getElementById('err-name')?.classList.add('show');
    scrollToFirstError(['#guestName', '#err-name', '#guest-contact-card']);
    return;
  }
  if (!contactOk) {
    document.getElementById('err-contact')?.classList.add('show');
    scrollToFirstError(['#guestEmail', '#guestPhone', '#err-contact', '#guest-contact-card']);
    return;
  }

  let order, successHTML;

  if (LOC.type === 'buffet' && LOC.bbqMenuPick) {
    let ok = true;
    if (!selDiet) { document.getElementById('err-diet')?.classList.add('show'); ok = false; }
    const notesRaw = (document.getElementById('guestNotes')?.value || '').trim();
    if (selDiet === 'yes' && !notesRaw) { document.getElementById('err-diet-notes')?.classList.add('show'); ok = false; }
    if (!selDrink) { document.getElementById('err-drink')?.classList.add('show'); ok = false; }
    if (!ok) {
      scrollToFirstError(['#err-diet', '#err-diet-notes', '#err-drink', '#diet-cards', '#drink-cards']);
      return;
    }
    const drink = LOC.menus.drinks.find(d => d.id === selDrink);
    const drinkBucket = drink.cat === 'Adult' || drink.id === 'd-adult' ? 'Adult' : 'Soft';
    const notes = selDiet === 'yes' ? notesRaw : (notesRaw || 'No restrictions');
    const buffetName = LOC.menus.buffetName || 'Backyard Barbecue Buffet';

    /* --- Seat reservation / partner join --- */
    const isJoinPartner = window.RESeating && seatPartyType === 'couple' && coupleMode === 'join';
    const spouseNameVal = isJoinPartner
      ? null
      : ((document.getElementById('spouseName')?.value || '').trim() || null);
    const selectedPartner = isJoinPartner ? getSelectedPartner() : null;

    if (isJoinPartner) {
      if (!selectedPartner) {
        document.getElementById('partnerSelect')?.classList.add('err');
        alert('Select your partner who already reserved from the dropdown — or switch to “We\'re reserving together” if you need to pick seats.');
        document.getElementById('spouse-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    } else if (window.RESeating && seatPartyType === 'couple' && !spouseNameVal && selSeats.length) {
      document.getElementById('spouseName')?.classList.add('err');
      document.getElementById('spouseName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try {
        document.getElementById('spouseName')?.focus({ preventScroll: true });
      } catch (_) {
        document.getElementById('spouseName')?.focus();
      }
      return;
    }

    if (window.RESeating && !isJoinPartner && !selSeats.length && !seatAccomRequested) {
      document.getElementById('err-seat')?.classList.add('show');
      if (!confirm('You haven\'t reserved a seat yet. Continue without one? (We\'ll seat you on arrival.)')) {
        document.getElementById('seatmap-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    let seatClaim = null;
    let partnerAttach = null;
    const btn0 = document.getElementById('submitBtn');

    if (isJoinPartner && selectedPartner) {
      btn0.disabled = true;
      btn0.innerHTML = '<span class="spinner"></span>Linking to your partner\'s seats…';
      try {
        partnerAttach = await RESeating.attachPartnerToCouple(selectedPartner, { name, email, phone });
        selSeats = partnerAttach.seats || selectedPartner.seats || [];
      } catch (e) {
        console.warn('[RE] partner attach error', e);
        btn0.disabled = false;
        btn0.textContent = 'Submit Diet & Drink Notes';
        alert(String(e.message || e) || 'Could not link to your partner\'s seats. Refresh and try again, or contact the host.');
        await loadSeatMap();
        return;
      }
      // GHL + command-center couple link event
      try {
        await RESeating.pushSeatEventToGHL({
          event: 'couple_linked',
          form: 'partner-join',
          name,
          email,
          phone,
          firstName: splitName(name).firstName,
          lastName: splitName(name).lastName,
          partnerName: selectedPartner.name,
          partnerEmail: selectedPartner.email || '',
          partnerPhone: selectedPartner.phone || '',
          seats: (partnerAttach.seats || []).join(', '),
          seatLabel: partnerAttach.seatLabel || selectedPartner.seatLabel || '',
          location: LOC.id,
          locationName: LOC.name,
          preferencesSummary: `PARTNER JOINED\n${name} (${email || phone}) joined seats reserved by ${selectedPartner.name} (${selectedPartner.email || selectedPartner.phone || ''})\nSeats: ${partnerAttach.seatLabel || selectedPartner.seatLabel || ''}\nLink/create partner-spouse contact in CRM.`
        });
      } catch (e) {
        console.warn('[RE] couple_linked GHL push failed', e);
      }
    } else if (window.RESeating && selSeats.length) {
      btn0.disabled = true;
      btn0.innerHTML = '<span class="spinner"></span>Reserving your seats…';
      try {
        seatClaim = await RESeating.claimSeats(selSeats, {
          name, email, phone, partyType: seatPartyType, spouse: spouseNameVal,
          map: seatMapMode === 'waitlist' ? 'waitlist' : 'main'
        });
      } catch (e) {
        console.warn('[RE] seat claim error', e);
        seatClaim = { ok: false, taken: [], error: String(e) };
      }
      if (!seatClaim.ok) {
        btn0.disabled = false;
        btn0.textContent = 'Submit Diet & Drink Notes';
        alert('So sorry — one of those seats was just taken by another guest. The map has been refreshed; please pick again (or tap the arrangements button).');
        selSeats = [];
        await loadSeatMap();
        document.getElementById('seatmap-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      // First-time couple → notify GHL of pending partner so workflow can prep spouse record
      if (seatPartyType === 'couple' && spouseNameVal) {
        try {
          await RESeating.pushSeatEventToGHL({
            event: 'couple_reserved',
            form: 'couple-reserve',
            name, email, phone,
            firstName: splitName(name).firstName,
            lastName: splitName(name).lastName,
            partnerName: spouseNameVal,
            partnerEmail: '',
            partnerPhone: '',
            seats: selSeats.join(', '),
            seatLabel: RESeating.seatLabel(selSeats),
            location: LOC.id,
            locationName: LOC.name,
            preferencesSummary: `COUPLE RESERVED\n${name} reserved seats for self + ${spouseNameVal}\nSeats: ${RESeating.seatLabel(selSeats)}\nPartner will submit own diet & drink notes via “Partner already reserved.”`
          });
        } catch (e) {
          console.warn('[RE] couple_reserved GHL push failed', e);
        }
      }
    }

    const joinSeats = isJoinPartner
      ? (partnerAttach?.seats || selectedPartner?.seats || [])
      : selSeats;
    const joinSeatLabel = isJoinPartner
      ? (partnerAttach?.seatLabel || selectedPartner?.seatLabel || (joinSeats.length ? RESeating.seatLabel(joinSeats) : null))
      : (selSeats.length ? RESeating.seatLabel(selSeats) : null);

    order = {
      id: Date.now(), locationId: LOC.id, name, email, phone,
      form: 'bbq-menu-display',
      partyType: window.RESeating ? seatPartyType : undefined,
      /* Join partner = 1 meal prefs row; primary couple still 2 until partner joins */
      partySize: isJoinPartner ? 1 : (seatPartyType === 'couple' ? 2 : 1),
      spouse: isJoinPartner ? (selectedPartner?.name || null) : spouseNameVal,
      joinedPartner: isJoinPartner || null,
      linkedPartnerName: isJoinPartner ? (selectedPartner?.name || '') : '',
      linkedPartnerEmail: isJoinPartner ? (selectedPartner?.email || '') : '',
      linkedPartnerPhone: isJoinPartner ? (selectedPartner?.phone || '') : '',
      coupleMode: window.RESeating && seatPartyType === 'couple' ? coupleMode : undefined,
      seats: joinSeats.length ? [...joinSeats] : null,
      seatLabel: joinSeatLabel,
      waitlist: seatMapMode === 'waitlist' || null,
      waitlistHold: seatMapMode === 'waitlist' || null,
      confirmationNote: seatMapMode === 'waitlist' ? waitlistCopy() : '',
      seatAccommodation: (!isJoinPartner && seatAccomRequested) || null,
      buffet: buffetName, buffetId: LOC.lockedBuffetId || 'b-bbq', buffetPrice: LOC.menus.buffetPrice || 63.50,
      buffetLocked: true,
      sides: [],
      sideIds: [],
      entree: '', entreeId: '',
      dessert: '', dessertId: '',
      dietHasRestrictions: selDiet === 'yes',
      drink: drink.name, drinkId: drink.id, drinkPrice: drink.price || 0,
      drinkCat: drinkBucket,
      notes: notes || null,
      ts: new Date().toISOString()
    };
    successHTML = `<div class="sc-row"><div class="sc-label">Name</div><div class="sc-val">${esc(name)}</div></div>
      <div class="sc-row"><div class="sc-label">Contact</div><div class="sc-val">${esc([email, phone].filter(Boolean).join(' · '))}</div></div>
      <div class="sc-row"><div class="sc-label">Dinner</div><div class="sc-val">${esc(buffetName)} — group buffet, no plate pick</div></div>
      <div class="sc-row"><div class="sc-label">Dietary</div><div class="sc-val">${esc(selDiet === 'yes' ? notes : 'No restrictions')}</div></div>
      <div class="sc-row"><div class="sc-label">Adult drink</div><div class="sc-val">${drinkBucket === 'Adult' ? 'Yes — interested' : 'No — included coffee / tea / soda is fine'}</div></div>
      ${order.joinedPartner
        ? `<div class="sc-row"><div class="sc-label">Joined partner</div><div class="sc-val">${esc(order.linkedPartnerName)} — your seats stay with them</div></div>`
        : (order.spouse ? `<div class="sc-row"><div class="sc-label">Attending with</div><div class="sc-val">${esc(order.spouse)}</div></div>` : '')}
      ${order.seatLabel ? `<div class="sc-row"><div class="sc-label">${order.waitlist ? 'Waitlist hold' : `Your seat${(order.seats || []).length > 1 ? 's' : ''}`}</div><div class="sc-val" style="color:var(--accent,#c9a44a);font-weight:700">${esc(order.seatLabel)}</div></div>` : ''}
      ${order.waitlist ? `<div class="sc-row"><div class="sc-label">Important</div><div class="sc-val">This is a waitlist hold — not a confirmed seat. If it opens we will contact you so you can claim it. You must claim it promptly when we reach you, or it will be offered to the next person on the list.</div></div>` : ''}
      ${order.seatAccommodation ? `<div class="sc-row"><div class="sc-label">Seating</div><div class="sc-val">We'll personally arrange your seats and confirm with you.</div></div>` : ''}`;
  } else if (LOC.type === 'buffet') {
    let ok = true;
    if (!selBuffet) { document.getElementById('err-buffet')?.classList.add('show'); ok = false; }
    if (!selStarter) { document.getElementById('err-starter').classList.add('show'); ok = false; }
    if (!selDrink) { document.getElementById('err-drink').classList.add('show'); ok = false; }
    if (!ok) return;
    const buffet = LOC.menus.buffets.find(b => b.id === selBuffet);
    const starter = LOC.menus.starters.find(s => s.id === selStarter);
    const drink = LOC.menus.drinks.find(d => d.id === selDrink);
    const drinkBucket = drink.cat === 'Adult' || drink.id === 'd-adult' ? 'Adult' : 'Soft';
    order = {
      id: Date.now(), locationId: LOC.id, name, email, phone,
      buffet: buffet.name, buffetId: buffet.id, buffetPrice: buffet.price,
      starter: starter.name, starterId: starter.id, starterPrice: starter.price || 0,
      drink: drink.name, drinkId: drink.id, drinkPrice: drink.price || 0,
      drinkCat: drinkBucket,
      ts: new Date().toISOString()
    };
    successHTML = `<div class="sc-row"><div class="sc-label">Name</div><div class="sc-val">${esc(name)}</div></div>
      <div class="sc-row"><div class="sc-label">Buffet vote</div><div class="sc-val">${esc(buffet.name)}</div></div>
      <div class="sc-row"><div class="sc-label">Appetizers</div><div class="sc-val">${esc(starter.name)}</div></div>
      <div class="sc-row"><div class="sc-label">Beverage</div><div class="sc-val">${esc(drink.name)} (${drinkBucket === 'Adult' ? 'adult' : 'coffee / tea / soda'})</div></div>`;
  } else if (LOC.type === 'preorder') {
    let ok = true;
    if (!selMain) { document.getElementById('err-main').classList.add('show'); ok = false; }
    if (!selDrink) { document.getElementById('err-drink').classList.add('show'); ok = false; }
    if (!ok) return;
    const starter = selStarter ? LOC.menus.starters.find(s => s.id === selStarter) : null;
    const main = LOC.menus.mains.find(m => m.id === selMain);
    const drink = LOC.menus.drinks.find(d => d.id === selDrink);
    order = {
      id: Date.now(), locationId: LOC.id, name, email, phone,
      starter: starter?.name || null, starterId: starter?.id || null, starterPrice: starter?.price || 0,
      main: main.name, mainId: main.id, mainPrice: main.price,
      drink: drink.name, drinkId: drink.id, drinkPrice: drink.price,
      ts: new Date().toISOString()
    };
    successHTML = `${starter ? `<div class="sc-row"><div class="sc-label">Arrival Bite</div><div class="sc-val">${esc(starter.name)}</div></div>` : ''}
      <div class="sc-row"><div class="sc-label">Main Course</div><div class="sc-val">${esc(main.name)}</div></div>
      <div class="sc-row"><div class="sc-label">Drink</div><div class="sc-val">${esc(drink.name)}</div></div>`;
  } else if (LOC.type === 'screening') {
    let ok = true;
    if (!selSalad) { document.getElementById('err-salad').classList.add('show'); ok = false; }
    if (!selEntree) { document.getElementById('err-entree').classList.add('show'); ok = false; }
    if (!selDessert) { document.getElementById('err-dessert').classList.add('show'); ok = false; }
    if (LOC.menus.drinks?.length && !selDrink) { document.getElementById('err-drink').classList.add('show'); ok = false; }
    if (!ok) return;
    const salad = LOC.menus.salads.find(s => s.id === selSalad);
    const entree = LOC.menus.entrees.find(s => s.id === selEntree);
    const dessert = LOC.menus.desserts.find(s => s.id === selDessert);
    const drink = selDrink ? LOC.menus.drinks.find(d => d.id === selDrink) : null;
    order = {
      id: Date.now(), locationId: LOC.id, name, email, phone,
      salad: salad.name, saladId: salad.id,
      entree: entree.name, entreeId: entree.id, entreePrice: entree.price,
      dessert: dessert.name, dessertId: dessert.id,
      drink: drink?.name || null, drinkId: drink?.id || null, drinkPrice: drink?.price || 0,
      ts: new Date().toISOString()
    };
    successHTML = `<div class="sc-row"><div class="sc-label">Name</div><div class="sc-val">${esc(name)}</div></div>
      <div class="sc-row"><div class="sc-label">Salad</div><div class="sc-val">${esc(salad.name)}</div></div>
      <div class="sc-row"><div class="sc-label">Entrée</div><div class="sc-val">${esc(entree.name)}</div></div>
      <div class="sc-row"><div class="sc-label">Dessert</div><div class="sc-val">${esc(dessert.name)}</div></div>
      ${drink ? `<div class="sc-row"><div class="sc-label">Drink</div><div class="sc-val">${esc(drink.name)}</div></div>` : ''}`;
  } else if (LOC.type === 'retreat') {
    let ok = true;
    if (!selRoom) { document.getElementById('err-room').classList.add('show'); ok = false; }
    for (let i = 0; i < partySize; i++) {
      if (!selections[i].dinner) { document.getElementById(`err-dinner-${i}`).classList.add('show'); ok = false; }
    }
    if (!ok) return;
    const room = LOC.menus.rooms.find(r => r.id === selRoom);
    const peopleData = selections.slice(0, partySize).map(sel => {
      const starter = sel.starter ? LOC.menus.starters.find(s => s.id === sel.starter) : null;
      const drink = sel.drink ? LOC.menus.drinks.find(d => d.id === sel.drink) : null;
      const dinner = LOC.menus.dinners.find(d => d.id === sel.dinner);
      return { starter: starter?.name || null, drink: drink?.name || null, dinner: dinner.name, dinnerId: dinner.id, dinnerPrice: dinner.price };
    });
    order = { id: Date.now(), locationId: LOC.id, name, email, phone, room: room.name, roomId: room.id, partySize, people: peopleData, ts: new Date().toISOString() };
    const peopleHTML = peopleData.map((p, i) => `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        ${partySize > 1 ? `<div class="sc-label">Person ${i+1}</div>` : ''}
        ${p.starter ? `<div class="sc-row"><div class="sc-label">Starter</div><div class="sc-val">${esc(p.starter)}</div></div>` : ''}
        ${p.drink ? `<div class="sc-row"><div class="sc-label">Drink</div><div class="sc-val">${esc(p.drink)}</div></div>` : ''}
        <div class="sc-row"><div class="sc-label">Dinner</div><div class="sc-val">${esc(p.dinner)}</div></div>
      </div>`).join('');
    successHTML = `<div class="sc-row"><div class="sc-label">Name</div><div class="sc-val">${esc(name)}</div></div>
      <div class="sc-row"><div class="sc-label">Room</div><div class="sc-val">${esc(room.name)}</div></div>${peopleHTML}`;
  } else {
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Confirming…';
  const all = JSON.parse(localStorage.getItem(LOC.storageKey) || '[]');
  all.push(order);
  localStorage.setItem(LOC.storageKey, JSON.stringify(all));

  // 1) HAG GHL  2) shared multi-device log (command center)  3) email Johnny a report
  const ghlResult = await pushGuestOrderToGHL(order);
  let sharedOk = false;
  let emailOk = false;
  if (window.RESharedOrders) {
    try {
      await RESharedOrders.appendSharedOrder({
        ...order,
        location: order.locationId,
        source: 'retirement-everest-guest'
      });
      sharedOk = true;
    } catch (e) {
      console.warn('[RE] shared log write failed', e);
    }
    try {
      const er = await RESharedOrders.emailHostReport(order, {
        preferencesSummary: [
          `Name: ${order.name}`,
          `Email: ${order.email || ''}`,
          `Phone: ${order.phone || ''}`,
          order.buffet ? `Dinner: ${order.buffet}` : '',
          order.sides?.length ? `Sides: ${order.sides.join(' · ')}` : '',
          order.entree ? `Entrée: ${order.entree}` : '',
          order.dessert ? `Dessert: ${order.dessert}` : '',
          order.drink ? `Drink: ${order.drink}${order.drinkCat ? ` (${order.drinkCat})` : ''}` : '',
          order.notes ? `Notes: ${order.notes}` : '',
          order.joinedPartner
            ? `Party: Joined partner — with ${order.linkedPartnerName || order.spouse || ''}`
            : (order.partyType === 'couple' ? `Party: Couple${order.spouse ? ` — with ${order.spouse}` : ''}` : (order.partyType ? 'Party: Solo' : '')),
          order.seatLabel ? `${order.waitlist ? 'Waitlist hold' : 'Seats'}: ${order.seatLabel}` : '',
          order.waitlist ? waitlistCopy() : '',
          order.seatAccommodation ? 'SEATING: needs personal arrangement' : ''
        ].filter(Boolean).join('\n')
      });
      emailOk = !!er.ok;
    } catch (e) {
      console.warn('[RE] host email report failed', e);
    }
  }
  console.log('[RE] submit pipeline', { ghl: ghlResult, sharedOk, emailOk });

  document.querySelector('.order-section').style.display = 'none';
  document.getElementById('success').classList.add('show');
  document.getElementById('success-card').innerHTML = successHTML;
  document.getElementById('success').querySelector('h2').textContent =
    order.waitlist ? "You're on the waitlist." : "You're confirmed.";
  document.getElementById('success').querySelector('p').textContent =
    order.waitlist
      ? 'This is not a confirmed seat. If it opens we will contact you so you can claim it. You must claim it promptly when we reach you, or it will be offered to the next person on the list.'
      : `We look forward to hosting you at ${LOC.shortName}. A confirmation will follow shortly if you shared email or mobile.`;
}

document.addEventListener('DOMContentLoaded', initGuest);