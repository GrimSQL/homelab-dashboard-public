import { getHomelab } from "@/lib/data/homelab";
import { TailscalePage } from "@/components/pages/Tailscale";

export default async function Page() {
  const data = await getHomelab();
  return <TailscalePage data={data} />;
}
