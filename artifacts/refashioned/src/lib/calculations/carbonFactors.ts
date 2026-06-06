export type MaterialFactor = {
  label: string;
  factor: number;
  note: string;
};

export const MATERIAL_FACTORS: Record<string, MaterialFactor> = {
  organic_cotton:      { label: "Organic Cotton",      factor: 2.3,  note: "Rain-fed, no synthetic pesticides"   },
  conventional_cotton: { label: "Conventional Cotton", factor: 4.0,  note: "Irrigated, fertiliser-intensive"     },
  recycled_polyester:  { label: "Recycled Polyester",  factor: 2.0,  note: "Post-consumer rPET bottles"          },
  virgin_polyester:    { label: "Virgin Polyester",    factor: 5.5,  note: "Petrochemical feedstock"             },
  nylon:               { label: "Nylon 6 / 6,6",       factor: 7.0,  note: "Energy-intensive synthesis"          },
  wool:                { label: "Wool (standard)",     factor: 15.0, note: "Includes methane from sheep"         },
  wool_certified:      { label: "Wool (ZQ Certified)", factor: 9.5,  note: "Regenerative grazing practices"      },
  linen:               { label: "Linen / Flax",        factor: 1.7,  note: "Low-input, rain-fed crop"            },
  tencel:              { label: "Tencel (Lyocell)",    factor: 1.9,  note: "Closed-loop solvent process"         },
  hemp:                { label: "Hemp",                factor: 1.5,  note: "Carbon-sequestering crop"            },
  silk:                { label: "Silk",                factor: 15.3, note: "Sericulture & degumming"             },
  cashmere:            { label: "Cashmere",            factor: 28.0, note: "Very high methane + land use"        },
};
