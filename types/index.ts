export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface Book {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  isPublic: boolean;
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
  author: User;
  chapters: Chapter[];
  collaborators: Collaborator[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  status: "draft" | "review" | "published";
  version: number;
  createdAt: string;
  updatedAt: string;
  author: User;
  reviews: Review[];
  versions: ChapterVersion[];
}

export interface ChapterVersion {
  id: string;
  version: number;
  content: string;
  createdAt: string;
}

export interface Review {
  id: string;
  status: "pending" | "approved" | "changes_requested";
  comment: string | null;
  lineComments: string | null;
  createdAt: string;
  updatedAt: string;
  reviewer: User;
}

export interface Collaborator {
  id: string;
  role: "owner" | "editor" | "reviewer";
  user: User;
}
