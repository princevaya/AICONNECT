import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "@/components/dashboard/dashboard-layout-client";

interface Props {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: Props) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
