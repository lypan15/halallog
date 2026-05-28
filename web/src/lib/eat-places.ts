export type DietTag = "Halal" | "Vegetarian" | "Pescatarian" | "Vegan";

export type EatPlace = {
  id: string;
  name: string;
  distance: string;
  category: "Halal" | "General";
  area: string;
  rating: number;
  description: string;
  dietTags: DietTag[];
};

export const EAT_PLACES: EatPlace[] = [
  {
    id: "salam-bistro",
    name: "Salam Bistro",
    distance: "450m",
    category: "Halal",
    area: "Myeongdong",
    rating: 4.8,
    description: "Certified halal Korean fusion with prayer room nearby.",
    dietTags: ["Halal"],
  },
  {
    id: "green-minaret",
    name: "Green Minaret Kitchen",
    distance: "900m",
    category: "Halal",
    area: "Itaewon",
    rating: 4.6,
    description: "Family-friendly menu and late-night service.",
    dietTags: ["Halal"],
  },
  {
    id: "city-garden-cafe",
    name: "City Garden Cafe",
    distance: "1.2km",
    category: "General",
    area: "Hongdae",
    rating: 4.2,
    description: "Vegetarian-heavy menu with halal-friendly options.",
    dietTags: ["Vegetarian"],
  },
  {
    id: "ocean-table",
    name: "Ocean Table",
    distance: "1.5km",
    category: "General",
    area: "Yongsan",
    rating: 4.3,
    description: "Fresh seafood and pescatarian-friendly dishes.",
    dietTags: ["Pescatarian"],
  },
  {
    id: "green-roots",
    name: "Green Roots",
    distance: "2.0km",
    category: "General",
    area: "Mapo",
    rating: 4.5,
    description: "100% plant-based menu, fully vegan.",
    dietTags: ["Vegan", "Vegetarian"],
  },
];
