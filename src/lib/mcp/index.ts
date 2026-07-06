import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get_profile";
import listVocabulary from "./tools/list_vocabulary";
import addVocabularyWord from "./tools/add_vocabulary_word";
import listMistakes from "./tools/list_mistakes";
import getBusinessProgress from "./tools/get_business_progress";

// Build issuer from the project ref (Vite inlines VITE_ vars at build time).
// The direct supabase.co host is required — the .lovable.cloud proxy would
// fail issuer discovery.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "speakbusy-mcp",
  title: "SpeakBusy",
  version: "0.1.0",
  instructions:
    "Tools for the SpeakBusy Georgian-to-English business English learning app. Use these to read the signed-in user's profile and progress, browse or add vocabulary, and review recorded mistakes.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listVocabulary, addVocabularyWord, listMistakes, getBusinessProgress],
});
