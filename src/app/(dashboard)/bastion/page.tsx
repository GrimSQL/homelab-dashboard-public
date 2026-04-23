import { getHomelab } from "@/lib/data/homelab";
import { BastionPage } from "@/components/pages/Bastion";

export default async function Page() {
  const data = await getHomelab();
  return <BastionPage data={data} />;
}
