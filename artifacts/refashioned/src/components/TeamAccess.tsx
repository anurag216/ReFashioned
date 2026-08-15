import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { formatOrganizationRole } from "../lib/organizationRoles";

type Role="admin"|"manager"|"viewer";
type Member={member_id:string;email:string;role:Role};
type Invite={invite_id:string;email:string;role:Role;expires_at:string;state:string};
type View={members:Member[];invites:Invite[]};

function isRole(value:unknown):value is Role{return value==="admin"||value==="manager"||value==="viewer";}
function isAccessView(value:unknown):value is View{
 if(!value||typeof value!=="object")return false;
 const candidate=value as {members?:unknown;invites?:unknown};
 return Array.isArray(candidate.members)&&candidate.members.every(member=>{
  if(!member||typeof member!=="object")return false;
  const row=member as Partial<Member>;
  return typeof row.member_id==="string"&&typeof row.email==="string"&&isRole(row.role);
 })&&Array.isArray(candidate.invites)&&candidate.invites.every(invite=>{
  if(!invite||typeof invite!=="object")return false;
  const row=invite as Partial<Invite>;
  return typeof row.invite_id==="string"&&typeof row.email==="string"&&isRole(row.role)&&typeof row.expires_at==="string"&&typeof row.state==="string";
 });
}

export function TeamAccess(){
 const queryClient=useQueryClient(); const [view,setView]=useState<View|null>(null); const [email,setEmail]=useState(""); const [role,setRole]=useState<Role>("viewer"); const [link,setLink]=useState(""); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{if(!supabase)return;const {data,error}=await supabase.rpc("get_organization_access_admin_view");if(error)setError(error.message);else if(isAccessView(data))setView(data);else setError("The team access response was invalid.");},[]);
 useEffect(()=>{void load()},[load]);
 async function invite(e:React.FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError(null);const {data,error}=await supabase.rpc("create_organization_member_invite",{p_email:email,p_role:role});if(error)setError(error.message);else{const row=data[0];setLink(`${window.location.origin}/team/join?token=${row.raw_token}`);setEmail("");await load();}setBusy(false);}
 async function changeRole(member:Member,next:Role){if(!supabase||next===member.role)return;const reason=window.prompt("Reason for role change:");if(!reason)return;const {error}=await supabase.rpc("update_organization_member_role",{p_member_id:member.member_id,p_new_role:next,p_reason:reason});if(error)setError(error.message);else{await load();await queryClient.invalidateQueries({queryKey:["current-membership"]});}}
 async function revokeMember(member:Member){if(!supabase)return;const reason=window.prompt(`Reason for revoking ${member.email}:`);if(!reason)return;const {error}=await supabase.rpc("revoke_organization_member_access",{p_member_id:member.member_id,p_reason:reason});if(error)setError(error.message);else{await load();await queryClient.invalidateQueries({queryKey:["current-membership"]});}}
 async function revokeInvite(invite:Invite){if(!supabase)return;const {error}=await supabase.rpc("revoke_organization_member_invite",{p_invite_id:invite.invite_id,p_reason:"Revoked by administrator"});if(error)setError(error.message);else await load();}
 return <div className="space-y-6"><div><h2 className="text-xl font-semibold">Team Access</h2><p className="text-sm text-muted-foreground">Invite colleagues and manage tenant authorization.</p></div>{error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}<form onSubmit={invite} className="bg-card border rounded-lg p-5 grid gap-3 md:grid-cols-[1fr_180px_auto]"><input aria-label="Team member email" required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="colleague@company.com" className="rounded border px-3 py-2"/><select aria-label="Team member role" value={role} onChange={e=>setRole(e.target.value as Role)} className="rounded border px-3 py-2"><option value="admin">Admin</option><option value="manager">Manager</option><option value="viewer">Viewer</option></select><button disabled={busy} className="rounded bg-primary text-primary-foreground px-4 py-2">Invite team member</button></form>{link&&<div className="rounded border border-emerald-200 bg-emerald-50 p-4"><label className="text-sm font-medium">Copy this invitation URL (shown only now)</label><div className="mt-2 flex gap-2"><input readOnly value={link} className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"/><button onClick={()=>void navigator.clipboard.writeText(link)} className="rounded border bg-white px-4">Copy</button></div></div>}
 <section className="bg-card border rounded-lg p-5"><h3 className="font-semibold mb-3">Active members</h3><div className="space-y-3">{view?.members.map(m=><div key={m.member_id} className="flex flex-wrap items-center gap-3 border-b pb-3"><span className="flex-1 min-w-52">{m.email}</span><select aria-label={`Role for ${m.email}`} value={m.role} onChange={e=>void changeRole(m,e.target.value as Role)} className="rounded border p-2"><option value="admin">Admin</option><option value="manager">Manager</option><option value="viewer">Viewer</option></select><button onClick={()=>void revokeMember(m)} className="rounded border px-3 py-2 text-red-700">Revoke access</button></div>)}</div></section>
 <section className="bg-card border rounded-lg p-5"><h3 className="font-semibold mb-3">Invitations</h3><div className="space-y-3">{view?.invites.map(i=><div key={i.invite_id} className="flex flex-wrap items-center gap-3 border-b pb-3"><span className="flex-1 min-w-52">{i.email}</span><span>{formatOrganizationRole(i.role)}</span><span className="text-sm text-muted-foreground">{new Date(i.expires_at).toLocaleDateString()} · {i.state}</span>{i.state==="usable"&&<button onClick={()=>void revokeInvite(i)} className="rounded border px-3 py-2 text-red-700">Revoke invitation</button>}</div>)}</div></section></div>
}
