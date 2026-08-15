import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import type { Session } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, Grid } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type Metadata = { invitation_state:string; organization_name:string|null; masked_email:string|null; role:string|null; expiration:string|null };

export function TeamJoin() {
  const token = new URLSearchParams(useSearch()).get("token");
  const [metadata,setMetadata] = useState<Metadata|null>(null);
  const [session,setSession] = useState<Session|null>(null);
  const [email,setEmail] = useState(""); const [password,setPassword] = useState("");
  const [signUp,setSignUp] = useState(false); const [busy,setBusy] = useState(false); const [error,setError] = useState<string|null>(null);
  useEffect(()=>{
    if (!supabase) return;
    void supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,next)=>setSession(next));
    if (!token) setMetadata({invitation_state:"missing",organization_name:null,masked_email:null,role:null,expiration:null});
    else void (supabase.rpc as any)("get_organization_member_invite_metadata",{p_token:token}).then(({data,error}:{data:Metadata[]|null,error:unknown})=>setMetadata(error||!data?.[0]?{invitation_state:"invalid",organization_name:null,masked_email:null,role:null,expiration:null}:data[0]));
    return ()=>subscription.unsubscribe();
  },[token]);
  async function authenticate(event:React.FormEvent){event.preventDefault();if(!supabase)return;setBusy(true);setError(null);const result=signUp?await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.href}}):await supabase.auth.signInWithPassword({email,password});if(result.error)setError(result.error.message);else if(signUp&&!result.data.session)setError("Check your email to confirm your account, then return to this invitation link.");setBusy(false);}
  async function redeem(){if(!supabase||!token)return;setBusy(true);setError(null);const {error}=await (supabase.rpc as any)("redeem_organization_member_invite",{p_token:token});if(error){setError(error.message);setBusy(false);return;}window.history.replaceState({},"","/dashboard");window.location.reload();}
  const unusable=metadata?.invitation_state&&metadata.invitation_state!=="usable";
  return <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-emerald-950"><div className="w-full max-w-md"><div className="flex flex-col items-center mb-8 text-white"><Grid className="w-8 h-8 text-emerald-300"/><h1 className="font-bold text-xl mt-3">RE:Fashioned</h1></div><div className="bg-white rounded-2xl shadow-2xl p-8">
    {!metadata?<p>Checking invitation…</p>:unusable?<div className="text-center"><AlertCircle className="mx-auto text-amber-600"/><h2 className="font-semibold mt-3">Invitation {metadata.invitation_state}</h2><p className="text-sm text-muted-foreground mt-2">This invitation cannot be used. Ask an administrator for a new link.</p></div>:<><CheckCircle2 className="text-emerald-600"/><h2 className="text-xl font-semibold mt-3">Join {metadata.organization_name}</h2><p className="mt-2 text-sm">Invited account: <strong>{metadata.masked_email}</strong></p><p className="text-sm">Role: <strong className="capitalize">{metadata.role}</strong></p><p className="text-xs text-muted-foreground mt-2">Expires {metadata.expiration?new Date(metadata.expiration).toLocaleString():"soon"}</p>{error&&<p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}{session?<><p className="mt-5 text-sm">Signed in as {session.user.email}</p><button disabled={busy} onClick={()=>void redeem()} className="mt-3 w-full rounded bg-emerald-800 px-4 py-2 text-white">Accept invitation</button></>:<form onSubmit={authenticate} className="mt-5 space-y-3"><input aria-label="Email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded border p-2"/><input aria-label="Password" type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded border p-2"/><button disabled={busy} className="w-full rounded bg-emerald-800 p-2 text-white">{signUp?"Create account":"Sign in"}</button><button type="button" onClick={()=>setSignUp(v=>!v)} className="w-full text-sm underline">{signUp?"Use an existing account":"Create an account"}</button></form>}</>}
  </div></div></div>;
}
