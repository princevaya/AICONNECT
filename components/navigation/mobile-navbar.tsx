"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/constants/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { LucideIcon, Menu, X } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import ThemeToggle from "./theme-toggle";

const MobileNavbar = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="flex lg:hidden items-center justify-end gap-2">
      <ThemeToggle />
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-screen">
          <SheetClose
            asChild
            className="absolute top-3 right-5 bg-background z-20 flex items-center justify-center"
          >
            <Button size="icon" variant="ghost">
              <X className="w-5 h-5" />
            </Button>
          </SheetClose>
          <div className="flex flex-col items-start w-full py-2 mt-10">
            <div className="flex items-center justify-evenly w-full space-x-2">
              <SignedIn>
                <Link
                  href="/dashboard"
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full",
                  })}
                  onClick={handleClose}
                >
                  Dashboard
                </Link>
                <div className="flex items-center justify-center p-2">
                  <UserButton />
                </div>
              </SignedIn>
              <SignedOut>
                <Link
                  href="/auth/sign-in"
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full",
                  })}
                  onClick={handleClose} // Close sheet on navigation
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/sign-up"
                  className={buttonVariants({ className: "w-full" })}
                  onClick={handleClose} // Close sheet on navigation
                >
                  Sign Up
                </Link>
              </SignedOut>
            </div>
            <ul className="flex flex-col items-start w-full mt-6">
              <Accordion type="single" collapsible className="w-full!">
                {NAV_LINKS.map((link) => (
                  <AccordionItem
                    key={link.title}
                    value={link.title}
                    className="last:border-none"
                  >
                    {link.menu ? (
                      <>
                        <AccordionTrigger>{link.title}</AccordionTrigger>
                        <AccordionContent>
                          <ul
                            // Removed onClick={handleClose} here, it's better to put it on the ListItems
                            className={cn("w-full")}
                          >
                            {link.menu.map((menuItem) => (
                              <ListItem
                                key={menuItem.title}
                                title={menuItem.title}
                                href={menuItem.href}
                                icon={menuItem.icon}
                                // Pass handleClose to ListItem to close on click
                                onClick={handleClose}
                              >
                                {menuItem.tagline}
                              </ListItem>
                            ))}
                          </ul>
                        </AccordionContent>
                      </>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={handleClose}
                        className="flex items-center w-full py-4 font-medium text-muted-foreground hover:text-foreground"
                      >
                        <span>{link.title}</span>
                      </Link>
                    )}
                  </AccordionItem>
                ))}
              </Accordion>
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Updated ListItem to accept onClick and spread it to the Link
const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string; icon: LucideIcon }
>(({ className, title, href, icon: Icon, children, ...props }, ref) => {
  return (
    <li>
      <Link
        href={href!}
        ref={ref}
        className={cn(
          "block select-none space-y-1 rounded-lg p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          className
        )}
        {...props} // Spreads onClick prop here
      >
        <div className="flex items-center space-x-2 text-foreground">
          <Icon className="h-4 w-4" />
          <h6 className="text-sm leading-none!">{title}</h6>
        </div>
        <p
          title={children! as string}
          className="line-clamp-1 text-sm leading-snug text-muted-foreground"
        >
          {children}
        </p>
      </Link>
    </li>
  );
});
ListItem.displayName = "ListItem";

export default MobileNavbar;
