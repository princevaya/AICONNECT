import MaxWidthWrapper from "@/components/global/max-width-wrapper";
import Navbar from "@/components/navigation/navbar";
import { Footer } from "react-day-picker";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col justify-center bg-background">
        <MaxWidthWrapper className="justify-center flex">
          {children}
        </MaxWidthWrapper>
        <Footer />
      </div>
    </>
  );
}
