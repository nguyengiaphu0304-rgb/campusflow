import type { DegreeProgram } from "../domain/degree";

export const demoProgram: DegreeProgram = {
  id: "illustrative-cs-pathway",
  name: "Illustrative CS pathway",
  disclaimer:
    "Illustrative progress model only. It is not an official University of Toronto program requirement or academic audit.",
  groups: [
    {
      id: "programming-foundation",
      label: "Programming foundation",
      description: "Complete the paired foundation sequence or the alternate course.",
      rule: {
        type: "any",
        rules: [
          {
            type: "all",
            rules: [
              { type: "course", code: "CSC110Y1" },
              { type: "course", code: "CSC111H1" },
            ],
          },
          { type: "course", code: "CSC148H1" },
        ],
      },
    },
    {
      id: "theory-software",
      label: "Theory and software core",
      description: "Plan 1.5 credits from the illustrative upper-year core.",
      rule: {
        type: "credits",
        minimum: 1.5,
        selector: { type: "codes", codes: ["CSC207H1", "CSC236H1", "CSC263H1"] },
      },
    },
    {
      id: "quantitative-breadth",
      label: "Quantitative breadth",
      description: "Plan 2.0 credits labeled Mathematics or Statistics in this fixture.",
      rule: {
        type: "credits",
        minimum: 2,
        selector: { type: "breadths", breadths: ["Mathematics", "Statistics"] },
      },
    },
  ],
};
