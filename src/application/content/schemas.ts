import { z } from "zod";

export const settingsContentSchema = z.object({
  weddingDateIso: z.string().min(1).default("2027-06-19T16:00:00-03:00"),
  weddingLocationLabel: z.string().min(1).default("Minas Gerais, Brasil"),
});
export type SettingsContent = z.output<typeof settingsContentSchema>;

export const homeHeroContentSchema = z.object({
  eyebrow: z.string().min(1).default("Estamos nos casando"),
  tagline: z.string().min(1).default("nas ditas linhas em que nos encontramos"),
  photos: z.array(z.string().min(1)).max(5).default([]),
});
export type HomeHeroContent = z.output<typeof homeHeroContentSchema>;

export const galleryMediaItemSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["photo", "video"]),
});
export type GalleryMediaItem = z.output<typeof galleryMediaItemSchema>;

export const homeGalleryContentSchema = z.object({
  items: z.array(galleryMediaItemSchema).max(20).default([]),
});
export type HomeGalleryContent = z.output<typeof homeGalleryContentSchema>;

const topicEntrySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  photo: z.string().min(1).nullable().default(null),
  address: z.string().min(1).nullable().default(null),
});
export type TopicEntry = z.output<typeof topicEntrySchema>;

export const homeTopicsContentSchema = z.object({
  cerimonia: topicEntrySchema.default({
    title: "Cerimônia",
    description: "Horário, local e tudo sobre a celebração.",
    photo: null,
    address: null,
  }),
  presentes: topicEntrySchema.default({
    title: "Lista de presentes",
    description: "Ajude a construir o começo da nossa nova casa.",
    photo: null,
    address: null,
  }),
  traje: topicEntrySchema.default({
    title: "Traje",
    description: "Código de vestimenta para o grande dia.",
    photo: null,
    address: null,
  }),
  hospedagem: topicEntrySchema.default({
    title: "Hospedagem",
    description: "Sugestões de hotéis e pousadas próximas.",
    photo: null,
    address: null,
  }),
  nossaHistoria: topicEntrySchema.default({
    title: "Nossa história",
    description: "Como tudo começou até chegarmos aqui.",
    photo: null,
    address: null,
  }),
});
export type HomeTopicsContent = z.output<typeof homeTopicsContentSchema>;

export const tipsCerimoniaContentSchema = z.object({
  eyebrow: z.string().min(1).nullable().default("O grande dia"),
  title: z.string().min(1).default("Local e horário"),
  body: z
    .string()
    .min(1)
    .default(
      "A cerimônia acontecerá às **16h**, seguida da recepção no mesmo local. Chegue com 30 minutos de antecedência para aproveitar cada instante.\n\n*Endereço a confirmar.*"
    ),
  photo: z.string().min(1).nullable().default(null),
});
export type TipsContent = z.output<typeof tipsCerimoniaContentSchema>;

export const tipsTrajeContentSchema = z.object({
  eyebrow: z.string().min(1).nullable().default("Como se vestir"),
  title: z.string().min(1).default("Traje esporte fino"),
  body: z
    .string()
    .min(1)
    .default(
      "Pedimos que evitem branco e tons muito claros, para não competir com o vestido da noiva. Tons terrosos, pastéis e clássicos são muito bem-vindos.\n\nA festa acontece em ambiente misto (aberto e fechado) — leve um casaco leve para a noite."
    ),
  photo: z.string().min(1).nullable().default(null),
});

export const tipsHospedagemContentSchema = z.object({
  eyebrow: z.string().min(1).nullable().default("Fique por perto"),
  title: z.string().min(1).default("Onde se hospedar"),
  body: z
    .string()
    .min(1)
    .default(
      "Separamos algumas sugestões de hotéis e pousadas próximas ao local da cerimônia, com conforto para todos os orçamentos.\n\n*Lista de hospedagens a confirmar.*"
    ),
  photo: z.string().min(1).nullable().default(null),
});

export const SITE_CONTENT_SLUGS = [
  "settings",
  "home-hero",
  "home-gallery",
  "home-topics",
  "tips-cerimonia",
  "tips-traje",
  "tips-hospedagem",
] as const;
export type SiteContentSlug = (typeof SITE_CONTENT_SLUGS)[number];

export const SITE_CONTENT_SCHEMAS = {
  settings: settingsContentSchema,
  "home-hero": homeHeroContentSchema,
  "home-gallery": homeGalleryContentSchema,
  "home-topics": homeTopicsContentSchema,
  "tips-cerimonia": tipsCerimoniaContentSchema,
  "tips-traje": tipsTrajeContentSchema,
  "tips-hospedagem": tipsHospedagemContentSchema,
} satisfies Record<SiteContentSlug, z.ZodTypeAny>;
