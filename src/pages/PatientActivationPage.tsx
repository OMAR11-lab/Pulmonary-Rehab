import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { LockKeyhole, Wind } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
export function PatientActivationPage(){
 const navigate=useNavigate();const [params]=useSearchParams();const token=params.get('token')??'';const {user,profile,loading}=useAuth();const [phone,setPhone]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('')
 if(!loading&&user&&profile?.is_active&&!token)return <Navigate to="/" replace/>
 async function activate(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!supabase)return;setError('');setNotice('');if(password.length<10){setError('Use a password of at least 10 characters.');return}if(password!==confirm){setError('The passwords do not match.');return}setBusy(true)
  const {data,error:activationError}=await supabase.functions.invoke('activate-patient-account',{body:{token,phone:phone.trim(),password}})
  if(activationError||data?.error){setError(data?.error||activationError?.message||'Unable to activate account.');setBusy(false);return}
  const {error:signInError}=await supabase.auth.signInWithPassword({phone:phone.trim(),password})
  if(signInError){setNotice('Your account was created. Return to Patient sign in and use your phone number and password.');setBusy(false);return}
  setNotice('Patient account activated. Opening your workspace…');setBusy(false);window.setTimeout(()=>navigate('/',{replace:true}),700)
 }
 return <div className="password-page"><section className="password-card"><div className="mobile-brand"><div className="brand-mark"><Wind size={20}/></div><strong>Respira</strong></div><div className="form-kicker">PATIENT ACCOUNT ACTIVATION</div><h1>Verify your phone number</h1><p className="muted">Enter the same phone number your doctor recorded in your patient file. It is checked against that record only; no SMS or verification code will be sent. Create a password to access your account.</p>{!token&&<div className="form-error">The activation token is missing. Ask your clinic to create a new activation link.</div>}{notice&&<div className="success-banner">{notice}</div>}{error&&<div className="form-error">{error}</div>}
 <form className="login-form" onSubmit={activate}><label>Phone number recorded by your doctor</label><div className="input-wrap"><LockKeyhole size={16}/><input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+20…" autoComplete="tel"/></div><label>Create password</label><div className="input-wrap"><LockKeyhole size={16}/><input required type="password" minLength={10} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters" autoComplete="new-password"/></div><label>Confirm password</label><div className="input-wrap"><LockKeyhole size={16}/><input required type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter password again" autoComplete="new-password"/></div><button className="primary-button full" disabled={busy||!token||!supabase}>{busy?'Activating account…':'Verify number and activate account'}</button></form>
 <p className="login-footnote">If the number does not match the patient record, contact your clinic. This portal does not replace your prescribed asthma treatment or emergency care.</p></section></div>
}
