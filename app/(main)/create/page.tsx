import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/session";
import { CreatePost } from "@/components/post/CreatePost";

export default async function CreatePostPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("sort_order");

  return <CreatePost categories={categories ?? []} />;
}
