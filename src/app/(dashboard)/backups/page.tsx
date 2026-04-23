import { getHomelab } from "@/lib/data/homelab";
import { BackupsPage } from "@/components/pages/Backups";

export default async function Page() {
  const data = await getHomelab();
  return <BackupsPage data={data} />;
}
