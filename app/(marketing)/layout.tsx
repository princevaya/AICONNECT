import React from "react";
import Navbar from "@/components/navigation/navbar";
import { cn } from "@/lib/utils";
import Footer from "@/components/navigation/footer";

interface Props {
  children: React.ReactNode;
}

const MarketingLayout = ({ children }: Props) => {
  return (
    <>
      <Navbar />
      <div
        id="home"
        className="absolute inset-0 h-200 w-full items-center justify-center"
      >
        <div
          className={cn(
            "absolute inset-0 h-full w-full",
            "bg-size-[3rem_3rem]",
            "bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
            "dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]",
            "mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center bg-background",
            "mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]"
          )}
        />
      </div>

      <main className="mt-20 mx-auto w-full z-10 relative">{children}</main>
      <Footer />
    </>
  );
};

export default MarketingLayout;
