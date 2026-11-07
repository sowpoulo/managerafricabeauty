import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Trophy, Send, Smile } from "lucide-react";

const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("africa_beauty_token");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface Post {
  id: number;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  author: { id: number; name: string } | null;
  recipient: { id: number; name: string } | null;
  badge: { id: number; name: string; icon: string; color: string } | null;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
}

const MOODS = [
  { value: "GREAT", emoji: "😄", label: "Super", score: 5 },
  { value: "GOOD", emoji: "🙂", label: "Bien", score: 4 },
  { value: "OKAY", emoji: "😐", label: "Ça va", score: 3 },
  { value: "BAD", emoji: "😕", label: "Difficile", score: 2 },
  { value: "TERRIBLE", emoji: "😞", label: "Très dur", score: 1 },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

function PostCard({ post }: { post: Post }) {
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: comments } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: () => apiFetch(`/recognition/posts/${post.id}/comments`),
    enabled: showComments,
  });

  const likeMut = useMutation({
    mutationFn: () => apiFetch(`/recognition/posts/${post.id}/like`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recognition-posts"] }),
  });

  const commentMut = useMutation({
    mutationFn: (content: string) =>
      apiFetch(`/recognition/posts/${post.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["comments", post.id] });
      qc.invalidateQueries({ queryKey: ["recognition-posts"] });
    },
  });

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {post.isAnonymous ? "?" : post.author?.name?.[0] || "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {post.isAnonymous ? "Anonyme" : post.author?.name}
              {post.recipient && (
                <span className="text-muted-foreground"> → {post.recipient.name}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        {post.badge && (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ backgroundColor: `${post.badge.color}20`, color: post.badge.color }}
          >
            <Trophy className="w-3 h-3" />
            {post.badge.name}
          </span>
        )}
      </div>

      <p className="text-sm text-foreground">{post.content}</p>

      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={() => likeMut.mutate()}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            post.likedByMe ? "text-pink-600" : "text-muted-foreground hover:text-pink-600"
          }`}
        >
          <Heart className={`w-4 h-4 ${post.likedByMe ? "fill-pink-600" : ""}`} />
          {post.likesCount}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {post.commentsCount}
        </button>
      </div>

      {showComments && (
        <div className="pt-2 border-t border-border space-y-2">
          {comments?.map((c: any) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <span className="font-medium text-foreground">{c.author.name}</span>
              <span className="text-muted-foreground">{c.content}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Ajouter un commentaire..."
              className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
              onKeyDown={(e) => {
                if (e.key === "Enter" && commentText.trim()) {
                  commentMut.mutate(commentText);
                }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => commentText.trim() && commentMut.mutate(commentText)}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecognitionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["recognition-posts"],
    queryFn: () => apiFetch("/recognition/posts"),
  });

  const createPostMut = useMutation({
    mutationFn: (content: string) =>
      apiFetch("/recognition/posts", { method: "POST", body: JSON.stringify({ content }) }),
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["recognition-posts"] });
    },
  });

  const moodMut = useMutation({
    mutationFn: (mood: { value: string; score: number }) =>
      apiFetch("/mood/checkin", {
        method: "POST",
        body: JSON.stringify({ mood: mood.value, score: mood.score }),
      }),
    onSuccess: (_, mood) => setSelectedMood(mood.value),
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mur de la Reconnaissance</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Célébrons les réussites de l'équipe</p>
      </div>

      {/* Mood check-in */}
      <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Smile className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-foreground">Comment vous sentez-vous aujourd'hui ?</p>
        </div>
        <div className="flex gap-2 justify-between">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => moodMut.mutate(m)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                selectedMood === m.value ? "bg-primary/10 scale-105" : "hover:bg-muted"
              }`}
            >
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* New post */}
      <div className="bg-card border border-card-border rounded-xl p-4 shadow-sm space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Partagez une réussite, félicitez une collègue..."
          className="resize-none"
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!content.trim() || createPostMut.isPending}
            onClick={() => createPostMut.mutate(content)}
          >
            Publier
          </Button>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Chargement...</div>
      ) : !posts || posts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Aucune publication pour le moment. Soyez le premier à féliciter quelqu'un !
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: Post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
