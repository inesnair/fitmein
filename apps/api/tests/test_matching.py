from app.schemas import OfferAnalysis, Requirement
from app.services.matching import compute_match


def req(label, importance, status):
    return Requirement(label=label, importance=importance, status=status)


def analysis(reqs, fit=1.0):
    return OfferAnalysis(title="PO", requirements=reqs, context_fit=fit, summary="")


def test_full_coverage_is_100():
    m = compute_match(analysis([req("Scrum", "must", "covered"), req("SQL", "nice", "covered")]))
    assert m.score == 100 and m.verdict == "match"


def test_missing_must_have_weighs_heavily():
    m = compute_match(analysis([req("Java", "must", "missing"), req("Scrum", "must", "covered"),
                                req("SQL", "nice", "covered")]))
    # must: (0 + 1)/2 - 0.10 = 0.40 -> 24 ; nice 20 ; context 20
    assert m.score == 64 and m.verdict == "study"
    assert m.missing == ["Java"]


def test_partial_counts_half():
    m = compute_match(analysis([req("Angular", "must", "partial")], fit=0.0))
    assert m.score == 50  # 60*0.5 + 20 (pas d'exigence souhaitée) + 0


def test_nomatch_below_threshold():
    m = compute_match(analysis([req("BTP", "must", "missing"), req("AutoCAD", "must", "missing")], fit=0.2))
    assert m.verdict == "nomatch"
