"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/constants/navigation";
import { LucideIcon, Menu, X, ZapIcon } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import AnimationContainer from "../global/animation-container";
import MaxWidthWrapper from "../global/max-width-wrapper";
import ThemeToggle from "./theme-toggle";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";

const ResponsiveNavbar = () => {
  const [scroll, setScroll] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScroll = () => {
    if (window.scrollY > 8) {
      setScroll(true);
    } else {
      setScroll(false);
    }
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 inset-x-0 h-16 w-full border-b border-transparent z-99999 select-none transition-all duration-200",
        scroll && "border-background/80 bg-background/40 backdrop-blur-md"
      )}
    >
      <AnimationContainer reverse delay={0.1} className="size-full">
        <MaxWidthWrapper className="flex items-center justify-between h-full">
          {/* Logo - Always Visible */}
          <Link href="/#home" className="flex-shrink-0">
            <span className="text-lg font-bold font-heading leading-none!">
              AiConnect
            </span>
          </Link>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden md:flex items-center space-x-8 flex-1 justify-center">
            <NavigationMenu>
              <NavigationMenuList>
                {NAV_LINKS.map((link) => (
                  <NavigationMenuItem key={link.title}>
                    {link.menu ? (
                      <>
                        <NavigationMenuTrigger className="bg-transparent hover:bg-accent">
                          {link.title}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <ul
                            className={cn(
                              "grid gap-1 p-4 md:w-100 lg:w-125 rounded-xl",
                              link.title === "Features"
                                ? "lg:grid-cols-[.75fr_1fr]"
                                : "lg:grid-cols-2"
                            )}
                          >
                            {link.title === "Features" && (
                              <li className="row-span-4 pr-2 relative rounded-lg overflow-hidden">
                                <div
                                  className="absolute inset-0 z-10! h-full w-[calc(100%-10px)]
                                                                    bg-[linear-gradient(to_right,oklch(var(--color-foreground)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,oklch(var(--color-foreground)/0.1)_1px,transparent_1px)]
                                                                    bg-size-[1rem_1rem]"
                                ></div>
                                <NavigationMenuLink
                                  asChild
                                  className="z-20 relative"
                                >
                                  <Link
                                    href="/"
                                    className="flex h-full w-full select-none flex-col justify-end rounded-lg bg-linear-to-b from-muted/50 to-muted p-4 no-underline outline-none focus:shadow-md"
                                  >
                                    <h6 className="mb-2 mt-4 text-lg font-medium">
                                      All Features
                                    </h6>
                                    <p className="text-sm leading-tight text-muted-foreground">
                                      Manage links, track performance, and more.
                                    </p>
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            )}
                            {link.menu.map((menuItem) => (
                              <ListItem
                                key={menuItem.title}
                                title={menuItem.title}
                                href={menuItem.href}
                                icon={menuItem.icon}
                                onClick={handleLinkClick}
                              >
                                {menuItem.tagline}
                              </ListItem>
                            ))}
                          </ul>
                        </NavigationMenuContent>
                      </>
                    ) : (
                      <NavigationMenuLink asChild>
                        <Link
                          href={link.href}
                          className={cn(
                            navigationMenuTriggerStyle(),
                            "bg-transparent hover:bg-accent"
                          )}
                        >
                          {link.title}
                        </Link>
                      </NavigationMenuLink>
                    )}
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Desktop Actions - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-3 ml-8">
            <ThemeToggle />
            <div className="flex items-center gap-x-4">
              <SignedIn>
                <Link
                  href="/dashboard"
                  className={buttonVariants({ size: "sm", variant: "ghost" })}
                >
                  Dashboard
                </Link>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <Link
                  href="/auth/sign-in"
                  className={buttonVariants({ size: "sm", variant: "ghost" })}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/sign-up"
                  className={buttonVariants({ size: "sm" })}
                >
                  Get Started
                  <ZapIcon className="size-3.5 ml-1.5 text-orange-500 fill-orange-500" />
                </Link>
              </SignedOut>
            </div>
          </div>

          {/* Mobile Menu Trigger - Visible only on mobile */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label="Open navigation menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-[280px] sm:w-[320px] bg-background border-r border-border"
              >
                {/* Mobile Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                  <Link href="/#home" onClick={handleLinkClick}>
                    <span className="text-lg font-bold font-heading leading-none!">
                      AiConnect
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label="Close navigation menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Navigation */}
                <nav className="py-6">
                  <ul className="space-y-2 px-4">
                    {NAV_LINKS.map((link) => (
                      <li key={link.title}>
                        {link.menu ? (
                          <div className="space-y-1">
                            <button
                              type="button"
                              className="w-full flex items-center justify-between w-full p-3 text-left rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                              aria-expanded="false"
                            >
                              <span className="font-medium">{link.title}</span>
                              <svg
                                className="w-4 h-4 transform transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                            <ul className="ml-4 space-y-1 mt-1">
                              {link.menu.map((menuItem) => (
                                <ListItem
                                  key={menuItem.title}
                                  title={menuItem.title}
                                  href={menuItem.href}
                                  icon={menuItem.icon}
                                  onClick={handleLinkClick}
                                  mobile
                                >
                                  {menuItem.tagline}
                                </ListItem>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <Link
                            href={link.href}
                            onClick={handleLinkClick}
                            className="flex items-center w-full p-3 text-left rounded-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-muted-foreground hover:text-foreground"
                          >
                            <span className="font-medium">{link.title}</span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>

                {/* Mobile Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-background">
                  <div className="space-y-3">
                    <SignedIn>
                      <div className="space-y-2">
                        <Link
                          href="/dashboard"
                          onClick={handleLinkClick}
                          className={buttonVariants({
                            variant: "outline",
                            className: "w-full",
                          })}
                        >
                          Dashboard
                        </Link>
                        <div className="flex justify-center p-2">
                          <UserButton />
                        </div>
                      </div>
                    </SignedIn>
                    <SignedOut>
                      <div className="space-y-2">
                        <Link
                          href="/auth/sign-in"
                          onClick={handleLinkClick}
                          className={buttonVariants({
                            variant: "outline",
                            className: "w-full",
                          })}
                        >
                          Sign In
                        </Link>
                        <Link
                          href="/auth/sign-up"
                          onClick={handleLinkClick}
                          className={buttonVariants({
                            className: "w-full",
                          })}
                        >
                          Get Started
                          <ZapIcon className="size-3.5 ml-1.5 text-orange-500 fill-orange-500" />
                        </Link>
                      </div>
                    </SignedOut>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </MaxWidthWrapper>
      </AnimationContainer>
    </header>
  );
};

// Enhanced ListItem component with mobile support
const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { 
    title: string; 
    icon: LucideIcon;
    onClick?: () => void;
    mobile?: boolean;
  }
>(({ className, title, href, icon: Icon, children, onClick, mobile, ...props }, ref) => {
  return (
    <li>
      <Link
        href={href!}
        ref={ref}
        onClick={onClick}
        className={cn(
          "block select-none space-y-1 rounded-lg p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
          mobile && "text-sm",
          className
        )}
        {...props}
      >
        <div className="flex items-center space-x-2 text-foreground">
          <Icon className="h-4 w-4" />
          <h6 className="text-sm font-medium leading-none!">{title}</h6>
        </div>
        <p
          title={children! as string}
          className="line-clamp-2 text-sm leading-snug text-muted-foreground"
        >
          {children}
        </p>
      </Link>
    </li>
  );
});

ListItem.displayName = "ListItem";

export default ResponsiveNavbar;