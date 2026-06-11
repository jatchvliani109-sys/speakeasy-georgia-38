// Helpers for the Document Helper section.
import { supabase } from "@/integrations/supabase/client";
import { Mail, FileText, FileCheck, User, Wrench, type LucideIcon } from "lucide-react";
import type { BusinessState } from "./state";

export type DocType = "email" | "cover_letter" | "resume_improve" | "bio" | "email_fix";

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  email: "პროფესიული იმეილი",
  cover_letter: "სამოტივაციო წერილი",
  resume_improve: "რეზიუმეს გაუმჯობესება",
  bio: "პროფესიული ბიო",
  email_fix: "გასწორებული იმეილი",
};

export const DOC_TYPE_ICONS: Record<DocType, LucideIcon> = {
  email: Mail,
  cover_letter: FileText,
  resume_improve: FileCheck,
  bio: User,
  email_fix: Wrench,
};

export type Highlight = { phrase: string; whyKa: string };

export type BusinessDocument = {
  id: string;
  doc_type: DocType;
  title: string;
  content: string;
  meta: Record<string, any>;
  inputs: Record<string, any>;
  highlights: Highlight[];
  created_at: string;
  updated_at: string;
};

export type DocsProfile = {
  fullName?: string;
  jobTitle?: string;
  industry?: string;
  skills?: string[];
  yearsOfExperience?: string;
  education?: string;
  rawResumeText?: string;
  level?: string;
  fields?: string[];
  goals?: string[];
};

export async function loadDocsProfile(userId: string, state: BusinessState | null): Promise<DocsProfile> {
  const { data } = await supabase
    .from("business_resumes")
    .select("full_name, job_title, industry, skills, years_of_experience, education, raw_text")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const skills = Array.isArray(data?.skills) ? (data?.skills as any[]).map(String) : [];
  return {
    fullName: data?.full_name || undefined,
    jobTitle: data?.job_title || undefined,
    industry: data?.industry || undefined,
    skills,
    yearsOfExperience: data?.years_of_experience || undefined,
    education: data?.education || undefined,
    rawResumeText: data?.raw_text || undefined,
    level: state?.level || state?.plan?.level || undefined,
    fields: state?.field || state?.plan?.fields || [],
    goals: state?.mainPriority || state?.plan?.mainGoals || [],
  };
}

export async function hasResume(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("business_resumes")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return !!data?.id;
}

export async function callDocs(body: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("business-docs", { body });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export async function saveDocument(
  userId: string,
  doc: {
    doc_type: DocType;
    title: string;
    content: string;
    meta?: Record<string, any>;
    inputs?: Record<string, any>;
    highlights?: Highlight[];
  },
): Promise<BusinessDocument> {
  const { data, error } = await supabase
    .from("business_documents")
    .insert({
      user_id: userId,
      doc_type: doc.doc_type,
      title: doc.title,
      content: doc.content,
      meta: doc.meta || {},
      inputs: doc.inputs || {},
      highlights: (doc.highlights || []) as any,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BusinessDocument;
}

export async function updateDocument(id: string, patch: Partial<BusinessDocument>) {
  const { error } = await supabase
    .from("business_documents")
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.meta !== undefined ? { meta: patch.meta as any } : {}),
      ...(patch.highlights !== undefined ? { highlights: patch.highlights as any } : {}),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDocument(id: string) {
  await supabase.from("business_documents").delete().eq("id", id);
}

export async function listDocuments(userId: string): Promise<BusinessDocument[]> {
  const { data, error } = await supabase
    .from("business_documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as BusinessDocument[];
}

export async function getDocument(id: string): Promise<BusinessDocument | null> {
  const { data } = await supabase
    .from("business_documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as BusinessDocument) || null;
}

export function highlightText(content: string, highlights: Highlight[]): string {
  // Returns HTML string with <mark> wrapping highlighted phrases.
  if (!highlights?.length) return escapeHtml(content);
  let html = escapeHtml(content);
  highlights.forEach((h, idx) => {
    if (!h.phrase) return;
    const safe = escapeHtml(h.phrase);
    const re = new RegExp(safe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    html = html.replace(
      re,
      `<mark class="bg-[#FCEEF1] text-[#6B1E3E] rounded px-0.5 cursor-help" title="${escapeHtml(h.whyKa)}" data-hl="${idx}">${safe}</mark>`,
    );
  });
  return html.replace(/\n/g, "<br/>");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
