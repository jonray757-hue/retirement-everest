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
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your salad, entrée, and dessert below so we can have it ready for you.',
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
        ]
      },
      costSim: {
        note: 'Oregon has no sales tax. Figures exclude tax. Edgefield banquet pricing includes a mandatory F&B service charge — confirm with their sales coordinator.',
        scenarios: [
          { guests: 25, median: 1775, p10: 1650, p90: 1900, perGuest: 71 },
          { guests: 40, median: 2852, p10: 2640, p90: 3100, perGuest: 71.3 },
          { guests: 60, median: 4278, p10: 3960, p90: 4650, perGuest: 71.3 }
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
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your salad, entrée, and dessert below so we can have it ready for you.',
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
        note: 'Oregon has no sales tax. Menu pricing from Grand Lodge banquet packages (Hearthstone $68, Cascadia $88 pp). Figures include ~20% F&B service charge. F&B minimum varies by date — confirm with sales coordinator (503.992.9530).',
        scenarios: [
          { guests: 30, median: 2160, p10: 2010, p90: 2310, perGuest: 72 },
          { guests: 40, median: 2880, p10: 2680, p90: 3080, perGuest: 72 },
          { guests: 50, median: 3600, p10: 3350, p90: 3850, perGuest: 72 }
        ]
      }
    },
    'kennedy-school': {
      id: 'kennedy-school',
      slug: 'kennedy-school',
      type: 'preorder',
      theme: 'gold',
      name: 'McMenamins Kennedy School',
      shortName: 'Kennedy School',
      city: 'Portland, OR',
      venue: 'Martha Jordan Room',
      storageKey: 'kennedyschool_orders_v1',
      heroSub: 'A private film screening and complimentary dinner at McMenamins Kennedy School.',
      cta: 'Select Your Meal',
      meta: [
        { strong: 'Kennedy School', label: 'Portland, OR' },
        { strong: 'Complimentary', label: 'Dinner Included' },
        { strong: 'Limited', label: 'Seats Available' }
      ],
      aboutLabel: 'About the Evening',
      aboutHeadline: "This is not a seminar.<br>It's a private premiere.",
      about: [
        "You've been personally invited to an exclusive screening of <strong>Retirement Everest</strong> — a powerful documentary that explores the financial risks most Americans face in retirement and the strategies that can make the difference between struggle and security.",
        "The evening takes place in the Martha Jordan Room — a historic classroom turned private event space. Watch the film, then enjoy Courtyard Restaurant fare at your table in the same room. No moving between buildings."
      ],
      expect: [
        { title: 'Arrive & Be Welcomed', desc: 'Doors open 15 minutes before showtime in the Martha Jordan Room. Our team guides you to your seat in this single, private space.' },
        { title: 'Watch the Film', desc: 'Retirement Everest delivers the kind of clarity most people never get from a financial advisor — told through real stories in a beautifully restored school setting.' },
        { title: 'Dinner & Conversation', desc: 'After the screening, enjoy a full dinner on us. Your pre-selected meal from the Courtyard Restaurant menu is served at your table — no lines, no waiting.' }
      ],
      formTitle: 'Reserve Your Seat at the Table',
      formLabel: 'Your Meal Selection',
      formIntro: 'Dinner is included with your attendance — complimentary, no strings attached.<br>Select your meal below so we can have it ready for you.',
      formNote: '🍽 Your arrival bite is waiting at the table when you sit down. Dinner is served <strong>after the film</strong> — your main and drink are prepared fresh and brought out following the screening.',
      footer: 'Retirement Everest · Private Screening Series · McMenamins Kennedy School · Portland, OR',
      menus: {
        starters: [
          { id: 's1', name: 'Hummus', desc: 'Marinated olives, veggies, feta, pita bread', price: 16.50, veg: true, cat: 'Snack' },
          { id: 's2', name: 'Soft Pretzel Sticks', desc: 'Served with cheese & ale fondue', price: 15.00, veg: true, cat: 'Snack' },
          { id: 's3', name: 'Cheeseburger Slider Trio', desc: 'Most Awesome French Onion seasoning, American cheese, Mystic 18 sauce, Hawaiian roll', price: 15.00, cat: 'Snack' },
          { id: 's4', name: 'Cajun Tots', desc: 'Served with peppercorn ranch', price: 12.25, veg: true, cat: 'Snack' },
          { id: 's5', name: 'McMenamins Fries', desc: 'Served with Mystic 18 sauce', price: 12.25, vegan: true, cat: 'Snack' },
          { id: 's6', name: 'Sesame Seared Ahi', desc: 'Ginger-wasabi mayo, spicy-sweet slaw, scallions', price: 18.75, cat: 'Snack' },
          { id: 's7', name: 'Cellarmasters Steak & Mushroom Bites', desc: 'Beef ribeye, button mushrooms, Black Rabbit Red demi-glace, horseradish sour cream, garlic bread', price: 23.00, cat: 'Snack' },
          { id: 's8', name: 'Pub Green Salad', desc: 'Mixed greens, grape tomatoes, cucumber, marinated red onion, croutons, Parmesan, choice of dressing', price: 14.25, veg: true, cat: 'Salad' },
          { id: 's9', name: 'Aztec Salad', desc: 'Romaine, corn & black bean salsa, avocado, tortilla strips, cheddar, tomato, jalapeño, cilantro, onion, chipotle dressing', price: 18.25, veg: true, cat: 'Salad' },
          { id: 's10', name: 'Six Arms Goddess Salad', desc: 'Romaine, cucumber, tomato, bell peppers, marinated onion, pita chips, Goddess dressing', price: 16.25, vegan: true, cat: 'Salad' }
        ],
        mains: [
          { id: 'm1', name: 'Jamaican Rice Bowl', desc: 'Coconut curry, squash, cabbage, red bell pepper, carrot, celery, onion, black beans, avocado, mango chutney, cilantro', price: 19.75, vegan: true },
          { id: 'm2', name: 'Hogshead Crispy Chicken', desc: 'Fried chicken, Hogshead honey mustard mayo, lettuce & pickle chips on a bun', price: 19.75 },
          { id: 'm3', name: 'El Diablo Chicken Sandwich', desc: 'Spiced chicken, pepper jack, avocado, Dark Star mayo, lettuce, tomato & red onion', price: 23.25 },
          { id: 'm4', name: 'Ale-Battered Fish & Chips', desc: 'Wild Alaskan cod, fries, tartar sauce, buttermilk coleslaw', price: 25.00 },
          { id: 'm5', name: 'Bacon Cheeseburger', desc: '6-oz beef patty, lettuce, tomato, red onion, pickles, secret sauce', price: 21.50 },
          { id: 'm6', name: "JR's Jumbo Deluxe Burger", desc: 'Bacon, cheddar & fried egg — served with fries or tots', price: 22.50 },
          { id: 'm7', name: 'MYSTIC 18 Beyond Burger', desc: 'Beyond patty, Mystic 18 sauce, creamy Chao slice — fries or tots', price: 22.00, vegan: true },
          { id: 'm8', name: 'Hammerhead Garden Burger', desc: 'Housemade garden patty, lettuce, tomato, onion, pickles', price: 19.00, veg: true },
          { id: 'm9', name: 'The Grand Reuben', desc: 'Corned beef, Swiss, kümmel sauerkraut, Mystic 18 sauce, grilled marbled rye', price: 25.50 },
          { id: 'm10', name: 'Primavera Pesto Pasta', desc: 'Broccolini, arugula, grape tomatoes, basil pesto, White Rabbit wine, Parmesan, linguini, garlic bread', price: 21.25, veg: true, special: true },
          { id: 'm11', name: 'Grilled Lemon-Pepper Salmon', desc: 'White Rabbit-herb butter, Yukon Gold mashed potatoes, grilled asparagus', price: 27.00, special: true },
          { id: 'm12', name: 'Terminator Steak & Frites', desc: 'New York steak, Terminator steak & horseradish sauces, fries', price: 35.50, special: true }
        ],
        drinks: [
          { id: 'd1', name: 'McMenamins Beer (Pint)', desc: 'House-brewed craft beer on site', price: 6.50 },
          { id: 'd2', name: 'Edgefield Hard Cider (Pint)', desc: 'McMenamins Edgefield cider', price: 6.50 },
          { id: 'd3', name: 'Edgefield Wine (Glass)', desc: "Red or white — ask staff for the evening's pour", price: 8.00 },
          { id: 'd4', name: 'Well Cocktail', desc: 'Bourbon, gin, vodka, tequila, rum, scotch, or brandy', price: 8.00 },
          { id: 'd5', name: 'Featured Illustrated Cocktail', desc: "Tonight's special hand-crafted cocktail", price: 12.00 },
          { id: 'd6', name: 'Brewery Flight', desc: 'Six samples of McMenamins house-brewed beers', price: 13.50 },
          { id: 'd7', name: 'Soft Drink / Non-Alcoholic', desc: 'Soda, sparkling water, or juice', price: 4.25 }
        ]
      },
      costSim: {
        note: 'Oregon has no sales tax. Menu pricing from Courtyard Restaurant (Spring \'26). Figures include subtotal + 20% gratuity. Arrival bites modeled at ~33% skip rate. F&B minimum applies — confirm with sales coordinator (503.288.3286).',
        scenarios: [
          { guests: 30, median: 1313, p10: 1234, p90: 1395, perGuest: 44 },
          { guests: 37, median: 1621, p10: 1529, p90: 1713, perGuest: 44 },
          { guests: 40, median: 1752, p10: 1652, p90: 1856, perGuest: 44 }
        ]
      }
    }
  }
};