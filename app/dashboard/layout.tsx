import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MaxWidthWrapper from "@/components/global/max-width-wrapper";

interface Props {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: Props) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  return (
    <>
      <div className="py-6 sm:py-8 lg:py-10">
        <MaxWidthWrapper>
          <div className="mx-auto w-full">{children}</div>
        </MaxWidthWrapper>
      </div>
    </>
  );
}
