import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getAuthUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error) {
    console.error("[DEBUG getAuthUser] getUser() error:", error.name, error.message, error.status);
  }
  return user;
});

export const getCurrentProfile = cache(async (userId: string) => {
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return profile;
});