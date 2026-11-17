export type OfferStatus = "analyse" | "nomatch" | "todo" | "progress" | "ok" | "ko";

export interface Skill {
  id: string;
  domain: string;
  name: string;
  level: 1 | 2 | 3 | 4;
}

export interface Profile {
  id: string;
  full_name: string | null;
  target_title: string | null;
  location: string | null;
  contract: string | null;
  cv_text: string | null;
  cv_file_name: string | null;
}

export interface Match {
  score: number;
  verdict: "match" | "study" | "nomatch";
  covered: string[];
  partial: string[];
  missing: string[];
}

export interface Offer {
  id: string;
  title: string;
  company: string;
  location: string;
  contract: string;
  url: string | null;
  score: number | null;
  summary: string | null;
  match: Match | null;
  status: OfferStatus;
  applied_at: string | null;
  channel: string | null;
  notes: string | null;
  outcome_date: string | null;
  outcome_stage: string | null;
  outcome_reason: string | null;
  outcome_comment: string | null;
  start_date: string | null;
  created_at: string;
}

export type MilestoneType =
  | "entretien_rh" | "entretien_manager" | "test_technique" | "cas_pratique" | "entretien_final" | "proposition" | "autre";

export interface Milestone {
  id: string;
  offer_id: string;
  type: MilestoneType;
  starts_at: string;
  mode: "visio" | "presentiel" | "telephone" | null;
  contact_name: string | null;
  contact_role: string | null;
  location_or_link: string | null;
  prep_notes: string | null;
  offers?: Pick<Offer, "title" | "company">;
}

export interface Referential {
  levels: string[];
  domains: { id: string; name: string; skills: string[] }[];
}
