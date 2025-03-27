"""Calendar configurations for various sources"""

# Add a comment at the top explaining API key requirements
"""
For Google Calendar API to work properly:
1. Create a Google API key at https://console.cloud.google.com/
2. Enable the Google Calendar API for the project
3. Add the key to GitHub Secrets as GOOGLE_API_KEY or in .env.local file
4. Make sure your API key doesn't have API restrictions that block calendar.v3.Events.List

If you're seeing "Requests to this API calendar method calendar.v3.Events.List are blocked":
- Check that Calendar API is enabled in Google Cloud Console
- Remove any API restrictions or add Calendar API to allowed APIs
- Try deactivating and reactivating the Calendar API
"""

#TODO: Cozy Sundays nbqghatsg76q5hvuncn0eidonebg6pmj@import.calendar.google.com, https://lu.ma/cozy-sundays
# ICS Calendar configurations 
ICS_CALENDARS = {
    # "nyc_gatherings": {
    #     "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-cnuVqBPxDjDZGcF",
    #     "community_id": "com_nyc_gatherings"
    # },
    "max_ny": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-KGV5WJNQjhqXGj5",
        "community_id": "com_max_ny"
    },
    "otwc": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-q37ZsEGpns4eio2",
        "community_id": "com_otwc"
    },
    "der_project": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-jnmufRkbO6lEBQH",
        "community_id": "com_der_project"
    },
    # "olios": {
    #     "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-zfvU7AwJN56Zedx",
    #     "community_id": "com_olios"
    # },
    # "walk_club": {
    #     "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-nIXe5Toh3KsgZWg",
    #     "community_id": "com_walk_club"
    # },
    "ny_hardware": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-vR9KDer3a9iEfUd",
        "community_id": "com_ny_hardware"
    },
    "la_creme_stem": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-4oDH9h513BBRk6y",
        "community_id": "com_la_creme_stem"
    },
    "third_place_nyc": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-AIpaP0cRGKS7tcw",
        "community_id": "com_third_place_nyc"
    },
    # "reforester": {
    #     "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-p6wrlIz7NXddCxz",
    #     "community_id": "com_reforester"
    # },
    "genZtea": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-6kEfZKtXphCXCQD",
        "community_id": "com_genZtea"
    },
    "acid_club": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-uMDiLB3ckLaGfkl",
        "community_id": "com_acid_club"
    }
}

# Google Calendar configurations
GOOGLE_CALENDARS = {
    # "shop": {
    #     "id": "c_714ebf50b82d53ce38c86b95bc756c94cc7eacc6d4564ee46e27c99db8884728@group.calendar.google.com",
    #     "community_id": "com_principles"
    # },
    # "woodbine": {
    #     "id": "9c5aaff9d94fab9457557c6ed81534ff828c51de7a76c0c06d15878dee0e42ec@group.calendar.google.com",
    #     "community_id": "com_woodbine",
    # },
    # "explorers_club": {
    #     "id": "crk94q56n8o7fkj12h8880valiieinss@import.calendar.google.com",
    #     "community_id": "com_explorers_club"
    # },
    "effective_altruism_nyc": {
        "id": "hbvetqf5h1pd0of0vn6uvphqts@group.calendar.google.com",
        "community_id": "com_effective_altruism_nyc"
    },
    "fractal":{
        "id": "t3v2rsoufffl206jh102tva3jeekfgme@import.calendar.google.com",
        "community_id": "com_fractal"
    },
    "telos": {
        "id": "d596c2bf721183d22bb50bde6625090fc3923aa29a6918d78409e168da791769@group.calendar.google.com",
        "community_id": "com_telos"
    },
    "nyc_resistor": {
        "id": "p2m2av9dhrh4n1ub7jlsc68s7o@group.calendar.google.com",
        "community_id": "com_nyc_resistor"
    },
    # "empire_skate": {
    #     "id": "i446n1u4c38ptol8a1v96foqug@group.calendar.google.com",
    #     "community_id": "com_empire_skate"
    # },
    # "climate_cafe": {
    #     "id": "1290diunt6bv9u92h532r0g9ro4j8g0s@import.calendar.google.com",
    #     "community_id": "com_climate_cafe"
    # },
    # "reading_rhythms_manhattan": {
    #     "id": "ilotg4jh39u6ie4fhifbsi2i0nkse67@import.calendar.google.com",
    #     "community_id": "com_reading_rhythms"
    # },
    # "nyc_backgammon": {
    #     "id": "iidj8joom64a6vm36cd6nqce55i0lko5@import.calendar.google.com",
    #     "community_id": "com_nyc_backgammon"
    # },
    "south_park_commons": {
        "id": "bfptu3ajdae5cc2k16cvs1amenbft762@import.calendar.google.com",
        "community_id": "com_south_park_commons"
    },
    "verci": {
        "id": "pf6o7drlfrbhmpqlmlt7p215e70i9cjn@import.calendar.google.com",
        "community_id": "com_verci"
    },
    "sidequest": {
        "id": "abln66abl799vb4gprllu4225l744l70@import.calendar.google.com",
        "community_id": "com_sidequest"
    }
}

# List of available scrapers
SCRAPERS = [
    'pioneer_works_scraper',
    'garys_guide_scraper',
    'interference_scraper',
    'google_calendar_scraper',
    'ics_calendar_scraper',
    'index_space_scraper',
    'fabrik_scraper',
    #'substack_scraper',
    #'nyc_parks_scraper'
] 