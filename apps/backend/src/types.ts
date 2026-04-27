export type BlogStatus = "draft" | "published";
export type IndexStatus = "idle" | "pending" | "processing" | "ready" | "failed";

export interface BlogRecord {
  id: string;
  name: string;
  title: string;
  content_html: string;
  content_text: string;
  status: BlogStatus;
  tags: string[];
  index_status: IndexStatus;
  index_error: string | null;
  indexed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogChunk {
  id: string;
  blogId: string;
  chunkIndex: number;
  text: string;
}

export interface AskCitation {
  blogId: string;
  title: string;
  name: string;
  tags: string[];
  snippet: string;
  chunkIndex: number;
  score: number;
}

