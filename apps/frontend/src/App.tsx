import { useEffect, useMemo, useState } from "react";
import { askBlogs, createBlog, fetchBlogs, removeBlog, updateBlog } from "./api";
import { RichTextEditor } from "./components/RichTextEditor";
import type { AskCitation, Blog, BlogStatus } from "./types";

interface BlogFormState {
  id?: string;
  name: string;
  title: string;
  tagsText: string;
  contentHtml: string;
  status: BlogStatus;
}

const emptyForm: BlogFormState = {
  name: "",
  title: "",
  tagsText: "",
  contentHtml: "<p></p>",
  status: "draft",
};

export function App() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<AskCitation[]>([]);

  const availableTags = useMemo(() => {
    return [...new Set(blogs.flatMap((blog) => blog.tags))].sort();
  }, [blogs]);

  async function loadBlogs() {
    setLoading(true);
    try {
      const data = await fetchBlogs();
      setBlogs(data.blogs);
      if (!selectedId && data.blogs[0]) {
        selectBlog(data.blogs[0]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBlogs();
  }, []);

  function selectBlog(blog: Blog) {
    setSelectedId(blog.id);
    setForm({
      id: blog.id,
      name: blog.name,
      title: blog.title,
      tagsText: blog.tags.join(", "),
      contentHtml: blog.content_html || "<p></p>",
      status: blog.status,
    });
  }

  function resetForm() {
    setSelectedId(null);
    setForm(emptyForm);
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        title: form.title.trim(),
        tags: form.tagsText.split(",").map((item) => item.trim()).filter(Boolean),
        contentHtml: form.contentHtml,
        status: form.status,
      };

      const result = form.id
        ? await updateBlog(form.id, payload)
        : await createBlog(payload);

      await loadBlogs();
      selectBlog(result.blog);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save blog");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!form.id) {
      return;
    }

    const confirmed = window.confirm("Delete this blog?");
    if (!confirmed) {
      return;
    }

    try {
      await removeBlog(form.id);
      await loadBlogs();
      resetForm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete blog");
    }
  }

  async function onAsk() {
    setAsking(true);
    setError(null);
    try {
      const result = await askBlogs(question, filterTags);
      setAnswer(result.answer);
      setCitations(result.citations);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : "Failed to ask question");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <p className="eyebrow">Blog RAG</p>
            <h1>Content Admin</h1>
          </div>
          <button type="button" className="primary-button" onClick={resetForm}>
            New
          </button>
        </div>
        <div className="blog-list">
          {loading ? <p className="muted">Loading blogs...</p> : null}
          {blogs.map((blog) => (
            <button
              key={blog.id}
              type="button"
              className={`blog-row ${selectedId === blog.id ? "active" : ""}`}
              onClick={() => selectBlog(blog)}
            >
              <div className="blog-row-top">
                <strong>{blog.title}</strong>
                <span className={`status ${blog.status}`}>{blog.status}</span>
              </div>
              <div className="blog-row-meta">
                <span>{blog.name}</span>
                <span className={`index-state ${blog.index_status}`}>{blog.index_status}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="main-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Authoring</p>
              <h2>{form.id ? "Edit blog" : "Create blog"}</h2>
            </div>
            <div className="panel-actions">
              {form.id ? (
                <button type="button" className="ghost-button" onClick={onDelete}>
                  Delete
                </button>
              ) : null}
              <button type="button" className="primary-button" onClick={onSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div className="form-grid">
            <label>
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="my-first-blog"
              />
            </label>
            <label>
              <span>Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="How RAG works for blog content"
              />
            </label>
            <label className="full-width">
              <span>Tags</span>
              <input
                value={form.tagsText}
                onChange={(event) => setForm((current) => ({ ...current, tagsText: event.target.value }))}
                placeholder="rag, ai, postgres"
              />
            </label>
            <label>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as BlogStatus }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <RichTextEditor
            value={form.contentHtml}
            onChange={(contentHtml) => setForm((current) => ({ ...current, contentHtml }))}
          />

          {error ? <p className="error-banner">{error}</p> : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Retrieval</p>
              <h2>Ask over published blogs</h2>
            </div>
          </div>

          <label className="full-width">
            <span>Question</span>
            <textarea
              rows={5}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What do our blogs say about chunking strategy for RAG?"
            />
          </label>

          <div className="tag-filter-row">
            {availableTags.map((tag) => {
              const active = filterTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tag-pill ${active ? "active" : ""}`}
                  onClick={() =>
                    setFilterTags((current) =>
                      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
                    )
                  }
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <button type="button" className="primary-button" onClick={onAsk} disabled={asking || !question.trim()}>
            {asking ? "Searching..." : "Ask"}
          </button>

          <div className="answer-box">
            <h3>Answer</h3>
            <p>{answer || "Ask a question to retrieve grounded context from published blogs."}</p>
          </div>

          <div className="citation-list">
            {citations.map((citation) => (
              <article key={`${citation.blogId}-${citation.chunkIndex}`} className="citation-item">
                <div className="citation-head">
                  <strong>{citation.title}</strong>
                  <span>{citation.score.toFixed(3)}</span>
                </div>
                <p className="citation-name">{citation.name}</p>
                <p>{citation.snippet}</p>
                <div className="tag-row">
                  {citation.tags.map((tag) => (
                    <span key={tag} className="tag-pill static">
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

