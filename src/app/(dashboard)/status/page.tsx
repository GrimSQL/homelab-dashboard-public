import { getHomelab } from "@/lib/data/homelab";
import { StatusPage } from "@/components/pages/Status";

export default async function Page() {
  const data = await getHomelab();
  return <StatusPage data={data} />;
}
