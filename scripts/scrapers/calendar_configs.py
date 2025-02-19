"""Calendar configurations for various sources"""


ICS_CALENDARS = {
    "nyc_gatherings": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-cnuVqBPxDjDZGcF",
        "community_id": "com_nyc_gatherings"
    },
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
    "olios": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-zfvU7AwJN56Zedx",
        "community_id": "com_olios"
    },
    "walk_club": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-nIXe5Toh3KsgZWg",
        "community_id": "com_walk_club"
    },
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
    "reforester": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-p6wrlIz7NXddCxz",
        "community_id": "com_reforester"
    },
    "genZtea": {
        "id": "http://api.lu.ma/ics/get?entity=calendar&id=cal-6kEfZKtXphCXCQD",
        "community_id": "com_genZtea"
    }
}

SCRAPERS = [
    'met_museum_scraper',
    'moma_events_scraper',
    'nycgov_scraper',
    'nycparks_scraper',
    'pioneer_works_scraper',
    'reccreate_scraper',
    'garys_guide_scraper',
    'yu_and_me_scraper',
    'wonderville_scraper',
    'call_to_gather_scraper',
    'fiftyseven_scraper',
    'interference_scraper',
    'newwomenspace_scraper',
    'substack_scraper'
] 