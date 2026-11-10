"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Bell, Shield, ArrowLeft, Check, Loader2, BellRing } from "lucide-react";

type NotificationPrefs = {
  newMessages: boolean;
  mentionsAndReplies: boolean;
  meetingReminders: boolean;
  browserNotifications: boolean;
  soundAlerts: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  newMessages: true,
  mentionsAndReplies: true,
  meetingReminders: true,
  browserNotifications: false,
  soundAlerts: true,
};

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "hi", label: "Hindi" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
];

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"account" | "notifications" | "privacy">("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [notifications, setNotifications] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);
  const [permissionState, setPermissionState] = useState<string>("default");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/settings", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load settings");
        if (!active) return;
        setFullName(data.profile?.name || user?.fullName || "");
        setEmail(data.profile?.email || user?.primaryEmailAddress?.emailAddress || "");
        setPreferredLanguage(data.profile?.preferredLanguage || "en");
        setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(data.notifications || {}) });
      })
      .catch((err) => {
        if (active) {
          setFullName(user?.fullName || "");
          setEmail(user?.primaryEmailAddress?.emailAddress || "");
          setErrorMessage(err instanceof Error ? err.message : "Failed to load settings");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.fullName, user?.primaryEmailAddress?.emailAddress]);

  const persistSettings = async (payload: {
    name?: string;
    preferredLanguage?: string;
    notifications?: Partial<NotificationPrefs>;
  }) => {
    setErrorMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update settings");
      if (data.profile?.name !== undefined) setFullName(data.profile.name);
      if (data.profile?.preferredLanguage) setPreferredLanguage(data.profile.preferredLanguage);
      if (data.notifications) setNotifications({ ...DEFAULT_NOTIFICATIONS, ...data.notifications });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    void persistSettings({
      name: fullName,
      preferredLanguage,
      notifications,
    });
  };

  const handleToggleNotification = (key: keyof NotificationPrefs, nextValue: boolean) => {
    const updated = { ...notifications, [key]: nextValue };
    setNotifications(updated);
    void persistSettings({ notifications: updated });
  };

  const handleEnableBrowserPush = async () => {
    setErrorMessage(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setErrorMessage("Browser notifications are not supported on this device.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== "granted") {
        setErrorMessage("Notification permission was not granted.");
        return;
      }
      let subscriptionEndpoint = `browser://${user?.id || "local"}`;
      let p256dh: string | undefined;
      let authKey: string | undefined;
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.register("/sw.js");
        try {
          const metaRes = await fetch("/api/external-chat/notifications/subscribe", { credentials: "same-origin" });
          const meta = await metaRes.json().catch(() => ({}));
          if (meta.vapidPublicKey && reg.pushManager) {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: meta.vapidPublicKey,
            });
            const json = sub.toJSON();
            if (json.endpoint) subscriptionEndpoint = json.endpoint;
            p256dh = json.keys?.p256dh;
            authKey = json.keys?.auth;
          }
        } catch {
          // Local browser notifications still work via active service worker
        }
        await reg.showNotification("AIConnect Notifications Enabled", {
          body: "You will now receive alerts for calls, message requests, and chat updates.",
          icon: "/favicon.ico",
        });
      }
      await fetch("/api/external-chat/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          endpoint: subscriptionEndpoint,
          keys: { p256dh, auth: authKey },
        }),
      });
      handleToggleNotification("browserNotifications", true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to enable browser notifications");
    }
  };

  const handleDeleteAccount = async () => {
    setErrorMessage(null);
    setDeleting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete account");
      await signOut({ redirectUrl: "/" });
      router.push("/");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto min-h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage your account settings, translation language, and notification preferences.</p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-500">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
        {/* Settings Navigation */}
        <aside className="w-full md:w-64 flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
          <button onClick={() => setActiveTab("account")} className={`shrink-0 md:w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === "account" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
            <User className="h-4 w-4" /> Account Profile
          </button>
          <button onClick={() => setActiveTab("notifications")} className={`shrink-0 md:w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === "notifications" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
            <Bell className="h-4 w-4" /> Notifications
          </button>
          <button onClick={() => setActiveTab("privacy")} className={`shrink-0 md:w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === "privacy" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
            <Shield className="h-4 w-4" /> Privacy & Security
          </button>
        </aside>

        {/* Settings Content */}
        <div className="flex-1 border rounded-xl bg-card p-4 sm:p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading settings...
            </div>
          ) : null}

          {!loading && activeTab === "account" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="settings-full-name">Full Name</label>
                    <Input
                      id="settings-full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="settings-email">Email Address</label>
                    <Input id="settings-email" value={email} disabled className="bg-muted" />
                    <p className="text-[11px] text-muted-foreground">Email is managed by your Clerk account.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="settings-language">Preferred Translation Language</label>
                    <select
                      id="settings-language"
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="min-w-36">
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : saved ? (
                  <><Check className="h-4 w-4 mr-2" /> Saved</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}

          {!loading && activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Notification Preferences</h2>
                  <p className="text-xs text-muted-foreground">Browser permission status: <span className="font-medium capitalize">{permissionState}</span></p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleEnableBrowserPush} className="gap-2 self-start sm:self-auto">
                  <BellRing className="h-4 w-4" /> Enable Browser & Mobile Alerts
                </Button>
              </div>
              <div className="space-y-4">
                {[
                  { key: "newMessages" as const, label: "New Messages", desc: "Receive real-time alerts for incoming chat messages." },
                  { key: "mentionsAndReplies" as const, label: "Mentions & Replies", desc: "Notify immediately when someone mentions or replies to you." },
                  { key: "meetingReminders" as const, label: "Meeting & Call Alerts", desc: "Notify for incoming 1:1 audio/video calls and scheduled meetings." },
                  { key: "browserNotifications" as const, label: "Browser / Mobile Push", desc: "Show desktop & mobile PWA notifications via service worker." },
                  { key: "soundAlerts" as const, label: "Sound Alerts", desc: "Play ringtone & subtle sound cues for new activity." },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notifications[item.key]}
                        onChange={(e) => handleToggleNotification(item.key, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && activeTab === "privacy" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Privacy & Security</h2>
              <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-1">
                <p className="text-sm font-medium">End-to-End Encryption & Data Controls</p>
                <p className="text-xs text-muted-foreground">
                  External Chat rooms support browser-side WebCrypto ECDH P-256 + AES-256-GCM encryption so private message plaintext never touches the database when E2EE is enabled.
                </p>
              </div>
              <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">Danger Zone</p>
                  <p className="text-xs text-red-600 dark:text-red-300">Once you delete your account, your Clerk login and workspace chat records will be permanently removed.</p>
                </div>
                {!confirmDeleteOpen ? (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
                    Delete Account
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDeleteAccount}>
                      {deleting ? "Deleting..." : "Confirm Permanent Delete"}
                    </Button>
                    <Button variant="outline" size="sm" disabled={deleting} onClick={() => setConfirmDeleteOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
