import { SplitPanel } from "@/components/ui/SplitPanel";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

export default function DressCodePage() {
  return (
    <SplitPanel
      eyebrow="Como se vestir"
      title="Traje esporte fino"
      tone="light"
      imageSide="left"
      image={<PlaceholderImage label="Inspiração de traje" className="absolute inset-0 h-full w-full" />}
    >
      <p>
        Pedimos que evitem branco e tons muito claros, para não competir com o vestido da noiva.
        Tons terrosos, pastéis e clássicos são muito bem-vindos.
      </p>
      <p className="mt-3">
        A festa acontece em ambiente misto (aberto e fechado) — leve um casaco leve para a noite.
      </p>
    </SplitPanel>
  );
}
