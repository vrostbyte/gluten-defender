import { redirect } from "next/navigation";

/**
 * The app opens on the Scan tab — scanning a product is the core "magic moment".
 * Visiting "/" simply forwards to "/scan". (Using "/" as the manifest start_url
 * also means the installed app opens here.)
 */
export default function Home() {
  redirect("/scan");
}
