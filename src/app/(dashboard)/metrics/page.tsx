import { getHomelab } from "@/lib/data/homelab";
import { MetricsPage } from "@/components/pages/Metrics";

export default async function Page() {
  const data = await getHomelab();
  return <MetricsPage data={data} />;
}
