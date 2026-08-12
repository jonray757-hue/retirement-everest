/**
 * Contact enrichment + call-priority scoring for Event CRM.
 *
 * Categories (tags):
 *   call-priority-couple        — married / couple (highest)
 *   call-priority-single-woman  — single women
 *   call-priority-single-man    — single men (lowest)
 *
 * Score = category base + enrichment bonuses. Higher = call first.
 * Manual overrides (gender, household) always win over heuristics.
 */
(function (global) {
  const TAGS = {
    couple: 'call-priority-couple',
    singleWoman: 'call-priority-single-woman',
    singleMan: 'call-priority-single-man',
    unknown: 'call-priority-unknown'
  };

  const BASE = {
    couple: 100,
    singleWoman: 60,
    singleMan: 30,
    unknown: 40
  };

  /* Compact US first-name gender lexicon (common names only). */
  const FEMALE = new Set(
    `
    abbey abigail addison adeline adrianne adrienne aimee alana alecia alexa alexandria alexis alice alicia alina
    alisha alison allison allyson alyssa amanda amber amelia amy ana anastasia andrea angela angelica angelina angie
    anita ann anna anne annette annie antoinette april aria ariana arianna ashlee ashley ashton aubrey audra audrey
    autumn ava avery bailey barbara beatrice becca becky belinda bernadette bernice bertha bessie beth bethany betsy
    betty beverly bianca billie blair bonnie brandi brandy brenda briana brianna bridget britney brittany brooke
    caitlin caitlyn camila camille candace candice cara carla carly carmen carol carole carolina caroline carolyn
    carrie casey cassandra cassidy cassie catherine cathy cecilia celeste celia charlene charlotte chelsea cheri
    cherri cherry cheryl chloe christina christine christy cindy claire clara clare clarissa claudette claudia
    colette colleen connie constance cora corinne courtney crystal cynthia daisy dakota dana danielle daphne
    darlene dawn deanna debbie deborah debra delia delilah dena denise desiree diana diane dianne dolly dolores
    donna dora doreen doris dorothy drew ebony eden edith edna eileen elaine eleanor elena elisa elisabeth elise
    eliza elizabeth ella elle ellen ellie eloise elsa elsie elvira elyse emily emma erica erika erin esther ethel
    eunice eva evangelina evelyn faith fallon fannie farrah fay faye felicia fern flora florence fran frances
    francine gabriela gabriella gabrielle gail gayle geneva genevieve georgia georgina geraldine gertrude gillian
    gina ginger gladys gloria grace gracie greta gretchen guadalupe gwen gwendolyn hailey hannah harriet harriett
    hayley hazel heather heidi helen helena hollie holly hope ida ilene iliana india ingrid irene iris irma isabel
    isabella isabelle ivy jackie jacqueline jada jade jaime jamie jane janet janice janie jasmine jayda jayla
    jean jeanne jeannette jemma jenna jennifer jenny jeri jessica jessie jewel jill jillian jo joan joann joanna
    joanne jocelyn jodi jodie jody johanna jolene jordan jordyn josefina josephine josie joy joyce juana juanita
    judith judy julia julianna julie juliet juliette june justice justine kacey kaitlyn kara karen kari karin
    karina karla katelyn katherine kathleen kathryn kathy katie katrina kay kayla kaylee keira kelli kellie kelly
    kelsey kendra kenya kerri kerry kim kimberly kira krista kristen kristi kristie kristin kristina kristine
    kristy krystal kylie lacey lana lanea lara larissa laura laurel lauren laurie laverne leah leann leanna leigh
    leila lena leona lesley leslie leta leticia lila lillian lillie lily linda lindsay lindsey lisa liz liza
    lizzie lois lola lora loraine loraine loretta lori lorie lorraine lou louisa louise lucia lucille lucy luisa
    lupe luz lydia lyla lynn mabel mable maci mackenzie madeleine madeline madelyn madison mae maggie maia
    mallory mandy marcia margaret margarita margie maria mariah marian marianne marie marilyn marisa marisol
    marissa maritza marjorie marlene marsha marta martha martina mary maryann matilda maureen mavis maxine may
    maya meagan megan meghan melanie melinda melissa melody mercedes meredith mia michaela michele michelle
    mikayla mildred millicent mindy miranda miriam misty molly mona monica monique morgan muriel myra myrna myrtle
    nadia nadine nancy naomi natalia natalie natasha nathalie nell nellie nettie nia nicole nikki nina noelle nola
    nora noreen norma odessa olga olive olivia opal ophelia paige pam pamela pat patsy patti patty paula paulette
    pauline pearl peggy penelope penny phoebe phyllis polly priscilla queen rachel rachel rachelle ramona raquel
    reba rebecca rebekah regina rena renee rhonda rita robbie robin robyn rochelle rochelle rosa rosalie rosalind
    rosalyn rose rosella rosemary rosie roxanne ruby ruth sabrina saffron sally samantha sandra sandy sapphire
    sara sarah sasha savanna savannah scarlett selena selma serena shannon shari sharon shauna shawna sheena
    sheila shelby sheldon shelley shelly sherry sheryl shirley sierra silvia simone sofia sonia sonja sonya sophia
    sophie stacey staci stacie stacy stella stephanie sue susan susanna susanne susie suzanne suzie sylvia tabitha
    tamara tami tammie tammy tania tanya tara tasha taylor tera teresa teri terra terri terrie terry tessa thelma
    theresa therese tia tiffany tina toni tonia tonya tracey traci tracie tracy tricia trina trinity trisha
    tristan twilight ursula valerie vanessa vera veronica vicki vickie vicky victoria viola violet virginia vivian
    wanda wendy whitney willow wilma winifred winnie ximena yasmin yolanda yvette yvonne zelda zoe zoey
  `
      .trim()
      .split(/\s+/)
  );

  const MALE = new Set(
    `
    aaron abdul abe abraham adam adan adrian ahmad ahmed aidan aiden alan albert alec alejandro alex alexander
    alexis alfred alfredo ali allan allen alonzo alvin amir amos anderson andre andreas andrew andy angel angelo
    anthony antonio avery axel barry bart beau ben benjamin bennett bernard bernie bert bill billy blair blake
    bob bobby brad bradford bradley brady brandon brendan brent bret brett brian bruce bryan bryant byron
    caleb calvin cameron carl carlos carlton carson carter casey cedric cesar chad charles charlie chase
    chris christian christopher chuck clarence clark clay clayton clifford clifton clinton clyde cody colby
    cole colin collin conner connor conrad corey cory craig curtis dale dallas dalton damian damien damon dan
    daniel danny dante darian darius darrell darren darryl daryl dave david dean demetrius denis dennis derek
    derrick desmond devin devon dewayne dewey dexter diego dillon dominic dominick don donald donnie douglas
    drew duane dwayne dwight dylan earl ed eddie edgar edmund edward edwin eli elias elijah elliot elliott ellis
    elmer elvin elvis elwood emil emilio emmanuel emmett enrique eric erik ernest ernesto ervin ethan eugene
    evan everett ezekiel ezra felix ferdinand fernando floyd forrest frances francis frank franklin fred
    freddie frederick gabriel gavin gene geoffrey george gerald gerard gilbert gino giovanni glen glenn gordon
    graham grant greg gregg gregory gretchen grover guillermo gustavo guy harlan harold harrison harry harvey
    hasan hasan hayden heath hector henry herbert herman homer horace howard hugh humberto hunter ian ibrahim
    ignacio ira irvin irving isaac isaiah isiah ismael israel ivan jack jackson jacob jacques jake james jamie
    jared jarrod jarvis jason javier jay jayden jeff jefferson jeffrey jeremiah jeremy jerome jerry jesse
    jessie jesus jim jimmy joaquin jody joe joel joey john johnny jon jonathan jordan jorge jose joseph josh
    joshua josiah juan judah judd jude jules julian julio julius justin karl keith kelvin ken kenneth kenny
    kent kenyon kerry kevin khalil kirk kristopher kurt kyle lance landon lane larry lawrence lee leo leon
    leonard leroy les leslie lester levi lewis liam lloyd logan lonnie louis lucas luis luke luther lyle lynn
    mack madison malachi malcolm manuel marc marcel marco marcus mario marion mark marlon marshall martin
    marty marvin mason mathew matt matthew maurice max maximilian maxwell melvin micah michael micheal mickey
    miguel mike miles milton mitch mitchell mohamed mohammad mohammed monroe monte morgan morris morton moses
    murray myron nathan nathaniel neal ned neil nelson nestor nicholas nick nicolas nigel nixon noah nolan
    norman norris omar orlando oscar otis otto owen pablo parker patrick paul pedro percy perry pete peter
    phil philip phillip preston quentin quincy quinn rafael ralph ramon randal randall randolph randy raul
    ray raymond reed reggie reginald reid reuben rex richard rick ricky rico riley rob robbie robert robin
    rocky rod rodney roger roland rolando roman ron ronald ronnie rory ross roy ruben rudolph rudy rufus russ
    russell ryan sal salvador sam sammy samuel sandy santiago saul scott sean sebastian sergio seth seymour
    shane shannon shaun shaw shaw shawn shelby shelton sherman sid sidney simon solomon sonny spencer stacy
    stan stanley stephen steve steven stewart stuart sylvester tanner taylor ted teddy terence terrance
    terrell terrence terry theodore thomas tim timothy toby todd tom tomas tommy tony travis trent trenton
    trevor trey troy tyler tyrone tyson ulysses vernon victor vincent virgil vito wade wallace wally walt
    walter warren wayne wesley weston wilbert wilbur will willard william willie wilson woodrow wyatt xavier
    yahir yusuf zach zachary zack zackary zane
  `
      .trim()
      .split(/\s+/)
  );

  function firstToken(name) {
    const raw = String(name || '')
      .replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|miss)\s+/i, '')
      .trim()
      .split(/\s+/)[0] || '';
    return raw.toLowerCase().replace(/[^a-z'-]/g, '');
  }

  function guessGender(contact) {
    if (contact.gender === 'female' || contact.gender === 'male') {
      return { gender: contact.gender, confidence: 'manual', source: 'manual' };
    }
    const first = firstToken(contact.firstName || contact.name);
    if (!first) return { gender: 'unknown', confidence: 'none', source: 'none' };
    if (FEMALE.has(first) && !MALE.has(first)) {
      return { gender: 'female', confidence: 'name', source: 'first-name' };
    }
    if (MALE.has(first) && !FEMALE.has(first)) {
      return { gender: 'male', confidence: 'name', source: 'first-name' };
    }
    // Ambiguous / unlisted
    return { gender: 'unknown', confidence: 'low', source: 'first-name' };
  }

  /**
   * Household from registration + prefs:
   * couple / spouse / partner-joined / 2+ seats → couple
   */
  function inferHousehold(contact) {
    if (contact.household === 'couple' || contact.household === 'single') {
      return { household: contact.household, confidence: 'manual', source: 'manual' };
    }
    const prefs = contact.preferences || {};
    const summary = String(prefs.preferencesSummary || contact.notes || '').toLowerCase();
    const party = String(prefs.partyType || contact.partyType || '').toLowerCase();
    const spouse = prefs.spouse || contact.spouse || '';
    const seats = Array.isArray(prefs.seats) ? prefs.seats : [];
    const seatLabel = String(prefs.seatLabel || '');

    if (
      party === 'couple' ||
      spouse ||
      prefs.joinedPartner ||
      contact.joinedPartner ||
      /partner joined|attending with|couple|spouse|wife|husband|partner/.test(summary) ||
      seats.length >= 2 ||
      /seats?\s+\d+\s*&\s*\d+/i.test(seatLabel)
    ) {
      return { household: 'couple', confidence: 'registration', source: 'prefs-or-seats' };
    }
    if (party === 'solo' || seats.length === 1 || /party:\s*solo/i.test(summary)) {
      return { household: 'single', confidence: 'registration', source: 'prefs-or-seats' };
    }
    // Invited / no prefs yet
    return { household: 'unknown', confidence: 'none', source: 'none' };
  }

  function priorityCategory(household, gender) {
    if (household === 'couple') return 'couple';
    if (household === 'single' && gender === 'female') return 'singleWoman';
    if (household === 'single' && gender === 'male') return 'singleMan';
    // Single unknown gender — middle of singles
    if (household === 'single') return 'unknown';
    // Unknown household: still tag by gender if we have it (treat as single for ranking)
    if (gender === 'female') return 'singleWoman';
    if (gender === 'male') return 'singleMan';
    return 'unknown';
  }

  function categoryTag(cat) {
    return TAGS[cat] || TAGS.unknown;
  }

  function categoryLabel(cat) {
    return (
      {
        couple: 'Couple / married',
        singleWoman: 'Single woman',
        singleMan: 'Single man',
        unknown: 'Needs review'
      }[cat] || cat
    );
  }

  function enrichContact(contact) {
    const g = guessGender(contact);
    const h = inferHousehold(contact);
    const category = priorityCategory(h.household, g.gender);
    const tags = uniqueTags([
      ...(contact.tags || []),
      ...(contact.priorityTags || []),
      categoryTag(category)
    ]).filter((t) => !String(t).startsWith('call-priority-') || t === categoryTag(category));

    // Ensure only one priority tag
    const cleanedTags = tags.filter((t) => !String(t).startsWith('call-priority-'));
    cleanedTags.push(categoryTag(category));

    const score = scoreContact({
      ...contact,
      gender: contact.gender || g.gender,
      household: contact.household || h.household,
      priorityCategory: category
    });

    return {
      ...contact,
      gender: contact.gender || (g.confidence === 'manual' ? g.gender : g.gender),
      genderGuess: g.gender,
      genderConfidence: g.confidence,
      household: contact.household || h.household,
      householdConfidence: h.confidence,
      priorityCategory: category,
      priorityLabel: categoryLabel(category),
      priorityTag: categoryTag(category),
      priorityTags: [categoryTag(category)],
      tags: cleanedTags,
      callScore: score.total,
      callScoreBreakdown: score.breakdown,
      enrichedAt: new Date().toISOString()
    };
  }

  function scoreContact(contact) {
    const cat = contact.priorityCategory || priorityCategory(
      contact.household || inferHousehold(contact).household,
      contact.gender || guessGender(contact).gender
    );
    const breakdown = [];
    let total = BASE[cat] ?? BASE.unknown;
    breakdown.push({ label: categoryLabel(cat) + ' base', pts: total });

    const prefs = contact.preferences || {};
    const pipeline =
      (global.REContacts && global.REContacts.contactPipelineStatus
        ? global.REContacts.contactPipelineStatus(contact)
        : contact.status) || '';

    if (pipeline === 'seated' || prefs.seatLabel || (prefs.seats && prefs.seats.length)) {
      total += 15;
      breakdown.push({ label: 'Has seat reserved', pts: 15 });
    } else if (pipeline === 'registered' || prefs.preferencesSummary) {
      total += 10;
      breakdown.push({ label: 'Preferences in', pts: 10 });
    } else if (pipeline === 'invited') {
      total += 4;
      breakdown.push({ label: 'Invited / registered interest', pts: 4 });
    }

    if (normalizePhoneLocal(contact.phone).length >= 10) {
      total += 10;
      breakdown.push({ label: 'Has phone (callable)', pts: 10 });
    }
    if (normalizeEmailLocal(contact.email)) {
      total += 5;
      breakdown.push({ label: 'Has email', pts: 5 });
    }

    const drink = String(prefs.drinkCat || prefs.drink || prefs.preferencesSummary || '').toLowerCase();
    if (/adult|alcohol|wine|beer|cocktail|yes — adult/.test(drink)) {
      total += 5;
      breakdown.push({ label: 'Adult drink interest', pts: 5 });
    }

    if (prefs.joinedPartner || contact.joinedPartner) {
      total += 5;
      breakdown.push({ label: 'Partner linked', pts: 5 });
    }

    // Manual priority bump
    if (contact.priorityBoost) {
      const b = Number(contact.priorityBoost) || 0;
      total += b;
      breakdown.push({ label: 'Manual boost', pts: b });
    }

    return { total, breakdown, category: cat };
  }

  function normalizePhoneLocal(p) {
    return String(p || '').replace(/\D/g, '');
  }
  function normalizeEmailLocal(e) {
    return String(e || '').trim().toLowerCase();
  }
  function uniqueTags(arr) {
    return [...new Set((arr || []).filter(Boolean))];
  }

  /** Sort contacts for call order (highest score first). */
  function sortByCallPriority(list) {
    return (list || [])
      .map((c) => enrichContact(c))
      .sort((a, b) => {
        if ((b.callScore || 0) !== (a.callScore || 0)) return (b.callScore || 0) - (a.callScore || 0);
        // tie-break: couples, then single women, then men
        const order = { couple: 0, singleWoman: 1, unknown: 2, singleMan: 3 };
        const ao = order[a.priorityCategory] ?? 9;
        const bo = order[b.priorityCategory] ?? 9;
        if (ao !== bo) return ao - bo;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }

  /**
   * Persist enrichment onto manual contacts so tags stick across refresh.
   */
  function applyEnrichmentToDirectory(contacts) {
    if (!global.REContacts?.upsertManualContact) {
      return (contacts || []).map(enrichContact);
    }
    return (contacts || []).map((c) => {
      const en = enrichContact(c);
      // Write tags/score back (merge into manual store)
      try {
        global.REContacts.upsertManualContact({
          id: c.id?.startsWith('c_') ? c.id : undefined,
          firstName: en.firstName,
          lastName: en.lastName,
          name: en.name,
          email: en.email,
          phone: en.phone,
          locationSlug: en.locationSlug,
          locationName: en.locationName,
          status: en.status,
          sources: en.sources,
          preferences: en.preferences,
          notes: en.notes,
          gender: en.genderConfidence === 'manual' ? en.gender : en.gender,
          household: en.householdConfidence === 'manual' ? en.household : en.household,
          priorityCategory: en.priorityCategory,
          priorityTag: en.priorityTag,
          priorityTags: en.priorityTags,
          tags: en.tags,
          callScore: en.callScore,
          callScoreBreakdown: en.callScoreBreakdown,
          enrichedAt: en.enrichedAt
        });
      } catch (e) {
        console.warn('[RE] enrich persist', e);
      }
      return en;
    });
  }

  global.REContactScore = {
    TAGS,
    BASE,
    enrichContact,
    scoreContact,
    sortByCallPriority,
    applyEnrichmentToDirectory,
    guessGender,
    inferHousehold,
    categoryLabel,
    categoryTag
  };
})(typeof window !== 'undefined' ? window : globalThis);
