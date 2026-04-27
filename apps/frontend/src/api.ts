import type { AskCitation, Blog, BlogStatus } from "./types";

interface BlogPayload {
  name: string;
  title: string;
  tags: string[];
  contentHtml: string;
  status: BlogStatus;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const hasBody = init?.body !== undefined && init?.body !== null;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    headers,
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ? JSON.stringify(body.message) : "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchBlogs() {
  return request<{ blogs: Blog[] }>("/blogs");
}

export async function createBlog(payload: BlogPayload) {
  return request<{ blog: Blog }>("/blogs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBlog(id: string, payload: BlogPayload) {
  return request<{ blog: Blog }>(`/blogs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function removeBlog(id: string) {
  return request<void>(`/blogs/${id}`, {
    method: "DELETE",
  });
}

export async function askBlogs(question: string, tags: string[]) {
  return request<{ answer: string; citations: AskCitation[] }>("/ask", {
    method: "POST",
    body: JSON.stringify({ question, tags }),
  });
}
