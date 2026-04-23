import { getHomelab } from "@/lib/data/homelab";
import { AdGuardPage } from "@/components/pages/AdGuard";

export default async function Page() {
  const data = await getHomelab();
  return <AdGuardPage data={data} />;
}
