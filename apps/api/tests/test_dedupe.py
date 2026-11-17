from app.services.dedupe import NEAR_DUPLICATE, similarity, text_hash, url_key

OFFER = ("Nous recherchons un Product Owner confirmé pour rejoindre notre équipe produit. "
         "Vous animerez les ateliers, rédigerez les user stories et prioriserez le backlog avec les parties prenantes. "
         "Expérience de cinq ans en environnement agile Scrum, maîtrise de Jira et Confluence.")


def test_url_key_ignores_tracking_and_www():
    a = url_key("https://www.welcometothejungle.com/fr/jobs/po-data?utm_source=linkedin&ref=abc")
    b = url_key("http://welcometothejungle.com/fr/jobs/po-data/")
    assert a == b


def test_text_hash_ignores_case_and_accents():
    assert text_hash(OFFER) == text_hash(OFFER.upper().replace("é", "e"))


def test_republished_offer_is_near_duplicate():
    edited = OFFER.replace("cinq ans", "5 ans")
    assert similarity(OFFER, edited) >= NEAR_DUPLICATE


def test_different_offer_is_not_duplicate():
    other = "Chef de chantier BTP, lecture de plans, sécurité chantier, encadrement des équipes, AutoCAD."
    assert similarity(OFFER, other) < 0.2
