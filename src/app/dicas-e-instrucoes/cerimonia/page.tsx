import { SplitPanel } from "@/components/ui/SplitPanel";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";

export default function CeremonyPage() {
  return (
    <SplitPanel
      eyebrow="O grande dia"
      title="Local e horário"
      tone="dark"
      image={<PlaceholderImage label="Local da cerimônia" className="absolute inset-0 h-full w-full" />}
    >
      <p>
        A cerimônia acontecerá às <strong className="text-paper">16h</strong>, seguida da recepção
        no mesmo local. Chegue com 30 minutos de antecedência para aproveitar cada instante.
      </p>
      <p className="mt-3 italic">Endereço a confirmar.</p>
    </SplitPanel>
  );
}
