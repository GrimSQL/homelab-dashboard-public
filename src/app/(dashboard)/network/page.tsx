import { getHomelab } from "@/lib/data/homelab";
import { NetworkPage } from "@/components/pages/Network";

export default async function Page() {
  const data = await getHomelab();
  return <NetworkPage data={data} />;
}
