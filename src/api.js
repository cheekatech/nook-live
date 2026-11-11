import { supabase } from "./supabaseClient";
import { colorFor, dmKey, sortChats } from "./helpers";

/* ------------------------------ mapping ------------------------------ */

export const toUser = (r) => ({
  id: r.id,
  username: r.username,
  name: r.name,
  about: r.about,
  color: r.color || colorFor(r.username),
  joined: new Date(r.created_at).getTime(),
});

const idMap = (users) => Object.fromEntries(Object.values(users).map((u) => [u.id, u.username]));
const ms = (iso) => new Date(iso).getTime();

/* ------------------------------- auth -------------------------------- */

export async function signUp({ email, password, username, name }) {
  const { data: free, error: e1 } = await supabase.rpc("username_available", { u: username });
  if (e1) return { error: e1.message };
  if (!free) return { error: "That username is taken. Pick another, or sign in." };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, name } },
  });
  if (error) return { error: error.message };
  // When "Confirm email" is on in Supabase, there is no session until the email link is clicked.
  if (!data.session) return { notice: "Account created. Check your email for a confirmation link, then sign in." };
  return { ok: true };
}

export async function signIn({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: error.message } : { ok: true };
}

export async function changePassword(email, current, next) {
  const { error: e1 } = await supabase.auth.signInWithPassword({ email, password: current });
  if (e1) return { ok: false, text: "Current password is wrong." };
  const { error } = await supabase.auth.updateUser({ password: next });
  return error ? { ok: false, text: error.message } : { ok: true, text: "Password updated." };
}

export const deleteAccount = () => supabase.rpc("delete_my_account");

export const updateProfile = (id, patch) =>
  supabase.from("profiles").update(patch).eq("id", id).select().single();

/* ------------------------------- reads ------------------------------- */

export async function fetchUsers() {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  const map = {};
  data.forEach((r) => {
    const u = toUser(r);
    map[u.username] = u;
  });
  return map;
}

export async function fetchPosts(users) {
  const names = idMap(users);
  const { data, error } = await supabase
    .from("posts")
    .select("id, author, text, created_at, post_likes(user_id), post_comments(id, author, text, created_at)")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    author: names[p.author] || "unknown",
    text: p.text,
    ts: ms(p.created_at),
    likes: p.post_likes.map((l) => names[l.user_id]).filter(Boolean),
    comments: p.post_comments
      .map((c) => ({ id: c.id, author: names[c.author] || "unknown", text: c.text, ts: ms(c.created_at) }))
      .sort((a, b) => a.ts - b.ts),
  }));
}

export async function fetchChats(me, users) {
  const names = idMap(users);

  const { data: chats, error } = await supabase
    .from("chats")
    .select("id, type, name, color, created_at, chat_members(user_id, role, last_read_at)");
  if (error) throw error;

  // Row Level Security guarantees these are only messages from chats you belong to.
  const { data: msgs, error: e2 } = await supabase
    .from("messages")
    .select("id, chat_id, sender, text, created_at")
    .order("created_at", { ascending: false })
    .limit(1500);
  if (e2) throw e2;

  const byChat = {};
  [...msgs].reverse().forEach((m) => {
    if (!byChat[m.chat_id]) byChat[m.chat_id] = [];
    byChat[m.chat_id].push({ id: m.id, from: names[m.sender] || "unknown", text: m.text, ts: ms(m.created_at) });
  });

  const list = chats.map((c) => {
    const members = c.chat_members.map((m) => names[m.user_id]).filter(Boolean);
    const mine = c.chat_members.find((m) => m.user_id === me.id);
    const lastRead = mine?.last_read_at ? ms(mine.last_read_at) : 0;
    const msgsArr = byChat[c.id] || [];

    if (c.type === "dm") {
      const other = members.find((n) => n !== me.username) || me.username;
      return { kind: "dm", key: dmKey(me.username, other), id: c.id, other, msgs: msgsArr, lastRead };
    }
    const adminRow = c.chat_members.find((m) => m.role === "admin");
    return {
      kind: "group",
      key: "group:" + c.id,
      id: c.id,
      msgs: msgsArr,
      lastRead,
      group: {
        id: c.id,
        name: c.name,
        members,
        admin: (adminRow && names[adminRow.user_id]) || members[0],
        created: ms(c.created_at),
        color: c.color || colorFor(c.name || ""),
      },
    };
  });
  return sortChats(list);
}

/* ------------------------------ writes ------------------------------- */

export const createPost = (me, text) => supabase.from("posts").insert({ author: me.id, text });

export const toggleLike = (me, post) =>
  post.likes.includes(me.username)
    ? supabase.from("post_likes").delete().match({ post_id: post.id, user_id: me.id })
    : supabase.from("post_likes").insert({ post_id: post.id, user_id: me.id });

export const addComment = (me, post, text) =>
  supabase.from("post_comments").insert({ post_id: post.id, author: me.id, text });

export const deletePost = (id) => supabase.from("posts").delete().eq("id", id);

export async function startDm(otherId) {
  const { data, error } = await supabase.rpc("start_dm", { other_id: otherId });
  if (error) throw error;
  return data;
}

export const sendMessage = (me, chatId, text) =>
  supabase.from("messages").insert({ chat_id: chatId, sender: me.id, text });

export const createGroup = (name, color, memberIds) =>
  supabase.rpc("create_group", { group_name: name, group_color: color, member_ids: memberIds });

export const addMember = (chatId, userId) => supabase.rpc("add_group_member", { p_chat: chatId, p_user: userId });
export const leaveChat = (chatId) => supabase.rpc("leave_chat", { p_chat: chatId });
export const markRead = (chatId) => supabase.rpc("mark_read", { p_chat: chatId });
