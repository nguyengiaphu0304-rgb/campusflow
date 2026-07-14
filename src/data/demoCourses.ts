import { all, any, course, type Course } from "../domain/course";
import type { AcademicTerm } from "../domain/plan";

// Illustrative data only. It is deliberately small and must not be treated as
// the official University of Toronto Academic Calendar.
export const demoCourses: Course[] = [
  {
    code: "CSC110Y1",
    title: "Foundations of Computer Science I",
    description: "Programming, data modelling, and computational problem solving.",
    credits: 1,
    breadth: "CS foundations",
  },
  {
    code: "CSC111H1",
    title: "Foundations of Computer Science II",
    description: "Abstract data types, software design, and algorithmic analysis.",
    credits: 0.5,
    breadth: "CS foundations",
    prerequisites: course("CSC110Y1"),
  },
  {
    code: "CSC148H1",
    title: "Introduction to Computer Science",
    description: "Object-oriented design, recursion, and data structures.",
    credits: 0.5,
    breadth: "CS foundations",
  },
  {
    code: "CSC165H1",
    title: "Mathematical Expression and Reasoning",
    description: "Proofs, asymptotic analysis, and mathematical reasoning for CS.",
    credits: 0.5,
    breadth: "Theory",
  },
  {
    code: "CSC207H1",
    title: "Software Design",
    description: "Team software development, architecture, testing, and maintainability.",
    credits: 0.5,
    breadth: "Software",
    prerequisites: any(course("CSC111H1"), course("CSC148H1")),
  },
  {
    code: "CSC236H1",
    title: "Introduction to the Theory of Computation",
    description: "Induction, correctness, recurrence relations, and formal languages.",
    credits: 0.5,
    breadth: "Theory",
    prerequisites: any(course("CSC111H1"), course("CSC165H1")),
  },
  {
    code: "CSC263H1",
    title: "Data Structures and Analysis",
    description: "Design and analysis of efficient data structures and algorithms.",
    credits: 0.5,
    breadth: "Algorithms",
    prerequisites: all(course("CSC207H1"), course("CSC236H1")),
  },
  {
    code: "MAT148H1",
    title: "Calculus I with Proofs",
    description: "Limits, continuity, differentiation, and proof-based calculus.",
    credits: 0.5,
    breadth: "Mathematics",
  },
  {
    code: "MAT149H1",
    title: "Calculus II with Proofs",
    description: "A continuation of proof-based single-variable calculus.",
    credits: 0.5,
    breadth: "Mathematics",
    prerequisites: course("MAT148H1"),
  },
  {
    code: "MAT223H1",
    title: "Linear Algebra I",
    description: "Systems, vector spaces, linear maps, and eigenvalues.",
    credits: 0.5,
    breadth: "Mathematics",
  },
  {
    code: "STA130H1",
    title: "An Introduction to Statistical Reasoning and Data Science",
    description: "Data exploration, uncertainty, and reproducible statistical analysis.",
    credits: 0.5,
    breadth: "Statistics",
  },
];

export const demoTerms: AcademicTerm[] = [
  {
    id: "fall-1",
    label: "Year 1 · Fall",
    courses: ["CSC110Y1", "MAT148H1", "STA130H1"],
  },
  {
    id: "winter-1",
    label: "Year 1 · Winter",
    courses: ["CSC111H1", "MAT149H1", "MAT223H1"],
  },
  {
    id: "fall-2",
    label: "Year 2 · Fall",
    courses: ["CSC207H1", "CSC236H1"],
  },
  {
    id: "winter-2",
    label: "Year 2 · Winter",
    courses: ["CSC263H1"],
  },
];
