import { getHomelab } from "@/lib/data/homelab";
import { OverviewPage } from "@/components/pages/Overview";

export default async function Page() {
  const data = await getHomelab();
  return <OverviewPage data={data} />;
}
