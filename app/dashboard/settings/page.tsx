"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Bell, Shield, ArrowLeft, Check } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("account");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation */}
        <aside className="w-full md:w-64 space-y-1">
          <button onClick={() => setActiveTab("account")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === "account" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
            <User className="h-4 w-4" /> Account Profile
          </button>
          <button onClick={() => setActiveTab("notifications")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === "notifications" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
            <Bell className="h-4 w-4" /> Notifications
          </button>
          <button onClick={() => setActiveTab("privacy")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === "privacy" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
            <Shield className="h-4 w-4" /> Privacy & Security
          </button>
        </aside>

        {/* Settings Content */}
        <div className="flex-1 border rounded-xl bg-card p-6 shadow-sm">
          {activeTab === "account" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input defaultValue={user?.fullName || ""} placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <Input defaultValue={user?.primaryEmailAddress?.emailAddress || ""} disabled className="bg-muted" />
                    <p className="text-[11px] text-muted-foreground">Email is managed by your Clerk account.</p>
                  </div>
                </div>
              </div>
              <Button onClick={handleSave} className="w-32">
                {saved ? <><Check className="h-4 w-4 mr-2" /> Saved</> : "Save Changes"}
              </Button>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                {["New Messages", "Mentions & Replies", "Meeting Reminders"].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{item}</p>
                      <p className="text-xs text-muted-foreground">Receive email notifications for {item.toLowerCase()}.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Privacy & Security</h2>
              <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg">
                <p className="text-sm font-medium text-red-800 dark:text-red-400">Danger Zone</p>
                <p className="text-xs text-red-600 dark:text-red-300 mb-3">Once you delete your account, there is no going back.</p>
                <Button variant="destructive" size="sm">Delete Account</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
