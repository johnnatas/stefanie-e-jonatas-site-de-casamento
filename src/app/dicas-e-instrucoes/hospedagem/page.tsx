import { SplitPanel } from "@/components/ui/SplitPanel";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

export default function LodgingPage() {
  return (
    <SplitPanel
      eyebrow="Fique por perto"
      title="Onde se hospedar"
      tone="dark"
      image={<PlaceholderImage label="Hospedagem" className="absolute inset-0 h-full w-full" />}
    >
      <p>
        Separamos algumas sugestões de hotéis e pousadas próximas ao local da cerimônia, com
        conforto para todos os orçamentos.
      </p>
      <p className="mt-3 italic">Lista de hospedagens a confirmar.</p>
    </SplitPanel>
  );
}
