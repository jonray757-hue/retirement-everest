function getLocationSlug() {
  const p = new URLSearchParams(location.search);
  return p.get('location') || p.get('loc') || '';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
    <div class="card-desc">${esc(item.desc)}</div>
  </div>`;
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

function initGuest() {
  const slug = getLocationSlug();
  LOC = RETIREMENT_EVEREST.locations[slug];
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
  const heroImgHTML = hero?.image ? `
      <picture>
        ${hero.imageMobile ? `<source media="(max-width: 768px)" srcset="${hero.imageMobile}">` : ''}
        <img src="${hero.image}" alt="${hero.alt || 'Retirement Everest'}" loading="eager">
      </picture>
      <div class="hero-overlay"></div>` : '';

  document.getElementById('app').innerHTML = `
    <a class="back-link" href="index.html">← All locations</a>
    <div class="hero${hero?.image ? ' hero--has-poster' : ''}">
      <div class="hero-bg theme-${LOC.theme}-bg${hero?.image ? ' has-image' : ''}">${heroImgHTML}</div>
      <div class="hero-content">
        <div class="eyebrow">From Award-Winning Film Producers Brett Kitchen &amp; Ethan Kap</div>
        <h1>Retirement<em>Everest</em></h1>
        <p class="hero-sub">${LOC.heroSub}</p>
        <div class="event-meta">${metaHTML}</div>
        <a href="#order" class="hero-cta">${LOC.cta}</a>
      </div>
    </div>
    <div class="about"><div class="section-label">${LOC.aboutLabel}</div><h2>${LOC.aboutHeadline}</h2>${aboutHTML}</div>
    <div class="expect"><div class="section-label">What to Expect</div><div class="expect-grid">${expectHTML}</div></div>
    <div class="divider"><div class="divider-quote">"The biggest financial risks in retirement aren't the ones most people are <span>preparing for.</span>"</div></div>
    <div class="order-section" id="order">
      <div class="section-label">${LOC.formLabel}</div>
      <h2>${LOC.formTitle}</h2>
      <p class="order-intro">${LOC.formIntro}</p>
      ${LOC.formNote ? `<div class="order-note">${LOC.formNote}</div>` : ''}
      <div class="field-wrap"><label class="field-label" for="guestName">Your Full Name</label>
        <input type="text" id="guestName" placeholder="First and last name" autocomplete="name"></div>
      <div id="form-fields"></div>
      <div class="submit-area">
        <button class="submit-btn" id="submitBtn">${LOC.type === 'preorder' || LOC.type === 'buffet' ? 'Confirm My Preferences' : 'Confirm My Reservation'}</button>
        <p class="submit-legal">Your selections help us prepare for your ${LOC.type === 'retreat' ? 'stay' : 'evening'}. By submitting, you confirm your intent to attend.</p>
      </div>
    </div>
    <div class="success" id="success">
      <div class="success-ring">✓</div>
      <h2>You're confirmed.</h2>
      <p>We look forward to hosting you at ${LOC.shortName}. A reminder with details will follow closer to the date.</p>
      <div class="success-card" id="success-card"></div>
    </div>
    <footer>${LOC.footer}</footer>
  `;
  renderFormFields();
}

function renderFormFields() {
  const el = document.getElementById('form-fields');
  if (LOC.type === 'buffet') {
    el.innerHTML = `
      <div class="pick-head"><span class="pick-title">Preferred Buffet</span><span class="pick-req">Select one · group popularity poll</span></div>
      <p class="order-intro" style="margin-top:0;font-size:0.9rem">We order <strong>one buffet for everyone</strong>. Pick the package you’d be happiest with.</p>
      <div class="cards" id="buffet-cards">${LOC.menus.buffets.map(b => cardHTML('buffet', 'buffet', null, b, false)).join('')}</div>
      <div class="err-msg" id="err-buffet">Please choose a preferred buffet.</div>
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Shared Appetizers (Starters)</span><span class="pick-req">Select one · optional package for the group</span></div>
      <p class="order-intro" style="margin-top:0;font-size:0.9rem">Buffet packages do <strong>not</strong> include a plated starter. Vote for a shared appetizer package if you’d like something before the buffet — or choose “No appetizers.”</p>
      <div class="cards" id="starter-cards">${LOC.menus.starters.map(s => cardHTML('starter', 'starter', null, s, false)).join('')}</div>
      <div class="err-msg" id="err-starter">Please choose a starter preference (or “No appetizers”).</div>
      <div class="section-gap"></div>
      <div class="pick-head"><span class="pick-title">Beverage Preference</span><span class="pick-req">Select one</span></div>
      <div class="cards" id="drink-cards">${LOC.menus.drinks.map(d => cardHTML('drink', 'drink', null, d, false)).join('')}</div>
      <div class="err-msg" id="err-drink">Please choose water, soda, or an alcoholic drink.</div>`;
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
}

function handleCardClick(e) {
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

  if (LOC.type === 'buffet') {
    if (pick === 'buffet') {
      if (selBuffet) document.getElementById(`card-buffet-${selBuffet}`)?.classList.remove('selected');
      selBuffet = id;
      card.classList.add('selected');
      document.getElementById('err-buffet')?.classList.remove('show');
      return;
    }
    if (pick === 'starter') {
      if (selStarter) document.getElementById(`card-starter-${selStarter}`)?.classList.remove('selected');
      selStarter = id;
      card.classList.add('selected');
      document.getElementById('err-starter')?.classList.remove('show');
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

function submitOrder() {
  const name = document.getElementById('guestName').value.trim();
  document.getElementById('guestName').classList.toggle('err', !name);
  if (!name) return;

  let order, successHTML;

  if (LOC.type === 'buffet') {
    let ok = true;
    if (!selBuffet) { document.getElementById('err-buffet').classList.add('show'); ok = false; }
    if (!selStarter) { document.getElementById('err-starter').classList.add('show'); ok = false; }
    if (!selDrink) { document.getElementById('err-drink').classList.add('show'); ok = false; }
    if (!ok) return;
    const buffet = LOC.menus.buffets.find(b => b.id === selBuffet);
    const starter = LOC.menus.starters.find(s => s.id === selStarter);
    const drink = LOC.menus.drinks.find(d => d.id === selDrink);
    order = {
      id: Date.now(), locationId: LOC.id, name,
      buffet: buffet.name, buffetId: buffet.id, buffetPrice: buffet.price,
      starter: starter.name, starterId: starter.id, starterPrice: starter.price || 0,
      drink: drink.name, drinkId: drink.id, drinkPrice: drink.price || 0,
      drinkCat: drink.cat || null,
      ts: new Date().toISOString()
    };
    successHTML = `<div class="sc-row"><div class="sc-label">Name</div><div class="sc-val">${esc(name)}</div></div>
      <div class="sc-row"><div class="sc-label">Preferred Buffet</div><div class="sc-val">${esc(buffet.name)}</div></div>
      <div class="sc-row"><div class="sc-label">Appetizers</div><div class="sc-val">${esc(starter.name)}</div></div>
      <div class="sc-row"><div class="sc-label">Beverage</div><div class="sc-val">${esc(drink.name)}</div></div>`;
  } else if (LOC.type === 'preorder') {
    let ok = true;
    if (!selMain) { document.getElementById('err-main').classList.add('show'); ok = false; }
    if (!selDrink) { document.getElementById('err-drink').classList.add('show'); ok = false; }
    if (!ok) return;
    const starter = selStarter ? LOC.menus.starters.find(s => s.id === selStarter) : null;
    const main = LOC.menus.mains.find(m => m.id === selMain);
    const drink = LOC.menus.drinks.find(d => d.id === selDrink);
    order = {
      id: Date.now(), locationId: LOC.id, name,
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
      id: Date.now(), locationId: LOC.id, name,
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
    order = { id: Date.now(), locationId: LOC.id, name, room: room.name, roomId: room.id, partySize, people: peopleData, ts: new Date().toISOString() };
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
  document.querySelector('.order-section').style.display = 'none';
  document.getElementById('success').classList.add('show');
  document.getElementById('success-card').innerHTML = successHTML;
}

document.addEventListener('DOMContentLoaded', initGuest);