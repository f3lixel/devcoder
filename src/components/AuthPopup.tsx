"use client";
import React, { useEffect, useState } from "react";
import { X, Eye, EyeOff, Mail, Lock, User, Github } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function AuthPopup({ open, onClose, redirectToUrl, onSignedIn }: { open: boolean; onClose: () => void; redirectToUrl?: string; onSignedIn?: () => void }) {
  const supabase = supabaseBrowser();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  });

  useEffect(() => {
    if (!open) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evt: "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "PASSWORD_RECOVERY" | "TOKEN_REFRESHED" | "USER_DELETED" | "MFA_CHALLENGE_VERIFIED" | "MFA_CHALLENGE_FAILED" | "MFA_ENROLLMENT_ATTEMPTED" | "MFA_ENROLLMENT_COMPLETED" | "MFA_ENROLLMENT_FAILED", session: { user?: unknown } | null) => {
      if (evt === "SIGNED_IN" && session?.user) {
        onClose();
        onSignedIn?.();
      }
    });
    return () => subscription.unsubscribe();
  }, [open]);

  const handleInput = (field: string, value: string) => setFormData((p) => ({ ...p, [field]: value }));

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    setSubmitting(true);
    try {
      const targetUrl = redirectToUrl || `${window.location.origin}/projects`;
      await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: targetUrl } });
    } catch (e: any) {
      setError(e?.message || "Login fehlgeschlagen");
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          setError("Passwörter stimmen nicht überein");
          setSubmitting(false);
          return;
        }
        const targetUrl = redirectToUrl || `${window.location.origin}/projects`;
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { first_name: formData.firstName, last_name: formData.lastName },
            emailRedirectTo: targetUrl,
          },
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        if (data?.user) {
          onClose();
          onSignedIn?.();
        }
      }
    } catch (e: any) {
      setError(e?.message || "Fehler beim Anmelden");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 bg-background border-border overflow-hidden">
        <DialogTitle className="sr-only">
          {isSignUp ? "Konto erstellen" : "Willkommen zurück"}
        </DialogTitle>
        <div className="relative">
          <Card className="border-0 shadow-none">
            <CardHeader className="space-y-1 pb-4 pt-3">
              <CardTitle className="text-2xl font-bold text-center text-foreground">
                {isSignUp ? "Konto erstellen" : "Willkommen zurück"}
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                {isSignUp ? "Erstellen Sie Ihr Konto um loszulegen" : "Melden Sie sich in Ihrem Konto an"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Vorname</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="firstName" placeholder="Max" type="text" value={formData.firstName} onChange={(e) => handleInput("firstName", e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="lastName" placeholder="Mustermann" type="text" value={formData.lastName} onChange={(e) => handleInput("lastName", e.target.value)} className="pl-10" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">E‑Mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" placeholder="max@beispiel.de" type="email" value={formData.email} onChange={(e) => handleInput("email", e.target.value)} className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" placeholder="••••••••" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => handleInput("password", e.target.value)} className="pl-10 pr-10" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="confirmPassword" placeholder="••••••••" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => handleInput("confirmPassword", e.target.value)} className="pl-10 pr-10" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                )}

                {!isSignUp && (
                  <div className="flex items-center justify-end">
                    <Button type="button" variant="link" className="px-0 font-normal">Passwort vergessen?</Button>
                  </div>
                )}

                {error ? <div className="text-sm text-red-500">{error}</div> : null}

                <Button type="submit" disabled={submitting} className="w-full">
                  {isSignUp ? "Konto erstellen" : "Anmelden"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ODER</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="w-full" disabled={submitting} onClick={() => handleOAuth("github")}>
                  <Github className="mr-2 h-4 w-4" /> GitHub
                </Button>
                <Button type="button" variant="outline" className="w-full" disabled={submitting} onClick={() => handleOAuth("google")}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  Google
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                {isSignUp ? "Haben Sie bereits ein Konto?" : "Noch kein Konto?"}{" "}
                <Button type="button" variant="link" className="px-0 font-normal" onClick={() => setIsSignUp((v) => !v)}>
                  {isSignUp ? "Anmelden" : "Registrieren"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

