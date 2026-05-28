export type EatPlace = {
  id: string;
  name: string;
  distance: string;
  category: "Halal" | "General";
  area: string;
  rating: number;
  description: string;
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
  },
  {
    id: "green-minaret",
    name: "Green Minaret Kitchen",
    distance: "900m",
    category: "Halal",
    area: "Itaewon",
    rating: 4.6,
    description: "Family-friendly menu and late-night service.",
  },
  {
    id: "city-garden-cafe",
    name: "City Garden Cafe",
    distance: "1.2km",
    category: "General",
    area: "Hongdae",
    rating: 4.2,
    description: "Vegetarian-heavy menu with halal-friendly options.",
  },
];
