// Location config — to add a venue, fill templates/location-template.json and see docs/ADD-LOCATION.md
window.RETIREMENT_EVEREST = {
  series: 'Retirement Everest',
  hostPassword: '1234',
  hero: {
    image: 'assets/hero-poster.jpg',
    imageMobile: 'assets/hero-poster-mobile.jpg',
    source: 'assets/retirement-everest-poster-source.jpg',
    alt: 'Retirement Everest documentary poster'
  },
  locations: {
    edgefield: {
      id: 'edgefield',
      slug: 'edgefield',
      type: 'screening',
      theme: 'gold',
      name: 'McMenamins Edgefield',
      shortName: 'Edgefield',
      city: 'Troutdale, OR',
      venue: 'Power Station Theater',
      storageKey: 'edgefield_orders_v1',
      attachments: [
        { name: "Full Edgefield Banquet June '26", path: "data/venue-attachments/Full Edgefield Banquet June '26.pdf", kind: 'menu' }
      ],
      heroSub: 'A private film screening & plated dinner experience at McMenamins Edgefield.',
      cta: 'Reserve Your Seat',
      meta: [
        { strong: 'McMenamins Edgefield', label: 'Troutdale, OR' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Limited', label: 'Seats Available' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary that explores the financial risks most Americans face in retirement and the strategies that can make the difference between struggle and security.",
        "The evening takes place at McMenamins Edgefield's own Power Station Theater, followed by a plated dinner prepared specially for our group. No pressure, no pitch. Just a conversation worth having."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: "Doors open 15 minutes before showtime at Edgefield's historic Power Station Theater. A relaxed, private atmosphere from the moment you walk in." },
        { title: 'Watch the Film', desc: "Retirement Everest screens in Edgefield's own theater — real stories, real clarity, told with the comfort of rocker seating." },
        { title: 'A Plated Dinner', desc: 'Afterward, enjoy a complimentary plated dinner — your salad, entrée, and dessert selections served at your table.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Dinner Selection',
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your salad, entrée, dessert, and drink below so we can have it ready for you.',
      footer: 'Retirement Everest · Private Screening Series · McMenamins Edgefield · Troutdale, OR',
      menus: {
        salads: [
          { id: 'sal1', name: 'Café Green Salad', desc: 'Grape tomatoes, cucumbers, marinated red onions, Black Rabbit vinaigrette' },
          { id: 'sal2', name: 'Northwest Spinach Salad', desc: 'Goat cheese, hazelnuts & marionberry vinaigrette', veg: true }
        ],
        entrees: [
          { id: 'e1', name: 'Wild Mushroom Ravioli', desc: 'Roasted garlic-basil cream sauce', price: 66, veg: true },
          { id: 'e2', name: 'Jamaican Rice Bowl', desc: 'Coconut curry, squash, cabbage, red bell pepper, carrot, celery, onion, black beans, avocado, mango chutney, cilantro over rice', price: 66, vegan: true },
          { id: 'e3', name: 'Seven-Herb Roasted Chicken Breast', desc: "Mushroom pan gravy, wild rice pilaf, chef's choice of vegetables", price: 66 },
          { id: 'e4', name: 'Grilled Polenta', desc: "Braised mushrooms, Brussels sprouts hash, grilled radicchio, balsamic syrup, chef's choice of vegetables", price: 66, veg: true },
          { id: 'e5', name: 'Grilled Pork Medallions', desc: "Bramble & Briar demi-glace, Yukon Gold mashed potatoes, chef's choice of vegetables", price: 66 },
          { id: 'e6', name: 'Pan-Seared Salmon Fillet', desc: "Edgefield Pinot Gris beurre blanc, wild rice pilaf, fresh herbs, chef's choice of vegetables", price: 79 },
          { id: 'e7', name: 'Bacon-Wrapped Fillet of Beef', desc: "Peppered Hogshead demi-glace, truffled mashed potatoes, chef's choice of vegetables", price: 89 }
        ],
        desserts: [
          { id: 'des1', name: 'Basque Cheesecake', desc: 'Deeply caramelized with a creamy center, seasonal toppings & whipped cream' },
          { id: 'des2', name: 'Chocolate Terminator Stout Bundt Cake', desc: 'Chocolate sauce, raspberry ruby sauce & whipped cream' },
          { id: 'des3', name: 'Lemon Bundt Cake', desc: 'Fresh mixed berries & whipped cream' },
          { id: 'des4', name: "Satin's Tiramisu", desc: 'Espresso & rum-soaked sponge, mascarpone mousse, whipped cream, Dutch cocoa' }
        ],
        drinks: [
          { id: 'd1', name: 'McMenamins Beer (Pint)', desc: 'House-brewed craft beer — brewed on property at Edgefield', price: 6.50 },
          { id: 'd2', name: 'Edgefield Hard Cider (Pint)', desc: 'McMenamins Edgefield cider', price: 6.50 },
          { id: 'd3', name: 'Edgefield Wine (Glass)', desc: "Red or white — Black Rabbit Red, White Rabbit, Pinot Noir & more", price: 8.00 },
          { id: 'd4', name: 'Well Cocktail', desc: 'Bourbon, gin, vodka, tequila, rum, scotch, or brandy', price: 8.00 },
          { id: 'd5', name: 'Featured Illustrated Cocktail', desc: "Tonight's special hand-crafted cocktail", price: 12.00 },
          { id: 'd6', name: 'Brewery Flight', desc: 'Six samples of McMenamins house-brewed beers', price: 13.50 },
          { id: 'd7', name: 'Soft Drink / Non-Alcoholic', desc: 'Soda, sparkling water, coffee, tea, or juice', price: 4.25 }
        ]
      },
      costSim: {
        quoteDate: '2026-07-13',
        source: 'Cynthia Major (CynthiaM@mcmenamins.com) + Full Edgefield Banquet June 2026 PDF',
        budgetOk: false,
        fbMin: 3500,
        servicePct: 0.21,
        roomFee: 0,
        avFee: 275,
        packagePp: 75,
        drinkPp: 8,
        roomName: 'Ballroom (theater evenings N/A)',
        note: 'REAL QUOTE 2026-07-13 (Cynthia Major) + banquet PDF. Power Station Theater NOT available for private evening rentals. Ballroom evening F&B min $3,500 + 21% SC. AV: screen $75 / projector $125 / mic $75. Menu food often BELOW min — host still pays the $3,500 floor. OVER $3k policy → parked for this series. Phone 503.492.2777. PDF: data/venue-attachments/Full Edgefield Banquet June \'26.pdf',
        scenarios: [
          { guests: 30, median: 4510, p10: 4510, p90: 4961, perGuest: 150 },
          { guests: 35, median: 4510, p10: 4510, p90: 4961, perGuest: 129 },
          { guests: 40, median: 4510, p10: 4510, p90: 4961, perGuest: 113 }
        ]
      }
    },
    bonneville: {
      id: 'bonneville',
      slug: 'bonneville',
      type: 'retreat',
      theme: 'forest',
      name: 'Bonneville Hot Springs Resort & Spa',
      shortName: 'Bonneville',
      city: 'North Bonneville, WA',
      venue: 'Pacific Crest Restaurant',
      storageKey: 'bonneville_orders_v2',
      avgRoomRate: 150,
      heroSub: 'A private film screening, dinner, and overnight retreat at Bonneville Hot Springs Resort & Spa.',
      cta: 'Reserve Your Stay',
      meta: [
        { strong: 'Bonneville Hot Springs', label: 'Columbia River Gorge, WA' },
        { strong: 'Complimentary', label: '1-Night Stay + Dinner' },
        { strong: 'Limited', label: 'Rooms Available' }
      ],
      aboutLabel: 'About the Retreat',
      aboutHeadline: "This is not a seminar.<br>It's a private retreat.",
      about: [
        "You've been personally invited to a private screening of <strong>Retirement Everest</strong> — a powerful documentary exploring the financial risks most Americans face heading into retirement, paired with an overnight stay at Bonneville Hot Springs Resort & Spa in the Columbia River Gorge.",
        "Soak in centuries-old mineral hot springs, enjoy a complimentary dinner at the resort's Pacific Crest restaurant, and watch the film in a relaxed, private setting — all on us. No pressure, no pitch. Just an experience worth having."
      ],
      expect: [
        { title: 'Arrive & Soak', desc: "Check in to your complimentary room, unwind in the resort's mineral-fed hot springs, and enjoy a light starter and drink before the film." },
        { title: 'Watch the Film', desc: 'Retirement Everest screens in a private, relaxed setting — real stories, real clarity.' },
        { title: 'Dinner', desc: "Afterward, enjoy a full dinner at Pacific Crest — your selections prepared and ready." },
        { title: 'Rest & Reflect', desc: 'Spend the night at the resort. Wake up to the Gorge at your own pace — no early checkout pressure.' }
      ],
      formTitle: 'Reserve Your Room & Dinner',
      formLabel: 'Your Stay & Dinner Selection',
      formIntro: 'Your one-night stay, starter, drink, and dinner are included — complimentary, no strings attached.<br>Select below so we can have everything ready for your arrival.',
      formNote: '🏨 Your room will be ready upon check-in. A light starter and drink are available before the film, with dinner at Pacific Crest served afterward.',
      footer: 'Retirement Everest · Private Retreat Series · Bonneville Hot Springs Resort & Spa · North Bonneville, WA',
      menus: {
        rooms: [
          { id: 'r1', name: 'King with Balcony', desc: 'Plush king bed, private balcony, mountain views — sleeps 2', sleeps: 2 },
          { id: 'r2', name: 'King with Balcony (Pet Friendly)', desc: 'Same comfort as King with Balcony, pet-friendly — sleeps 2', sleeps: 2 },
          { id: 'r3', name: 'King Garden View with Balcony', desc: 'King bed, peaceful garden views, private balcony — sleeps 2', sleeps: 2 },
          { id: 'r4', name: 'Two Queens Garden View with Balcony', desc: 'Two queen beds, garden views — ideal for couples or friends, sleeps 4', sleeps: 4 },
          { id: 'r5', name: 'Two Queens Garden View (Pet Friendly)', desc: 'Two queen beds, garden views, pet-friendly — sleeps 4', sleeps: 4 }
        ],
        starters: [
          { id: 'st1', name: 'The Wedge', desc: 'Bib lettuce, carrots, red onions, cherry tomatoes, Gorgonzola, lamb' },
          { id: 'st2', name: 'Classic Caesar', desc: 'Caesar dressing, grana padano cheese, romaine lettuce, lemon wedge' },
          { id: 'st3', name: 'Mediterranean Tapas Board', desc: 'Curated small plates — olives, cured meats, marinated vegetables, flatbread' },
          { id: 'st4', name: 'Seasonal Soup', desc: "Chef's daily soup, made fresh with local ingredients" },
          { id: 'st5', name: 'Crispy Calamari', desc: 'Lightly fried calamari, lemon aioli, fresh herbs' }
        ],
        drinks: [
          { id: 'dr1', name: 'House Red or White Wine', desc: "Glass of local Columbia Gorge wine" },
          { id: 'dr2', name: 'Craft Beer', desc: 'Local Pacific Northwest draft selection' },
          { id: 'dr3', name: 'Handcrafted Cocktail', desc: "Bartender's seasonal cocktail of the evening" },
          { id: 'dr4', name: 'Sparkling Water', desc: 'Chilled sparkling water, lemon or lime' },
          { id: 'dr5', name: 'Coffee or Tea', desc: 'Freshly brewed coffee or a selection of teas' }
        ],
        dinners: [
          { id: 'd1', name: 'Citrus Cedar Plank Wild King Salmon', desc: 'Signature dish, cedar plank roasted with citrus glaze', price: 36 },
          { id: 'd2', name: 'Muscovy Duck Breast', desc: 'Tender duck breast, prepared to highlight natural flavor', price: 45 },
          { id: 'd3', name: 'Grilled Coho Salmon', desc: 'Coho salmon, pilaf rice, seasonal vegetables, citrus jus', price: 28 },
          { id: 'd4', name: 'Fish & Chips', desc: 'Northwest classic, crispy battered fish, fries', price: 23 },
          { id: 'd5', name: 'Mediterranean Tapas Plate', desc: 'Curated selection of Mediterranean-inspired small plates', price: 24 },
          { id: 'd6', name: 'Classic Caesar Salad', desc: 'Caesar dressing, grana padano, romaine, lemon wedge', price: 14, veg: true },
          { id: 'd7', name: 'Seasonal Vegetable Plate', desc: "Chef's selection of seasonal, locally sourced vegetables", price: 20, vegan: true }
        ]
      },
      costSim: {
        note: '35% solo / 65% couples. Couples share one room but each orders a full dinner. Room rates $114–$202/night. Excludes WA sales tax, gratuity, starters/drinks.',
        scenarios: [
          { reservations: 20, guests: 33, median: 4090, safe: 4400, perRes: 204 },
          { reservations: 30, guests: 50, median: 6122, safe: 6600, perRes: 204 },
          { reservations: 40, guests: 66, median: 8173, safe: 8800, perRes: 204 }
        ]
      }
    },
    chapel: {
      id: 'chapel',
      slug: 'chapel',
      type: 'preorder',
      theme: 'navy',
      name: 'McMenamins Chapel Pub',
      shortName: 'Chapel Pub',
      city: 'Portland, OR',
      venue: 'Chapel Pub',
      storageKey: 'chp_orders_v2',
      heroSub: 'A private film screening and complimentary dinner at McMenamins Chapel Pub.',
      cta: 'Select Your Meal',
      meta: [
        { strong: 'Chapel Pub', label: 'Portland, OR' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Limited', label: 'Seats Available' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary that explores the financial risks most Americans face in retirement and the strategies that can make the difference between struggle and security.",
        "The evening begins with the film. Dinner follows — complimentary, at your table. No pressure, no pitch. Just a conversation worth having."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Doors open 15 minutes before showtime. Our team will guide you to your seat. A relaxed, private atmosphere from the moment you walk in.' },
        { title: 'Watch the Film', desc: 'Retirement Everest delivers the kind of clarity most people never get from a financial advisor — told through real stories, not a whiteboard.' },
        { title: 'Dinner & Conversation', desc: 'After the screening, enjoy a full dinner on us. Your pre-selected meal will be served at your table — no lines, no waiting.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Meal Selection',
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your meal below so we can have it ready for you.',
      formNote: '🍽 Your arrival bite is waiting at the table when you sit down. Dinner is served <strong>after the film</strong> — your main and drink are prepared fresh and brought out following the screening.',
      footer: 'Retirement Everest · Private Screening Series · Chapel Pub · Portland, OR',
      menus: {
        starters: [
          { id: 's1', name: 'Grateful Veg Mezza', desc: 'Hummus, feta-yogurt dip, marinated olives, veggies, pita bread', price: 14.50, veg: true, cat: 'Snack' },
          { id: 's2', name: 'Soft Pretzel Sticks', desc: 'Served with cheese & ale fondue', price: 14.00, cat: 'Snack' },
          { id: 's3', name: 'Scooby Snacks', desc: 'Mini corn dogs with Portlandia yellow mustard & ketchup', price: 14.50, cat: 'Snack' },
          { id: 's4', name: 'Cheeseburger Slider Trio', desc: 'Most Awesome French Onion seasoning, American cheese, Mystic 18 sauce, Hawaiian roll', price: 14.00, cat: 'Snack' },
          { id: 's5', name: 'Black Bean Dip', desc: 'Spiced black beans, chipotle pico de gallo, cilantro sour cream, tortilla chips', price: 11.25, veg: true, cat: 'Snack' },
          { id: 's6', name: 'Cajun Tots', desc: 'Served with peppercorn ranch', price: 11.25, veg: true, cat: 'Snack' },
          { id: 's7', name: 'McMenamins Fries', desc: 'Served with Mystic 18 sauce', price: 11.25, veg: true, cat: 'Snack' },
          { id: 's8', name: 'Vera Cruz Tres Tacos', desc: 'Crispy cod, chipotle ranch, onion-cilantro, salsa & lime', price: 10.00, cat: 'Snack' },
          { id: 's9', name: 'Blue Bayou Salad', desc: 'Romaine, bacon, chopped egg, blue cheese crumbles, tomato, blue cheese dressing', price: 17.00, cat: 'Salad' },
          { id: 's10', name: 'Aztec Salad', desc: 'Romaine, corn & black bean salsa, avocado, tortilla strips, cheddar, jalapeño, chipotle dressing', price: 16.75, veg: true, cat: 'Salad' },
          { id: 's11', name: 'Hail! Caesar Salad', desc: 'Romaine, garlic croutons, Parmesan, Caesar dressing', price: 13.25, cat: 'Salad' },
          { id: 's12', name: 'Tavern Green Salad', desc: 'Romaine, grape tomatoes, cucumber, red onion, croutons, Parmesan, choice of dressing', price: 13.25, veg: true, cat: 'Salad' }
        ],
        mains: [
          { id: 'm1', name: 'Ale-Battered Fish & Chips', desc: 'Wild Alaskan cod, fries, tartar sauce, buttermilk coleslaw', price: 23.00 },
          { id: 'm2', name: "JR's Jumbo Deluxe Burger", desc: 'Bacon, cheddar & fried egg — served with fries or tots', price: 21.00 },
          { id: 'm3', name: 'Bacon Cheeseburger', desc: '6-oz beef patty, lettuce, tomato, red onion, pickles, secret sauce', price: 20.00 },
          { id: 'm4', name: 'El Diablo Chicken Sandwich', desc: 'Spiced chicken, pepper jack, avocado, Dark Star mayo, lettuce & tomato', price: 21.25 },
          { id: 'm5', name: 'Portland Dip', desc: 'Turkey, grilled mushrooms, Swiss cheese, secret sauce on a roll with garlic jus', price: 19.00 },
          { id: 'm6', name: 'Local Gyros — Greek Chicken', desc: 'Seasoned chicken, feta-yogurt sauce, cucumber, red onion in warm pita', price: 19.50 },
          { id: 'm7', name: 'Local Gyros — Traditional Beef', desc: 'Seasoned beef, feta-yogurt sauce, cucumber, red onion in warm pita', price: 19.50 },
          { id: 'm8', name: 'T-N-T Basket', desc: '½-lb crispy chicken tenders & tots, honey mustard, peppercorn ranch, coleslaw', price: 22.25 },
          { id: 'm9', name: 'The Higher Bowl', desc: 'Rice, black beans, cabbage, tomato, avocado — Mai Thai or Curry Coconut sauce', price: 17.50, vegan: true },
          { id: 'm10', name: 'MYSTIC 18 Beyond Burger', desc: 'Beyond patty, Mystic 18 sauce, creamy Chao slice — fries or tots', price: 20.50, vegan: true },
          { id: 'm11', name: 'Hammerhead Garden Burger', desc: 'Housemade garden patty, lettuce, tomato, onion, pickles', price: 17.50, veg: true },
          { id: 'm12', name: 'Desperado Burger', desc: 'Ranchero spiced patty, chimichurri, smoked queso Oaxaca, Dark Star mayo', price: 21.25, special: true },
          { id: 'm13', name: 'Ruby Star Hot Crispy Chicken', desc: 'Fried chicken, raspberry-chipotle glaze, blue cheese sauce, lettuce & red onion', price: 18.50, special: true }
        ],
        drinks: [
          { id: 'd1', name: 'McMenamins Beer (Pint)', desc: 'House-brewed craft beer on site', price: 6.50 },
          { id: 'd2', name: 'Edgefield Hard Cider (Pint)', desc: 'McMenamins Edgefield cider', price: 6.50 },
          { id: 'd3', name: 'Edgefield Wine (Glass)', desc: "Red or white — ask staff for the evening's pour", price: 8.00 },
          { id: 'd4', name: 'Well Cocktail', desc: 'Bourbon, gin, vodka, tequila, rum, scotch, or brandy', price: 8.00 },
          { id: 'd5', name: 'Featured Illustrated Cocktail', desc: "Tonight's special hand-crafted cocktail", price: 11.00 },
          { id: 'd6', name: 'Brewery Flight', desc: 'Six samples of McMenamins house-brewed beers', price: 10.00 },
          { id: 'd7', name: 'Soft Drink / Non-Alcoholic', desc: 'Soda, sparkling water, or juice', price: 3.50 }
        ]
      },
      costSim: {
        note: 'Oregon has no sales tax. Figures include subtotal + 20% gratuity. Arrival bites modeled at ~33% skip rate. Excludes day-of add-ons and separate bar tabs.',
        scenarios: [
          { guests: 30, median: 1313, p10: 1234, p90: 1395, perGuest: 44 },
          { guests: 37, median: 1621, p10: 1529, p90: 1713, perGuest: 44 },
          { guests: 45, median: 1971, p10: 1869, p90: 2076, perGuest: 44 }
        ]
      }
    },
    'grand-lodge': {
      id: 'grand-lodge',
      slug: 'grand-lodge',
      type: 'screening',
      theme: 'forest',
      name: 'McMenamins Grand Lodge',
      shortName: 'Grand Lodge',
      city: 'Forest Grove, OR',
      venue: 'Alice Meek Inkley Room',
      storageKey: 'grandlodge_orders_v1',
      heroSub: 'A private film screening & plated dinner in one room at McMenamins Grand Lodge.',
      cta: 'Reserve Your Seat',
      meta: [
        { strong: 'Grand Lodge', label: 'Forest Grove, OR' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Limited', label: 'Seats Available' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary that explores the financial risks most Americans face in retirement and the strategies that can make the difference between struggle and security.",
        "The evening unfolds in the Alice Meek Inkley Room — film first, then a plated dinner in the same space after a quick room reset. No relocating, no separate bookings. Just one private room for the whole night."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: "Doors open 15 minutes before showtime in the Alice Meek Inkley Room. Settle in — you'll stay in this one space all evening." },
        { title: 'Watch the Film', desc: 'Retirement Everest screens with theater seating in the Inkley Room — real stories, real clarity, in a historic Masonic lodge setting.' },
        { title: 'A Plated Dinner', desc: 'After the film, our team resets the room and serves your pre-selected salad, entrée, and dessert at your table — no moving to another venue.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Dinner Selection',
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your salad, entrée, dessert, and drink below so we can have it ready for you.',
      footer: 'Retirement Everest · Private Screening Series · McMenamins Grand Lodge · Forest Grove, OR',
      menus: {
        salads: [
          { id: 'sal1', name: 'Northwest Spinach Salad', desc: 'Goat cheese, hazelnuts & marionberry vinaigrette', veg: true },
          { id: 'sal2', name: "Brewer's Salad", desc: 'Blue cheese crumbles, marinated red onion, hazelnuts, Ruby-raspberry vinaigrette', veg: true },
          { id: 'sal3', name: 'Pub Green', desc: 'Mixed greens, grape tomatoes, cucumber, marinated red onion, croutons, Parmesan, peppercorn ranch', veg: true },
          { id: 'sal4', name: 'Aztec Salad', desc: 'Romaine, corn & black bean salsa, avocado, tortilla strips, cheddar, tomato, jalapeño, cilantro, onion, chipotle dressing', veg: true }
        ],
        entrees: [
          { id: 'e1', name: 'Spinach & Cheese Cannelloni', desc: 'Rosemary Alfredo & Spar Vodka tomato sauces', price: 68, veg: true },
          { id: 'e2', name: 'Wild Mushroom Ravioli', desc: 'Roasted garlic-basil cream sauce', price: 68, veg: true },
          { id: 'e3', name: 'Lemon & Herb-Roasted Chicken Breast', desc: "Yukon Gold mashed potatoes, wild rice pilaf & chef's vegetables", price: 68 },
          { id: 'e4', name: 'Northern Star Baked Cod', desc: 'White Rabbit-herb cream sauce, herbed bread crumbs, garlic broccolini', price: 68 },
          { id: 'e5', name: 'Herb-Roasted Turkey Breast', desc: 'Old fashioned turkey gravy, Fireside cranberry relish & sides', price: 64 },
          { id: 'e6', name: 'Honey-Glazed Baked Ham', desc: 'Hogshead-Whiskey mustard sauce & sides', price: 68 },
          { id: 'e7', name: 'Pepper-Crusted Round of Beef', desc: 'Black Rabbit Red jus, horseradish sauce & sides', price: 70 },
          { id: 'e8', name: 'Poached Salmon', desc: 'Pinot gris-shallot beurre blanc, wild rice pilaf & garlic green beans', price: 79 },
          { id: 'e9', name: 'Tournedos of Beef', desc: 'Wild mushroom demi-glace, herb-roasted fingerlings & wild rice pilaf', price: 88 }
        ],
        desserts: [
          { id: 'des1', name: "Phil's Salted Caramel Tart", desc: 'Dark chocolate, Oregon filberts' },
          { id: 'des2', name: "Ruby's Raspberry Cheesecake", desc: 'Vanilla cheesecake, raspberry swirl, graham cracker crust' },
          { id: 'des3', name: 'Blueberries & Cream Basque Cheesecake', desc: 'Deeply caramelized center, blueberry custard sauce, whipped cream & fresh blueberries' },
          { id: 'des4', name: 'Hopscotch Peanut Butter Pie', desc: 'Peanut butter mousse, chocolate cookie crust, dark chocolate ganache, butterscotch & chocolate sauces' },
          { id: 'des5', name: 'Black & Tan Brownie Sundae', desc: 'Caram-ale & chocolate sauces, vanilla bean ice cream, whipped cream & Amarena cherry' },
          { id: 'des6', name: 'Cast Iron Chocolate Chip Cookie', desc: 'Baked to order — add vanilla bean ice cream on request' }
        ],
        drinks: [
          { id: 'd1', name: 'McMenamins Beer (Pint)', desc: 'House-brewed craft beer on site', price: 6.50 },
          { id: 'd2', name: 'Edgefield Hard Cider (Pint)', desc: 'McMenamins Edgefield cider', price: 6.50 },
          { id: 'd3', name: 'Edgefield Wine (Glass)', desc: "Red or white — ask staff for the evening's pour", price: 8.00 },
          { id: 'd4', name: 'Well Cocktail', desc: 'Bourbon, gin, vodka, tequila, rum, scotch, or brandy', price: 8.00 },
          { id: 'd5', name: 'Featured Illustrated Cocktail', desc: "Tonight's special hand-crafted cocktail", price: 12.00 },
          { id: 'd6', name: 'Brewery Flight', desc: 'Six samples of McMenamins house-brewed beers', price: 13.25 },
          { id: 'd7', name: 'Soft Drink / Non-Alcoholic', desc: 'Soda, sparkling water, coffee, tea, or juice', price: 4.25 }
        ]
      },
      costSim: {
        quoteDate: '2026-07-16',
        source: 'Sean Osaki + Bryn Metzger (BrynM@McMenamins.com) — Alice Meek Inkley non-concert dates',
        budgetOk: true,
        fbMin: 1500,
        servicePct: 0.21,
        roomFee: 0,
        avFee: 0,
        packagePp: 70,
        drinkPp: 9,
        roomName: 'Alice Meek Inkley Room',
        eventWindow: 'Late Jul–Aug 2026 non-concert evenings (Bryn list)',
        note: 'REAL QUOTE: Weekday evening F&B min $1,500 + 21% SC (no room fee if min met). Bryn 2026-07-16: non-concert date blocks + private-events WiFi OK. Direct 503.992.3447 / Office 503.992.9530. Avoid Concerts in the Grove. At ~$70pp food usually clears the $1,500 min. UNDER $3k — active contender.',
        scenarios: [
          { guests: 30, median: 2868, p10: 2639, p90: 3155, perGuest: 96 },
          { guests: 35, median: 3346, p10: 3078, p90: 3681, perGuest: 96 },
          { guests: 40, median: 3824, p10: 3518, p90: 4206, perGuest: 96 }
        ]
      }
    },
    'kennedy-school': {
      id: 'kennedy-school',
      slug: 'kennedy-school',
      type: 'buffet',
      theme: 'gold',
      name: 'McMenamins Kennedy School',
      shortName: 'Kennedy School',
      city: 'Portland, OR',
      venue: 'Martha Jordan Room',
      storageKey: 'kennedyschool_buffet_orders_v1',
      attachments: [
        { name: 'Kennedy School Catering Menus (June 2026)', path: 'data/venue-attachments/Kennedy-School-Catering-Menus.pdf', kind: 'menu' }
      ],
      heroSub: 'A private film screening & buffet dinner at McMenamins Kennedy School.',
      cta: 'Share Your Preferences',
      meta: [
        { strong: 'Kennedy School', label: 'Portland, OR' },
        { strong: 'Buffet Dinner', label: 'Your Vote Counts' },
        { strong: 'Complimentary', label: 'Evening Included' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary that explores the financial risks most Americans face in retirement and the strategies that can make the difference between struggle and security.",
        "The evening takes place at McMenamins Kennedy School. After the film, dinner is a <strong>group buffet</strong> (not plated per person). Your votes below help us choose the most popular buffet, drink style, and whether to add shared appetizers."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Doors open 15 minutes before showtime. Historic school setting, private room.' },
        { title: 'Watch the Film', desc: 'Retirement Everest screens for our group — real stories, real clarity.' },
        { title: 'Buffet Dinner', desc: 'One group buffet is ordered for everyone. Your preference tells us which package wins. Beverages and optional shared starters are polled the same way.' }
      ],
      formTitle: 'Tell Us What You Prefer',
      formLabel: 'Dinner Preferences',
      formIntro: 'Dinner is included. Expand any buffet to see what’s on the menu, then tap <strong>Vote</strong> on your favorite. We order <strong>one buffet for the whole group</strong> based on the tallies.',
      formNote: '📋 Buffets don’t include a plated starter. Expand an appetizer package (or skip), vote, then choose adult beverage vs coffee / tea / soda.',
      footer: 'Retirement Everest · Private Screening Series · McMenamins Kennedy School · Portland, OR',
      menus: {
        buffets: [
          {
            id: 'b-luau',
            name: 'Sunset Luau Buffet',
            blurb: 'Hawaiian-style · chicken & pork',
            price: 55.50,
            sections: [
              { title: 'Sides & salads', items: ['Hawaiian rolls & butter', 'Hawaiian macaroni salad', 'Basil-cilantro rice', 'Stir-fry vegetables'] },
              { title: 'Entrées', items: ['Huli Huli chicken thighs', 'Kalua pork'] },
              { title: 'Desserts', items: ['Lilikoi-coconut tart', "Ruby's raspberry cheesecake"] }
            ]
          },
          {
            id: 'b-bbq',
            name: 'Backyard Barbecue Buffet',
            blurb: 'Brisket & white BBQ chicken',
            price: 63.50,
            sections: [
              { title: 'Sides & salads', items: ['Biscuits & honey butter', 'Picnic potato salad', 'Buttermilk coleslaw', "Dad's Moonshine baked beans"] },
              { title: 'Entrées', items: ['Red Eye BBQ beef brisket', 'Peppercorn white BBQ chicken breasts'] },
              { title: 'Desserts', items: ['Black & Tan brownies', 'Northwest berry bars'] }
            ]
          },
          {
            id: 'b-mthood2',
            name: 'Mt. Hood Buffet (2 entrées)',
            blurb: 'Classic roast dinner · choose 2 meats',
            price: 63.50,
            sections: [
              { title: 'Always included', items: ['Rolls & butter', 'Pub green salad', 'Garlic green beans'] },
              { title: 'Sides (venue chooses two)', items: ['Herb-roasted fingerlings', 'Traditional dressing', 'Wild rice pilaf', 'Yukon Gold mashed potatoes', 'Traditional mac & cheese'] },
              { title: 'Entrées (group gets two of)', items: ['Herb-roasted turkey breast', 'Pepper-crusted round of beef', 'Honey-glazed baked ham', 'Wild mushroom ravioli (veg)'] },
              { title: 'Dessert', items: ['Assorted dessert display'] }
            ]
          },
          {
            id: 'b-hearth',
            name: 'Hearthstone Buffet',
            blurb: 'Chicken & baked cod · Northwest sides',
            price: 68,
            sections: [
              { title: 'Sides & salads', items: ['Dinner rolls & butter', 'Northwest spinach salad', 'Yukon Gold mashed potatoes', 'Wild rice pilaf', 'Garlic-roasted broccolini'] },
              { title: 'Entrées', items: ['Lemon & herb-roasted chicken breasts', 'Northern Star baked cod'] },
              { title: 'Desserts', items: ["Phil's salted caramel tart", "Ruby's raspberry cheesecake"] }
            ]
          },
          {
            id: 'b-mthood3',
            name: 'Mt. Hood Buffet (3 entrées)',
            blurb: 'Same as Mt. Hood with three entrées',
            price: 70,
            sections: [
              { title: 'Always included', items: ['Rolls & butter', 'Pub green salad', 'Garlic green beans'] },
              { title: 'Sides (venue chooses two)', items: ['Herb-roasted fingerlings', 'Traditional dressing', 'Wild rice pilaf', 'Yukon Gold mashed potatoes', 'Traditional mac & cheese'] },
              { title: 'Entrées (group gets three of)', items: ['Herb-roasted turkey breast', 'Pepper-crusted round of beef', 'Honey-glazed baked ham', 'Wild mushroom ravioli (veg)'] },
              { title: 'Dessert', items: ['Assorted dessert display'] }
            ]
          },
          {
            id: 'b-cascadia',
            name: 'Cascadia Buffet',
            blurb: 'Salmon & tournedos of beef',
            price: 88,
            sections: [
              { title: 'Sides & salads', items: ['Dinner rolls & butter', "Brewer's salad", 'Herb-roasted fingerlings', 'Wild rice pilaf', 'Garlic green beans'] },
              { title: 'Entrées', items: ['Poached salmon', 'Tournedos of beef'] },
              { title: 'Dessert', items: ['Assorted dessert display'] }
            ]
          }
        ],
        starters: [
          {
            id: 'a-skip',
            name: 'No appetizers — buffet only',
            blurb: 'Skip shared starters',
            price: 0,
            sections: [{ title: 'What this means', items: ['No shared appetizer package before the buffet', 'Straight to dinner after the film'] }]
          },
          {
            id: 'a-althea',
            name: "Althea's Soiree",
            blurb: 'Deviled eggs, hummus, deli · shared',
            price: 31,
            sections: [
              { title: "What's included", items: ['Classic deviled eggs', 'Hummus & pita with veggie sticks', 'Deli display (turkey, pastrami, cheeses, rolls)', 'Dessert display'] }
            ]
          },
          {
            id: 'a-alice',
            name: "Alice's Impromptu Gathering",
            blurb: 'Quiches, mushrooms, antipasti',
            price: 33,
            sections: [
              { title: "What's included", items: ['Mini quiches (veggie, Florentine, Lorraine)', 'Stuffed mushrooms', 'Antipasti with crackers & bread', 'Crudités with roasted red pepper aioli'] }
            ]
          },
          {
            id: 'a-mattie',
            name: "Mattie's Garden Party",
            blurb: 'Lighter apps + fruit + dessert',
            price: 33,
            sections: [
              { title: "What's included", items: ['Caprese skewers', 'Classic deviled eggs', 'Hummus in cucumber cups', 'Crudités', 'Fresh fruit', 'Dessert display', 'Coffee & tea'] }
            ]
          },
          {
            id: 'a-lola',
            name: "Lola's Cocktail Party",
            blurb: 'Charcuterie + hot apps',
            price: 36,
            sections: [
              { title: "What's included", items: ['Caprese skewers', 'Stuffed mushrooms', 'Hummus cucumber cups', 'Smoked salmon mousse in filo', 'Stuffed peppadews', 'Charcuterie board'] }
            ]
          },
          {
            id: 'a-carter',
            name: 'Carter the Great',
            blurb: 'Apps + carved pepper-crusted beef',
            price: 48,
            sections: [
              { title: "What's included", items: ['Classic deviled eggs', 'Smoked salmon mousse in filo', 'Antipasti', 'Artisan cheese board', 'Crudités', 'Curried crab cucumber cups', 'Pepper-crusted round of beef (carver 1 hr)'] }
            ]
          },
          {
            id: 'a-munchies',
            name: 'Mix & Match Munchies (2 items)',
            blurb: 'Shared hour · lighter option',
            price: 17.50,
            sections: [
              { title: 'Choose-two style (examples)', items: ['Cajun tots', 'Spring rolls', 'Scooby snacks (mini corn dogs)', 'Hammerhead BBQ pork sliders', 'Jerk jackfruit sliders', 'Terminator meatballs'] }
            ]
          }
        ],
        /* Two buckets only — host tallies adult vs soft */
        drinks: [
          {
            id: 'd-soft',
            name: 'Coffee, tea & sodas',
            blurb: 'Non-alcoholic',
            desc: 'Coffee, tea, soda, sparkling water, or juice',
            price: 4.25,
            cat: 'Soft'
          },
          {
            id: 'd-adult',
            name: 'Adult beverage',
            blurb: 'Beer, cider, wine, or cocktail',
            desc: 'Beer, hard cider, wine, or cocktail for the evening',
            price: 8,
            cat: 'Adult'
          }
        ]
      },
      costSim: {
        quoteDate: '2026-07-14',
        source: 'Michele Wellnitz + Kennedy School Banquet June 2026 PDF',
        budgetOk: true,
        fbMin: 1000,
        servicePct: 0.21,
        roomFee: 0,
        avFee: 0,
        /* Default package for series compare table = mid Luau (lowest evening buffet) */
        packagePp: 55.50,
        drinkPp: 6,
        drinkSoftPp: 4.25,
        drinkAdultPp: 8,
        roomName: 'Classroom (Martha Jordan / Mina Parsons) · max ~40',
        note: 'Each buffet package is modeled separately. Formula: max(buffet$/pp × guests + drink$/pp × guests, F&B min $1,000) × 1.21 service. Range p10 = all soft drinks ($4.25), median = blend ($6), p90 = all adult ($8). Apps are NOT in the base numbers — add separately if the poll majority wants them (e.g. Althea $31/pp ≈ +$1.1k–$1.5k at 30–40 guests after service).',
        /* Series compare uses Luau (lowest) @ 35 */
        scenarios: [
          { guests: 30, median: 2232, p10: 2169, p90: 2305, perGuest: 74 },
          { guests: 35, median: 2605, p10: 2530, p90: 2689, perGuest: 74 },
          { guests: 40, median: 2977, p10: 2892, p90: 3073, perGuest: 74 }
        ],
        /* Full per-buffet breakdown for cost simulator */
        buffetPackages: [
          {
            id: 'b-luau',
            name: 'Sunset Luau Buffet',
            packagePp: 55.50,
            scenarios: [
              { guests: 30, median: 2232, p10: 2169, p90: 2305, perGuest: 74 },
              { guests: 35, median: 2605, p10: 2530, p90: 2689, perGuest: 74 },
              { guests: 40, median: 2977, p10: 2892, p90: 3073, perGuest: 74 }
            ]
          },
          {
            id: 'b-bbq',
            name: 'Backyard Barbecue Buffet',
            packagePp: 63.50,
            scenarios: [
              { guests: 30, median: 2523, p10: 2459, p90: 2595, perGuest: 84 },
              { guests: 35, median: 2943, p10: 2869, p90: 3028, perGuest: 84 },
              { guests: 40, median: 3364, p10: 3279, p90: 3461, perGuest: 84 }
            ]
          },
          {
            id: 'b-mthood2',
            name: 'Mt. Hood Buffet (2 entrées)',
            packagePp: 63.50,
            scenarios: [
              { guests: 30, median: 2523, p10: 2459, p90: 2595, perGuest: 84 },
              { guests: 35, median: 2943, p10: 2869, p90: 3028, perGuest: 84 },
              { guests: 40, median: 3364, p10: 3279, p90: 3461, perGuest: 84 }
            ]
          },
          {
            id: 'b-hearth',
            name: 'Hearthstone Buffet',
            packagePp: 68,
            scenarios: [
              { guests: 30, median: 2686, p10: 2623, p90: 2759, perGuest: 90 },
              { guests: 35, median: 3134, p10: 3060, p90: 3219, perGuest: 90 },
              { guests: 40, median: 3582, p10: 3497, p90: 3678, perGuest: 90 }
            ]
          },
          {
            id: 'b-mthood3',
            name: 'Mt. Hood Buffet (3 entrées)',
            packagePp: 70,
            scenarios: [
              { guests: 30, median: 2759, p10: 2695, p90: 2831, perGuest: 92 },
              { guests: 35, median: 3219, p10: 3144, p90: 3303, perGuest: 92 },
              { guests: 40, median: 3678, p10: 3594, p90: 3775, perGuest: 92 }
            ]
          },
          {
            id: 'b-cascadia',
            name: 'Cascadia Buffet',
            packagePp: 88,
            scenarios: [
              { guests: 30, median: 3412, p10: 3349, p90: 3485, perGuest: 114 },
              { guests: 35, median: 3981, p10: 3907, p90: 4066, perGuest: 114 },
              { guests: 40, median: 4550, p10: 4465, p90: 4646, perGuest: 114 }
            ]
          }
        ]
      }
    },


    /* —— New prospects from Jul 2026 venue RFP (public menus; private-dining mins TBD with sales) —— */
    'el-gaucho': {
      id: 'el-gaucho',
      slug: 'el-gaucho',
      type: 'screening',
      theme: 'navy',
      name: 'El Gaucho Portland',
      shortName: 'El Gaucho',
      city: 'Portland, OR',
      venue: 'Private Dining — 319 SW Broadway',
      storageKey: 'elgaucho_orders_v1',
      heroSub: 'A private film screening & steakhouse dinner at El Gaucho Portland.',
      cta: 'Reserve Your Seat',
      meta: [
        { strong: 'El Gaucho Portland', label: 'Downtown Portland' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Limited', label: 'Seats Available' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary that explores the financial risks most Americans face in retirement and the strategies that can make the difference between struggle and security.",
        "The evening is hosted at <strong>El Gaucho Portland</strong> — 28-day dry-aged Niman Ranch prime steaks from their open charcoal kitchen, private dining service, and a room set for film plus dinner. No pressure, no pitch. Just a conversation worth having."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Doors open 15 minutes before showtime in a private dining room. Steakhouse service from the moment you sit down.' },
        { title: 'Watch the Film', desc: 'Retirement Everest screens in the room — real stories, real clarity, then a seamless transition to dinner.' },
        { title: 'A Plated Dinner', desc: 'After the film, enjoy a complimentary plated dinner — salad, charcoal-grilled entrée, and dessert of your choice.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Dinner Selection',
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your salad, entrée, dessert, and drink below so we can have it ready for you.',
      footer: 'Retirement Everest · Private Screening Series · El Gaucho Portland · Portland, OR',
      menus: {
        salads: [
          { id: 'sal1', name: 'Iceberg Wedge', desc: 'Bacon, tomato, kalamata olives, egg, roquefort, roquefort dressing', veg: true },
          { id: 'sal2', name: 'Classic Caesar', desc: 'Romaine, parmesan, anchovy dressing, croutons' },
          { id: 'sal3', name: 'Tableside Caesar (for two)', desc: 'Prepared tableside when the room setup allows — share-style option' }
        ],
        entrees: [
          { id: 'e1', name: 'Baseball Cut Top Sirloin', desc: '10 oz · 28-day dry-aged Niman Ranch · charcoal grill', price: 52 },
          { id: 'e2', name: 'Manhattan Cut New York Strip', desc: '8 oz · dry-aged prime · charcoal grill', price: 66 },
          { id: 'e3', name: 'Filet Mignon (8 oz)', desc: 'Custom-aged Certified Angus tenderloin · charcoal grill', price: 79 },
          { id: 'e4', name: 'Filet Mignon (10 oz)', desc: 'Custom-aged Certified Angus tenderloin · charcoal grill', price: 85 },
          { id: 'e5', name: 'New York Steak', desc: '14 oz · dry-aged · charcoal grill', price: 84 },
          { id: 'e6', name: 'Bone-In Rib Eye', desc: '18 oz · dry-aged prime · charcoal grill', price: 92 },
          { id: 'e7', name: 'Steak El Gaucho', desc: '8 oz filet, Maine lobster medallions, asparagus, béarnaise', price: 93 },
          { id: 'e8', name: 'Medallions Oscar', desc: 'Two 4 oz filets, Dungeness crab, asparagus, béarnaise', price: 91 },
          { id: 'e9', name: 'Gaucho Combination', desc: '6 oz filet + 6 oz New York, crimini mushroom, tomato, béarnaise', price: 78 },
          { id: 'e10', name: 'Organic Chicken Breast', desc: 'Creamy corn, mushroom supreme sauce', price: 46 },
          { id: 'e11', name: 'Seasonal Fish (market)', desc: 'Chef’s fresh preparation — confirmed closer to the event', price: 76 }
        ],
        desserts: [
          { id: 'des1', name: 'Bananas Foster (tableside)', desc: 'Vanilla bean ice cream, bourbon caramel, fresh berries — classic El Gaucho finish' },
          { id: 'des2', name: 'Cheesecake', desc: 'Graham cracker crust, strawberry-rhubarb coulis, chantilly' },
          { id: 'des3', name: 'Chocolate Torte', desc: 'Chocolate glaze, vanilla bean ice cream, candied cocoa nibs' },
          { id: 'des4', name: 'Crème Brûlée', desc: 'Classic vanilla custard, caramelized sugar, mixed berries' }
        ],
        drinks: [
          { id: 'd1', name: 'House Wine (Glass)', desc: 'Red or white selection', price: 16 },
          { id: 'd2', name: 'Premium Wine (Glass)', desc: 'Elevated pour from the list', price: 22 },
          { id: 'd3', name: 'Classic Cocktail', desc: 'Martini, Manhattan, Old Fashioned, or similar', price: 17 },
          { id: 'd4', name: 'Well Cocktail', desc: 'Standard bar pour', price: 14 },
          { id: 'd5', name: 'Soft Drink / Non-Alcoholic', desc: 'Soda, sparkling water, coffee, or tea', price: 5 }
        ]
      },
      costSim: {
        quoteDate: '2026-07-13',
        source: 'Gregory Dills (gdills@elgaucho.com) — call first; no package yet',
        budgetOk: null,
        fbMin: 0,
        servicePct: 0.20,
        roomFee: 0,
        avFee: 0,
        packagePp: 80,
        drinkPp: 16,
        roomName: 'Private dining TBD on call',
        note: 'Greg Dills wants a call before proposal (971) 544-2700 — no F&B min in email yet. Public menu ~$75–90 entrée. Scenarios are food-only estimates WITHOUT a private min. Expect steakhouse mins possibly above $3k — confirm on call. Drop if min > $3,000.',
        scenarios: [
          { guests: 30, median: 3456, p10: 3180, p90: 3802, perGuest: 115 },
          { guests: 35, median: 4032, p10: 3709, p90: 4435, perGuest: 115 },
          { guests: 40, median: 4608, p10: 4239, p90: 5069, perGuest: 115 }
        ]
      }
    },

    ringside: {
      id: 'ringside',
      slug: 'ringside',
      type: 'screening',
      theme: 'gold',
      name: 'RingSide Steakhouse',
      shortName: 'RingSide',
      city: 'Portland, OR',
      venue: 'Barrel Room / Patio — RingSide Uptown',
      storageKey: 'ringside_orders_v1',
      attachments: [
        { name: 'Dinner menu', path: 'data/venue-attachments/ringside-dinner.pdf', kind: 'menu' },
        { name: 'Dessert menu', path: 'data/venue-attachments/ringside-dessert.pdf', kind: 'menu' }
      ],
      heroSub: 'A private film screening & classic steakhouse dinner at RingSide.',
      cta: 'Reserve Your Seat',
      meta: [
        { strong: 'RingSide Steakhouse', label: 'Portland, OR' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Limited', label: 'Seats Available' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary that explores the financial risks most Americans face in retirement and the strategies that can make the difference between struggle and security.",
        "The evening is hosted at <strong>RingSide Steakhouse</strong> — Portland’s iconic house of aged beef, famous onion rings, and private dining. Film first, then a plated dinner in the room. No pressure, no pitch."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Doors open 15 minutes before showtime. Classic steakhouse hospitality and a private room setup for screening + dinner.' },
        { title: 'Watch the Film', desc: 'Retirement Everest screens with the group — real stories, real clarity.' },
        { title: 'A Plated Dinner', desc: 'Afterward, your pre-selected salad, entrée (with potato), and dessert are served at your table.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Dinner Selection',
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your salad, entrée, dessert, and drink below so we can have it ready for you.',
      formNote: 'Steaks include choice of garlic mashed, baked potato, fries, or garlic rice pilaf. Menu from RingSide dinner PDF (July 2026).',
      footer: 'Retirement Everest · Private Screening Series · RingSide Steakhouse · Portland, OR',
      menus: {
        salads: [
          { id: 'sal1', name: 'House Caesar Salad', desc: 'Chopped hearts of romaine, parmesan, anchovy, crouton' },
          { id: 'sal2', name: 'Iceberg Wedge', desc: 'Bacon, blue cheese, crouton, hard-cooked egg, tomato, house dressing', veg: true },
          { id: 'sal3', name: 'Mixed Greens', desc: 'Compressed melon, prosciutto, mascarpone, lemon honey, summer greens' },
          { id: 'sal4', name: 'Baked Onion Soup', desc: 'Crouton, gruyère crust — RingSide classic start' }
        ],
        entrees: [
          { id: 'e1', name: 'Top Sirloin — Baseball Cut', desc: '10 oz Certified Angus Beef · wet & dry aged 30+ days', price: 59 },
          { id: 'e2', name: 'Filet Mignon (8 oz)', desc: 'Certified Angus Beef filet', price: 76 },
          { id: 'e3', name: 'Filet Mignon (10 oz)', desc: 'Certified Angus Beef filet', price: 86 },
          { id: 'e4', name: 'USDA Prime Ribeye', desc: '16 oz', price: 83 },
          { id: 'e5', name: 'USDA Prime New York — Center Cut', desc: '14 oz (peppered +$5)', price: 76 },
          { id: 'e6', name: 'Prime Rib of Beef (12 oz)', desc: 'Yorkshire pudding, au jus, horseradish — Fri–Mon, limited', price: 62 },
          { id: 'e7', name: 'Prime Rib of Beef (16 oz)', desc: 'Yorkshire pudding, au jus, horseradish — Fri–Mon, limited', price: 68 },
          { id: 'e8', name: 'RingSide Fried Chicken', desc: 'Oregon free-range half chicken, pole bean, garlic mash, black truffle honey', price: 46 },
          { id: 'e9', name: 'Pan Seared Pacific Halibut', desc: 'Farro kabsa, preserved Meyer lemon, artichoke, squash, zhoug, smoked eggplant', price: 69 },
          { id: 'e10', name: 'Crab Louie Entrée', desc: 'Dungeness crab, butter lettuce, egg, tomato, avocado, green bean, Louie dressing', price: 58 }
        ],
        desserts: [
          { id: 'des1', name: 'Crème Brûlée', desc: 'Classic vanilla bean' },
          { id: 'des2', name: 'Blueberry Crumble Cheesecake', desc: 'Graham cracker crust, candied lemon' },
          { id: 'des3', name: 'Brûléed Banana Split', desc: "Vanilla ice cream, whipped cream, Foster's butterscotch, pistachio, cherry" },
          { id: 'des4', name: 'Cherry Espresso Trifle', desc: 'Espresso liqueur, Bavarian cream, coffee gelée, chocolate crumble, cherry coulis' },
          { id: 'des5', name: 'Salted Pecan Dark Chocolate Toffee', desc: 'House confection' },
          { id: 'des6', name: 'Seasonal Sorbet', desc: 'House-made selection', vegan: true }
        ],
        drinks: [
          { id: 'd1', name: 'Draft Beer (16 oz)', desc: 'Rotating local drafts', price: 9 },
          { id: 'd2', name: 'House Wine (Glass)', desc: 'Red or white from the list', price: 15 },
          { id: 'd3', name: 'Premium Wine (Glass)', desc: 'Elevated pour', price: 22 },
          { id: 'd4', name: 'Signature Cocktail', desc: 'Siesta, Strawberry Canopy, Backdraft, or similar', price: 17 },
          { id: 'd5', name: 'Soft Drink / Non-Alcoholic', desc: 'Soda, sparkling water, coffee, or tea', price: 5 }
        ]
      },
      costSim: {
        quoteDate: '2026-07-17',
        source: 'Savannah Stellges (savannah@ringsidehg.com) Outlook reply — Barrel Room $7,500 / Patio $5,500 F&B min + 4% admin + gratuity; menus ringside-*.pdf',
        budgetOk: false,
        fbMin: 7500,
        servicePct: 0.24,
        roomFee: 0,
        avFee: 0,
        packagePp: 78,
        drinkPp: 15,
        roomName: 'Barrel Room (semi-private wine cellar ≤40) · Patio alt ≤30 at $5,500 min',
        proposedDate: null,
        note: 'REAL QUOTE 2026-07-17: Barrel Room $7,500 F&B min (≤40) or Patio $5,500 (≤30 fully private tent) + 4% admin + gratuity (~20% assumed → 24% total). No deposit/room fee; contract-ready. Food spend for ~35 is far below min — you pay the floor. OVER $3k policy → PARKED. Patio @30 ≈ $6,820; Barrel @35 ≈ $9,300.',
        scenarios: [
          { guests: 30, median: 9300, p10: 8556, p90: 10230, perGuest: 310 },
          { guests: 35, median: 9300, p10: 8556, p90: 10230, perGuest: 266 },
          { guests: 40, median: 9300, p10: 8556, p90: 10230, perGuest: 232 }
        ]
      }
    },

    'jakes-grill': {
      id: 'jakes-grill',
      slug: 'jakes-grill',
      type: 'screening',
      theme: 'navy',
      name: "Jake's Grill",
      shortName: "Jake's",
      city: 'Portland, OR',
      venue: 'Hardy Room — 611 SW 10th Ave',
      storageKey: 'jakesgrill_orders_v1',
      heroSub: "A private film screening & dinner in the Hardy Room at Jake's Grill.",
      cta: 'Reserve Your Seat',
      meta: [
        { strong: "Jake's Grill", label: 'Downtown Portland' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Hardy Room', label: 'Up to 50 seated' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary that explores the financial risks most Americans face in retirement and the strategies that can make the difference between struggle and security.",
        "The evening is hosted in the <strong>Hardy Room</strong> at Jake's Grill (Landry's) — classic Portland private dining with plated packages from the Summer 2026 private dining menu. Film first, then dinner. No pressure, no pitch."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Doors open 15 minutes early in the Hardy Room for tech check and seating (multiple tables config seats up to 50).' },
        { title: 'Watch the Film', desc: 'Retirement Everest screens with a rented screen/projector in the room — real stories, real clarity.' },
        { title: 'A Plated Dinner', desc: 'Gold Dinner package: starter, entrée, and dessert of your pre-selected choices, served after the film.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Dinner Selection',
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your starter, entrée, dessert, and drink so we can have it ready for you.',
      formNote: 'REAL QUOTE 2026-07-14 (Cyrano Clark @ ldry.com): Hardy Room held for 8/15/26 option. Gold Dinner $65/pp (groups 25–50 pre-select 4 days out) + 22% service. Room $200 + screen/projector $250 + F&B min $1,500. Menus from private dining PDF May 2026.',
      footer: "Retirement Everest · Private Screening Series · Jake's Grill Hardy Room · Portland, OR",
      contact: {
        name: 'OP Cyrano Clark',
        email: 'Cyrano.Clark@ldry.com',
        phone: '(503) 241-2125',
        role: "Landry's / Jake's Grill private dining"
      },
      attachments: [
        { name: 'Private Dining Menu 2026', path: 'data/venue-attachments/jakes-private-dining-menu-2026.pdf', kind: 'menu' },
        { name: 'Spaces (Hardy Room)', path: 'data/venue-attachments/jakes-spaces.pdf', kind: 'packet' },
        { name: 'Craft Cocktails 2026', path: 'data/venue-attachments/jakes-specialty-craft-cocktails-2026.pdf', kind: 'menu' },
        { name: 'Wine Bottle List 2026', path: 'data/venue-attachments/jakes-wine-bottle-list-2026.pdf', kind: 'menu' },
        { name: 'Hardy Room 1', path: 'data/venue-attachments/jakes-hardy-room-1.jpeg', thumb: 'data/venue-attachments/thumbs/jakes-hardy-room-1.jpeg', kind: 'photo' },
        { name: 'Hardy Room 2', path: 'data/venue-attachments/jakes-hardy-room-2.jpeg', thumb: 'data/venue-attachments/thumbs/jakes-hardy-room-2.jpeg', kind: 'photo' },
        { name: 'Hardy Room 3', path: 'data/venue-attachments/jakes-hardy-room-3.jpeg', thumb: 'data/venue-attachments/thumbs/jakes-hardy-room-3.jpeg', kind: 'photo' },
        { name: 'Hardy Room 4', path: 'data/venue-attachments/jakes-hardy-room-4.jpeg', thumb: 'data/venue-attachments/thumbs/jakes-hardy-room-4.jpeg', kind: 'photo' }
      ],
      menus: {
        salads: [
          { id: 'sal1', name: 'Mixed Greens', desc: 'Field greens, mandarin oranges, candied walnuts, blue cheese, dried cranberries, raspberry vinaigrette', veg: true },
          { id: 'sal2', name: 'Hearts of Romaine Caesar', desc: 'Parmesan, garlic croutons' },
          { id: 'sal3', name: 'Cup of Clam Chowder', desc: 'Available on Platinum package starters' }
        ],
        entrees: [
          { id: 'e1', name: '6oz Filet Mignon', desc: 'Mashed potatoes, seasonal vegetables — Gold Dinner', price: 65 },
          { id: 'e2', name: '10oz USDA Prime Sirloin', desc: 'Mashed potatoes, seasonal vegetables — Gold Dinner', price: 65 },
          { id: 'e3', name: 'Cider Glazed Pork Short Rib', desc: 'Roasted Brussels sprouts, fontina polenta, orange gremolada', price: 65 },
          { id: 'e4', name: 'Roasted Wild King Salmon', desc: 'Potato puree, foraged mushrooms, asparagus tips, salsa verde cream', price: 65 },
          { id: 'e5', name: 'Blackened Alaskan Rockfish', desc: 'Mashed potatoes, crab-corn salad, saffron tomato sauce', price: 65 },
          { id: 'e6', name: 'Honey & Verjus Glazed Chicken', desc: 'Mashed potatoes, roasted tomatoes, pickled mushrooms', price: 65 },
          { id: 'e7', name: 'Vegetarian Pasta Primavera', desc: 'Seasonal vegetables, pasta', price: 65, veg: true },
          { id: 'e8', name: '8oz Filet Mignon (Platinum)', desc: 'Upgrade path — Platinum $75/pp package', price: 75 },
          { id: 'e9', name: '13oz USDA Choice Ribeye (Platinum)', desc: 'Upgrade path — Platinum $75/pp package', price: 75 }
        ],
        desserts: [
          { id: 'des1', name: 'Seasonal Cheesecake', desc: 'Included in Gold Dinner' },
          { id: 'des2', name: 'Chocolate Truffle Cake (GF)', desc: 'Gluten-free option' },
          { id: 'des3', name: 'Crème Caramel', desc: 'Classic custard' },
          { id: 'des4', name: "Chef's Featured Dessert", desc: 'Rotating feature' }
        ],
        drinks: [
          { id: 'd1', name: 'Raspberry Mule', desc: 'Stoli, lime, simple, raspberries, Fever-Tree ginger beer', price: 14 },
          { id: 'd2', name: 'Perfect Lemon Drop', desc: 'Absolut Citron, triple sec, simple, fresh lemon', price: 15 },
          { id: 'd3', name: 'Perfect Patron Margarita', desc: 'Patrón Silver, Grand Marnier, agave, citrus', price: 16 },
          { id: 'd4', name: 'Bulleit Old Fashioned', desc: 'Bulleit Bourbon, Angostura, simple', price: 14 },
          { id: 'd5', name: "Jake's Iced Tea", desc: 'Tito\'s, Bacardi, Beefeater, Cointreau, lemon, Coke', price: 14 },
          { id: 'd6', name: 'Prosecco Sangria', desc: 'Bacardi Limon, strawberries, cucumber, Prosecco', price: 13 },
          { id: 'd7', name: 'Wine by the Glass', desc: 'Hosted glass pours from bottle list (* items)', price: 14 },
          { id: 'd8', name: 'Soft Drink / Non-Alcoholic', desc: 'Soda, sparkling water, coffee, tea', price: 5 }
        ]
      },
      costSim: {
        quoteDate: '2026-07-14',
        source: "Cyrano Clark (Cyrano.Clark@ldry.com) + private dining menu / spaces / cocktails / wine PDFs + Hardy Room photos",
        budgetOk: true,
        fbMin: 1500,
        servicePct: 0.22,
        roomFee: 200,
        avFee: 250,
        packagePp: 65,
        drinkPp: 14,
        roomName: 'Hardy Room (multiple tables up to 50 · U-shape 28 · conference 24)',
        proposedDate: '2026-08-15',
        note: 'REAL QUOTE: Hardy Room · $200 room + $1,500 F&B min + $250 screen/projector + 22% banquet fee on F&B. Gold Dinner $65/pp (15–50; pre-select 4 days out for 25+). Platinum $75/pp optional. Buffet dinner $55/pp alt. Contract + 50% deposit to hold. Phone (503) 241-2125 / info@jakescatering.com. UNDER $3k F&B min — top contender. Attachments in data/venue-attachments/jakes-*.',
        scenarios: [
          { guests: 30, median: 3341, p10: 3074, p90: 3675, perGuest: 111 },
          { guests: 35, median: 3823, p10: 3517, p90: 4205, perGuest: 109 },
          { guests: 40, median: 4305, p10: 3961, p90: 4736, perGuest: 108 }
        ]
      }
    },


    'the-cove': {
      id: 'the-cove',
      slug: 'the-cove',
      type: 'screening',
      theme: 'forest',
      name: 'The Cove',
      shortName: 'The Cove',
      city: 'Vancouver, WA',
      venue: '2nd Floor Private — 5731 SE Columbia Way',
      storageKey: 'thecove_orders_v1',
      contact: {
        name: 'Brianna Carlson',
        email: 'brianna@thecovewa.com',
        phone: '360-844-9540',
        role: 'Group Dining'
      },
      attachments: [
        { name: 'Banquet Menu 2026 Summer', path: 'data/venue-attachments/cove-banquet-menu-2026-summer.pdf', kind: 'menu' },
        { name: 'Two long tables (water view)', path: 'data/venue-attachments/cove-two-long-tables-water.jpg', thumb: 'data/venue-attachments/thumbs/cove-two-long-tables-water.jpg', kind: 'photo' },
        { name: 'Small group with TV', path: 'data/venue-attachments/cove-small-group-tv.jpg', thumb: 'data/venue-attachments/thumbs/cove-small-group-tv.jpg', kind: 'photo' },
        { name: 'Six tops layout', path: 'data/venue-attachments/cove-six-tops.jpg', thumb: 'data/venue-attachments/thumbs/cove-six-tops.jpg', kind: 'photo' }
      ],
      heroSub: 'A private film screening & dinner on the river at The Cove in Vancouver.',
      cta: 'Reserve Your Seat',
      meta: [
        { strong: 'The Cove', label: 'Vancouver, WA' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: '2nd Floor', label: 'Full floor + decks' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary that explores the financial risks most Americans face in retirement and the strategies that can make the difference between struggle and security.",
        "The evening is hosted on the <strong>entire second floor</strong> of The Cove — two decks overlooking the Columbia, private for our group. Film on the 60\" rolling TV (or bring a larger projector), then plated dinner. No pressure, no pitch."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Doors open 15 minutes early on the private 2nd floor with river-view decks.' },
        { title: 'Watch the Film', desc: 'Retirement Everest screens on the venue 60\" TV (or your projector) — real stories, real clarity.' },
        { title: 'A Plated Dinner', desc: 'After the film: group salad, two entrée choices (or duette plates), dessert — from the Summer 2026 banquet menu.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Dinner Selection',
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your entrée and drink so we can have it ready for you.',
      formNote: 'REAL QUOTE 2026-07-17 (Brianna Carlson): F&B min $3,000 Sun–Thu (closed Mon) / $3,800 Fri–Sat + 20% grat + 4% admin + tax. Plated mains $61–$73 + dessert $14. $600 deposit + LOI to hold. 60\" rolling TV only.',
      footer: 'Retirement Everest · Private Screening Series · The Cove · Vancouver, WA',
      menus: {
        salads: [
          { id: 'sal1', name: 'Cove Caesar', desc: 'Chopped romaine, Meyer lemon Caesar, croutons, Reggiano (group preselect)', veg: true },
          { id: 'sal2', name: 'Cove Salad', desc: 'Oregon bay shrimp, field greens, radish, tomato, snap peas, corn, asparagus, tarragon lemon dill' }
        ],
        entrees: [
          { id: 'e1', name: 'King Salmon', desc: 'Wood grilled, lemon butter + seasonal veg + focaccia', price: 61 },
          { id: 'e2', name: 'Pistachio Crusted Halibut', desc: 'Roasted pineapple, orange ginger butter', price: 63 },
          { id: 'e3', name: 'Mediterranean Chicken', desc: 'Lemon + coriander bone-in breast, pine nuts, red pepper tzatziki', price: 61 },
          { id: 'e4', name: 'Wood Grilled Ribeye', desc: 'Gorgonzola dolce butter, wild mushroom', price: 68 },
          { id: 'e5', name: 'Tenderloin Filet', desc: 'Wood grilled, port demi', price: 73 },
          { id: 'e6', name: 'Duet Filet + Salmon', desc: 'Whole-party duette option — no individual entrée polling', price: 78 },
          { id: 'e7', name: 'Dinner Buffet', desc: 'Buffet package (alt) — headcount 3 days prior', price: 82 }
        ],
        desserts: [
          { id: 'des1', name: 'Plated Dessert ($14 pp)', desc: 'Individual plated — entire group same dessert' },
          { id: 'des2', name: 'Family-Style Dessert Service', desc: 'Selection of featured desserts for the table' }
        ],
        drinks: [
          { id: 'd1', name: 'House Wine (Glass)', desc: 'Red or white', price: 14 },
          { id: 'd2', name: 'Cocktail', desc: 'Well / signature', price: 16 },
          { id: 'd3', name: 'Beer', desc: 'Draft or bottle', price: 8 },
          { id: 'd4', name: 'Soft Drink / NA', desc: 'Soda, sparkling, coffee, tea', price: 5 }
        ]
      },
      costSim: {
        outOfMarket: true,
        market: 'vancouver_wa',
        budgetOk: false,
        quoteDate: '2026-07-17',
        source: 'Brianna Carlson (brianna@thecovewa.com) + cove-banquet-menu-2026-summer.pdf + room photos',
        budgetOk: true,
        fbMin: 3000,
        servicePct: 0.24,
        roomFee: 0,
        avFee: 0,
        packagePp: 79,
        drinkPp: 14,
        roomName: 'Full 2nd floor + two river decks (60\" rolling TV; bring projector if needed)',
        note: 'REAL QUOTE: Sun–Thu F&B min $3,000 (closed Mon) = at $3k ceiling · Fri/Sat $3,800 OVER. Fees: 20% gratuity + 4% admin (+ tax not modeled). Plated dinner mains $61–$73 + dessert $14 ≈ $79 food/pp; drinks est. $14. @30 guests food+bev under min → pay $3,000 floor × 1.24 = $3,720. @35 clears min → ~$4,036. Fri/Sat floor @35 ≈ $4,712. Hold: $600 deposit + LOI. UNDER $3k F&B min Sun–Thu — active contender.',
        scenarios: [
          { guests: 30, median: 3720, p10: 3422, p90: 4092, perGuest: 124 },
          { guests: 35, median: 4036, p10: 3713, p90: 4440, perGuest: 115 },
          { guests: 40, median: 4613, p10: 4244, p90: 5074, perGuest: 115 }
        ]
      }
    },

    'chart-house': {
      id: 'chart-house',
      slug: 'chart-house',
      type: 'screening',
      theme: 'navy',
      name: 'Chart House Portland',
      shortName: 'Chart House',
      city: 'Portland, OR',
      venue: 'Private dining — Brandie Hiser (Landry\'s)',
      storageKey: 'charthouse_orders_v1',
      contact: {
        name: 'Brandie Hiser',
        email: 'brandie.hiser@ldry.com',
        phone: '',
        role: "Landry's / Chart House private dining"
      },
      heroSub: 'A private film screening & waterfront dinner at Chart House Portland.',
      cta: 'Reserve Your Seat',
      meta: [
        { strong: 'Chart House', label: 'Portland, OR' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Aug 15 option', label: '5:30pm space held interest' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong>.",
        "Chart House Portland (Landry's) has a private space option under discussion for mid-August — F&B minimum still to confirm with Brandie Hiser."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Private dining arrival 15 minutes before showtime.' },
        { title: 'Watch the Film', desc: 'Retirement Everest screens with the group — confirm AV on tour.' },
        { title: 'Dinner', desc: 'Plated private-dining menu TBD after F&B min and package quote.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Dinner Selection',
      formIntro: 'Dinner is included — selections finalize after the venue package is confirmed.',
      formNote: 'OUTLOOK 2026-07-17: Brandie Hiser (brandie.hiser@ldry.com — LEGIT Landry\'s corp domain). Private space available Aug 15 @ 5:30pm; wants in-person tour. F&B min + AV NOT YET QUOTED — do not model as firm until Brandie confirms.',
      footer: 'Retirement Everest · Private Screening Series · Chart House · Portland, OR',
      menus: {
        salads: [
          { id: 'sal1', name: 'House Salad (TBD)', desc: 'Confirm with Brandie on tour', veg: true }
        ],
        entrees: [
          { id: 'e1', name: 'Private dining entrée (TBD)', desc: 'Package pricing pending F&B min quote', price: 70 }
        ],
        desserts: [
          { id: 'des1', name: 'Dessert (TBD)', desc: 'Included package TBD' }
        ],
        drinks: [
          { id: 'd1', name: 'Wine / Cocktail (est.)', desc: 'Estimate until quote', price: 15 },
          { id: 'd2', name: 'Soft Drink / NA', desc: 'Non-alcoholic', price: 5 }
        ]
      },
      costSim: {
        quoteDate: '2026-07-17',
        source: 'Brandie Hiser <brandie.hiser@ldry.com> Outlook — Aug 15 5:30 private space; F&B min TBD',
        budgetOk: null,
        fbMin: 0,
        servicePct: 0.22,
        roomFee: 0,
        avFee: 0,
        packagePp: 70,
        drinkPp: 15,
        roomName: 'Private space (Aug 15 5:30pm option) — confirm on tour',
        proposedDate: '2026-08-15',
        note: 'Availability only so far — no F&B min. Scenarios are PLACEHOLDER food+bev (~$85pp × 1.22) WITHOUT a private min. Same Landry\'s family as Jake\'s (ldry.com). Ask min + AV before touring. Drop if min > $3,000.',
        scenarios: [
          { guests: 30, median: 3105, p10: 2857, p90: 3416, perGuest: 104 },
          { guests: 35, median: 3623, p10: 3333, p90: 3985, perGuest: 104 },
          { guests: 40, median: 4140, p10: 3809, p90: 4554, perGuest: 104 }
        ]
      }
    },

    'heathman-lodge': {
      id: 'heathman-lodge',
      slug: 'heathman-lodge',
      type: 'screening',
      theme: 'forest',
      name: "Hudson's / Heathman Lodge",
      shortName: 'Heathman Lodge',
      city: 'Vancouver, WA',
      venue: "Hudson's Bar & Grill — Heathman Lodge",
      storageKey: 'heathmanlodge_orders_v1',
      contact: {
        name: 'Kayla Storms',
        email: 'Kayla.Storms@heathmanlodge.com',
        phone: '(360) 816-6100',
        role: 'Convention Services Manager'
      },
      heroSub: "A private film screening & dinner at Hudson's / Heathman Lodge in Vancouver.",
      cta: 'Reserve Your Seat',
      meta: [
        { strong: 'Heathman Lodge', label: 'Vancouver, WA' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Limited', label: 'Seats Available' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong>.",
        "Hosted at Heathman Lodge with Hudson's private dining / banquet support — Kayla Storms has sent catering and AV materials; firm F&B minimum pending date and menu."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Lodge event arrival 15 minutes before showtime.' },
        { title: 'Watch the Film', desc: 'Screening with lodge AV (pricing from Kayla packet).' },
        { title: 'Dinner', desc: 'Catered plated or buffet per Kayla menu — finalize after quote.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Dinner Selection',
      formIntro: 'Dinner is included — menu locks after we confirm the package with the lodge.',
      formNote: 'OUTLOOK 2026-07-17: Kayla Storms sent catering menu + AV pricing; pricing TBD on menu/date. Import Kayla attachments when available from Outlook.',
      footer: "Retirement Everest · Private Screening Series · Hudson's / Heathman Lodge · Vancouver, WA",
      menus: {
        salads: [
          { id: 'sal1', name: 'Starter (from Kayla packet)', desc: 'Confirm after menu import', veg: true }
        ],
        entrees: [
          { id: 'e1', name: 'Entrée (TBD)', desc: 'Package pricing pending firm quote', price: 55 }
        ],
        desserts: [
          { id: 'des1', name: 'Dessert (TBD)', desc: 'Per catering menu' }
        ],
        drinks: [
          { id: 'd1', name: 'Wine / Cocktail (est.)', desc: 'Estimate', price: 12 },
          { id: 'd2', name: 'Soft Drink / NA', desc: 'Non-alcoholic', price: 4 }
        ]
      },
      costSim: {
        outOfMarket: true,
        market: 'vancouver_wa',
        budgetOk: false,
        quoteDate: '2026-07-17',
        source: 'Kayla Storms <Kayla.Storms@heathmanlodge.com> — catering + AV packet (pricing TBD on menu/date)',
        budgetOk: null,
        fbMin: 0,
        servicePct: 0.20,
        roomFee: 0,
        avFee: 0,
        packagePp: 55,
        drinkPp: 12,
        roomName: "Hudson's / Heathman Lodge event space (TBD)",
        note: 'REAL contact + materials, NO firm F&B min yet. Scenarios are rough placeholders (~$67pp food+bev × 1.20) until Kayla quotes min for ~35 + film. Original RFP Paul.Bardzik@heathmanlodge.com. Get min before committing.',
        scenarios: [
          { guests: 30, median: 2412, p10: 2219, p90: 2653, perGuest: 80 },
          { guests: 35, median: 2814, p10: 2589, p90: 3095, perGuest: 80 },
          { guests: 40, median: 3216, p10: 2959, p90: 3538, perGuest: 80 }
        ]
      }
    },


    'osf-vancouver': {
      id: 'osf-vancouver',
      slug: 'osf-vancouver',
      type: 'screening',
      theme: 'gold',
      name: 'Old Spaghetti Factory Vancouver',
      shortName: 'OSF Vancouver',
      city: 'Vancouver, WA',
      venue: 'Banquet room — 730 SE 160th Ave',
      storageKey: 'osfvancouver_orders_v1',
      contact: {
        name: 'Banquet Manager',
        email: 'vancouver@osf.com',
        phone: '(360) 253-9030',
        role: 'Banquet / large groups (callback received)'
      },
      heroSub: 'A private film screening & classic Italian banquet dinner at Old Spaghetti Factory Vancouver.',
      cta: 'Reserve Your Seat',
      meta: [
        { strong: 'Old Spaghetti Factory', label: 'Vancouver, WA' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Banquet room', label: '25–75+ guests' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary about the retirement risks most people never see coming.",
        "The evening is hosted in a private banquet room at <strong>The Old Spaghetti Factory Vancouver</strong> — value-friendly three-course Italian, group-friendly service, and room for ~35. Film first, then dinner. No pressure, no pitch."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Doors open 15 minutes early in the banquet room for seating and a quick tech check.' },
        { title: 'Watch the Film', desc: 'Retirement Everest screens with the group — confirm AV (screen/projector) with the banquet manager.' },
        { title: 'A Three-Course Dinner', desc: 'Classic OSF banquet style: bread, salad, entrée choice, and signature spumoni — easy for 30–40 guests.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Dinner Selection',
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your entrée and drink so we can have it ready for you.',
      formNote: 'QUOTE: $20/head FOOD ONLY (OSF Vancouver banquet). Then beverages + tip + WA tax (bread, salad, entrée, spumoni) by location. Model uses $25 food + $10 drink + 18% service + ~8.7% WA sales tax. Phone (360) 253-9030. Callback received — confirm exact package, room capacity for film, and AV fees. Note: WA tax applies (Oregon venues do not).',
      footer: 'Retirement Everest · Private Screening Series · Old Spaghetti Factory · Vancouver, WA',
      menus: {
        salads: [
          { id: 'sal1', name: 'Mizithra Cheese & Browned Butter salad course', desc: 'Included in banquet — house salad with choice of dressing', veg: true },
          { id: 'sal2', name: 'House Green Salad', desc: 'Classic banquet salad (group preselect dressings)', veg: true }
        ],
        entrees: [
          { id: 'e1', name: 'Spaghetti with Mizithra Cheese & Browned Butter', desc: 'OSF signature — banquet entrée option', price: 20, veg: true },
          { id: 'e2', name: 'Spaghetti with Meat Sauce', desc: 'House meat sauce', price: 25 },
          { id: 'e3', name: 'Spaghetti with Meatballs', desc: 'Classic with meatballs', price: 25 },
          { id: 'e4', name: 'Manager\'s Favorite / Baked Lasagna', desc: 'Typical banquet alternate entrée', price: 25 },
          { id: 'e5', name: 'Chicken Marsala or similar', desc: 'Non-pasta banquet option when offered', price: 27 },
          { id: 'e6', name: 'Gluten-sensitive / kids pasta', desc: 'Request with banquet manager', price: 25 }
        ],
        desserts: [
          { id: 'des1', name: 'Spumoni Ice Cream', desc: 'Signature OSF dessert — included on banquet packages' }
        ],
        drinks: [
          { id: 'd1', name: 'Soft Drink / Iced Tea', desc: 'Fountain or iced tea', price: 4 },
          { id: 'd2', name: 'House Wine (Glass)', desc: 'Red or white', price: 10 },
          { id: 'd3', name: 'Beer', desc: 'Draft or bottle', price: 8 },
          { id: 'd4', name: 'Cocktail', desc: 'Well cocktail', price: 12 },
          { id: 'd5', name: 'Coffee / Tea', desc: 'With dessert', price: 4 }
        ]
      },
      costSim: {
        quoteDate: '2026-07-17',
        source: 'Johnny: OSF Vancouver banquet quote $20/head FOOD ONLY; then beverages + tip/gratuity + WA tax. Full email body not yet in jonray757 Gmail inbox — model locked to stated food price.',
        budgetOk: true,
        outOfMarket: false,
        market: 'vancouver_wa',
        geoNote: 'Vancouver WA geo exception — WA sales tax modeled at 8.7%. Food quote is $20/pp alone.',
        fbMin: 0,
        servicePct: 0.18,
        taxPct: 0.087,
        roomFee: 0,
        avFee: 0,
        packagePp: 20,
        drinkPp: 10,
        roomName: 'Private banquet room — 730 SE 160th Ave, Vancouver WA',
        proposedDate: null,
        note: 'REAL FOOD QUOTE: $20 per head FOOD ONLY (banquet package). ADD: beverages (modeled $10/pp blend; soft drinks ~$4–6, wine/beer higher), 18% tip/gratuity, ~8.7% WA sales tax, any AV fee TBD. @35: food $700; food+tip $826; food+tip+tax ~$898; with $10 drink/pp → total host ~$1,347 (~$38/head). Soft-drink-heavy (~$6) → ~$1,167; cocktail-heavy (~$14) → ~$1,526. Still mid-tier band. Confirm: exact banquet inclusions at $20, beverage pricing, gratuity %, tax, room/AV, deposit.',
        scenarios: [
          { guests: 30, median: 1154, p10: 1062, p90: 1269, perGuest: 38 },
          { guests: 35, median: 1347, p10: 1239, p90: 1482, perGuest: 38 },
          { guests: 40, median: 1539, p10: 1416, p90: 1693, perGuest: 38 }
        ]
      }
    },

    andina: {
      id: 'andina',
      slug: 'andina',
      type: 'screening',
      theme: 'forest',
      name: 'Andina Restaurant',
      shortName: 'Andina',
      city: 'Portland, OR',
      venue: 'Tupai Room — Pearl District (private dining)',
      storageKey: 'andina_orders_v1',
      attachments: [
        { name: 'Andina Experience menu', path: 'data/venue-attachments/andina-Summer 26 Andina Experience.pdf', kind: 'menu' },
        { name: 'Bocaditos menu', path: 'data/venue-attachments/andina-Summer 26 BOCAS.pdf', kind: 'menu' },
        { name: 'Beverage / wine', path: 'data/venue-attachments/andina-BTB - Summer 2026 .pdf', kind: 'menu' },
        { name: 'Welcome letter', path: 'data/venue-attachments/andina-Summer 26 Welcome Letter.pdf', kind: 'packet' },
        { name: 'Tupai 1', path: 'data/venue-attachments/andina-Tupai 1.jpg', thumb: 'data/venue-attachments/thumbs/andina-Tupai 1.jpg', kind: 'photo' },
        { name: 'Tupai 2', path: 'data/venue-attachments/andina-Tupai 2.jpg', thumb: 'data/venue-attachments/thumbs/andina-Tupai 2.jpg', kind: 'photo' },
        { name: 'Tupai 3', path: 'data/venue-attachments/andina-Tupai 3.jpg', thumb: 'data/venue-attachments/thumbs/andina-Tupai 3.jpg', kind: 'photo' },
        { name: 'Tupai 4', path: 'data/venue-attachments/andina-Tupai 4.jpg', thumb: 'data/venue-attachments/thumbs/andina-Tupai 4.jpg', kind: 'photo' }
      ],
      heroSub: 'A private film screening & Peruvian dinner at Andina in the Pearl.',
      cta: 'Reserve Your Seat',
      meta: [
        { strong: 'Andina', label: 'Pearl District, Portland' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Limited', label: 'Seats Available' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary that explores the financial risks most Americans face in retirement and the strategies that can make the difference between struggle and security.",
        "The evening is hosted at <strong>Andina</strong> — Portland’s celebrated Peruvian kitchen in the Pearl. Distinctive plates, warm hospitality, and a private room for film plus dinner. No pressure, no pitch."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Doors open 15 minutes before showtime in private dining. A vibrant, upscale Peruvian atmosphere.' },
        { title: 'Watch the Film', desc: 'Retirement Everest screens with the group — real stories, real clarity.' },
        { title: 'A Plated Dinner', desc: 'After the film, enjoy a complimentary plated dinner — starter or salad, plato de fondo, and dessert of your choice.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Dinner Selection',
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your starter, main, dessert, and drink below so we can have it ready for you.',
      formNote: 'REAL package: Andina Experience $110/pp family-style (pre-select for whole group). Entradas + platos + postres from Summer 2026 private dining PDF. Tupai room required for ~35 with AV ($4,000 F&B min — over series budget).',
      footer: 'Retirement Everest · Private Screening Series · Andina · Portland, OR',
      menus: {
        salads: [
          { id: 'sal1', name: 'Ensalada Andina', desc: 'Market greens, strawberry, radish, red onion, cancha, ají limo & mint vinaigrette (v, gf)', veg: true },
          { id: 'sal2', name: 'Papa a la Huancaína', desc: 'Smashed local potatoes, olives, cured egg yolk, chives (veg, gf)', veg: true },
          { id: 'sal3', name: 'Pasta al Pesto', desc: 'Orecchiette, grape tomato, queso fresco, botija olive (veg)', veg: true },
          { id: 'sal4', name: 'Sesame Seared Albacore (add-on)', desc: '+$7 pp upgrade on entradas course', price: 7 }
        ],
        entrees: [
          { id: 'e1', name: 'Lomo Corto a la Parrilla', desc: 'Teres major, smoked ají chimichurri, pepperonata, caramelized pearl onions', price: 110 },
          { id: 'e2', name: 'Pollo a la Brasa', desc: 'Peruvian rotisserie chicken, ají rocoto, salsa criolla', price: 110 },
          { id: 'e3', name: 'Tallarin Saltado con Camarones', desc: 'Stir-fried chifa noodles, shrimp, tamari, tomatoes, red onion', price: 110 },
          { id: 'e4', name: 'Tallarin Saltado con Vegetales', desc: 'Stir-fried chifa noodles, market vegetables (v)', price: 110, vegan: true },
          { id: 'e5', name: 'Quinotto', desc: "Seasonal quinoa 'risotto' (v, gf)", price: 110, vegan: true },
          { id: 'e6', name: 'Local Halibut (upgrade)', desc: 'Sweet corn & choclo succotash — +$20 pp', price: 130 }
        ],
        desserts: [
          { id: 'des1', name: 'Salted Caramel & Chocolate Tartlette', desc: 'Caramel, ganache, sea salt (veg) — included in package' },
          { id: 'des2', name: 'Vasitos de Cheesecake', desc: 'Market fruit, whipped cheesecake, oat crumb — included in package' }
        ],
        drinks: [
          { id: 'd1', name: 'Specialty Cocktail', desc: 'Avg ~$19 per cocktail (Savannah quote)', price: 19 },
          { id: 'd2', name: 'House Wine (Bottle)', desc: 'Intro tier ~$70–80/bottle', price: 18 },
          { id: 'd3', name: 'Soft Drink / NA', desc: 'Non-alcoholic', price: 5 },
          { id: 'd4', name: 'Coffee / Tea', desc: 'With dessert service', price: 4 }
        ]
      },
      
      costSim: {
        quoteDate: '2026-07-14',
        source: 'Savannah Goole + Andina Experience / Welcome / BOCAS / BTB PDFs + Tupai photos',
        budgetOk: false,
        fbMin: 4000,
        servicePct: 0.26,
        roomFee: 0,
        avFee: 0,
        packagePp: 110,
        drinkPp: 19,
        roomName: 'Tupai (only room that fits ~35 w/ AV · up to 48 seated w AV / 60 w/o)',
        note: 'REAL QUOTE: Tupai F&B min $4,000 + 26% (20% gratuity + 6% SC). Andina Experience $110/pp family-style 3-course (beverages separate; cocktails ~$19). Bocaditos min +$30/pp optional. OVER $3k → parked. PDFs: andina-Summer 26 Andina Experience.pdf, BOCAS, BTB, Welcome Letter. Photos: andina-Tupai 1–4.jpg.',
        scenarios: [
          { guests: 30, median: 5040, p10: 5040, p90: 5544, perGuest: 168 },
          { guests: 35, median: 5689, p10: 5234, p90: 6258, perGuest: 163 },
          { guests: 40, median: 6502, p10: 5982, p90: 7152, perGuest: 163 }
        ]
      }
    }
  }
};