import React from "react";
import MaxWidthWrapper from "@/components/global/max-width-wrapper";

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  return (
    <>
      <div className="my-20">
        <MaxWidthWrapper>
          <div className="mx-auto w-full">{children}</div>
        </MaxWidthWrapper>
      </div>
    </>
  );
}
