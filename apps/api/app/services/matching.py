"""Score hybride : le LLM qualifie chaque exigence, le calcul du score reste déterministe et testable."""
from ..schemas import MatchResult, OfferAnalysis

W_MUST, W_NICE, W_CONTEXT = 0.60, 0.20, 0.20
STATUS_VALUE = {"covered": 1.0, "partial": 0.5, "missing": 0.0}
MISSING_MUST_PENALTY = 0.10  # chaque exigence obligatoire absente retire 10 points de couverture en plus


def _coverage(values: list[float]) -> float:
    return sum(values) / len(values) if values else 1.0


def compute_match(analysis: OfferAnalysis, match_threshold: int = 70, study_threshold: int = 50) -> MatchResult:
    must = [r for r in analysis.requirements if r.importance == "must"]
    nice = [r for r in analysis.requirements if r.importance == "nice"]

    must_cov = _coverage([STATUS_VALUE[r.status] for r in must])
    missing_must = sum(1 for r in must if r.status == "missing")
    must_cov = max(0.0, must_cov - MISSING_MUST_PENALTY * missing_must)
    nice_cov = _coverage([STATUS_VALUE[r.status] for r in nice])

    raw = W_MUST * must_cov + W_NICE * nice_cov + W_CONTEXT * analysis.context_fit
    score = round(100 * raw)
    verdict = "match" if score >= match_threshold else "study" if score >= study_threshold else "nomatch"

    return MatchResult(
        score=score,
        verdict=verdict,
        covered=[r.label for r in analysis.requirements if r.status == "covered"],
        partial=[r.label for r in analysis.requirements if r.status == "partial"],
        missing=[r.label for r in analysis.requirements if r.status == "missing"],
    )
