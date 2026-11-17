from app.schemas import CvExperience, GeneratedCv, Profile, Skill
from app.services.cv import file_name, verify_cv

PROFILE = Profile(
    full_name="Inès Exemple",
    cv_text="Product Owner chez Orange depuis 2018. Certification PSPO I. Master de géosciences, Université de Lyon.",
    skills=[Skill(domain="produit", name="Gestion du backlog", level=4)],
)


def test_invented_experience_and_skill_are_removed():
    cv = GeneratedCv(
        full_name="Inès Exemple", headline="Product Owner", summary="...",
        skills=["Gestion du backlog", "Kubernetes"],
        experiences=[
            CvExperience(title="Product Owner", company="Orange", start="01/2018", end="Aujourd'hui", bullets=["..."]),
            CvExperience(title="CTO", company="Google", start="01/2015", end="12/2017", bullets=["..."]),
        ],
        certifications=["PSPO I", "PMP"],
    )
    clean, removed = verify_cv(cv, PROFILE)
    assert [e.company for e in clean.experiences] == ["Orange"]
    assert clean.skills == ["Gestion du backlog"]
    assert clean.certifications == ["PSPO I"]
    assert len(removed) == 3


def test_file_name_is_ats_friendly():
    assert file_name("Inès Exemple", "Banque Horizon", "PO Data") == "CV_Ines_Exemple_Banque_Horizon_Po_Data.docx"
