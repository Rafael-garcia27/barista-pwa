export type MethodId = "aeropress";

export type TasteTag = "sour" | "bitter" | "watery" | "harsh" | "flat";

export type Bean = {
  id: string;
  name: string;
  roaster?: string;
  defaultMethodId: MethodId;
  createdAt: number;
  updatedAt: number;
};

export type BrewLog = {
  id: string;
  beanId: string;
  methodId: MethodId;
  coffeeGrams: number;
  timeSeconds: number;
  rating: 1 | 2 | 3 | 4 | 5;
  tasteTags: TasteTag[];
  createdAt: number;
};

export type Suggestion = {
  diagnosis: string;
  nextChange: string;
  extraTips: string[];
};
