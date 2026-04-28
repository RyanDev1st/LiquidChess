import React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/hooks/use-scroll";

const WordmarkIcon = (props: React.ComponentProps<"svg">) => (
  <svg viewBox="0 0 120 28" fill="none" {...props}>
    <text x="0" y="22" fontFamily="Instrument Serif, serif" fontSize="22" fill="currentColor" fontStyle="italic">
      Liquid
    </text>
    <text x="68" y="22" fontFamily="Inter, sans-serif" fontSize="18" fill="currentColor" fontWeight="600">
      Chess
    </text>
    <circle cx="62" cy="14" r="2" fill="#c9a84c" />
  </svg>
);

const links = [
  { label: "Features", href: "#hero" },
  { label: "Voices", href: "#voices" },
  { label: "Demo", href: "#demo" },
  { label: "Pricing", href: "#" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);

  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header
      className={cn(
        "w-full z-50 mx-auto transition-all duration-300",
        scrolled
          ? "glass border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <nav className="flex h-14 w-full max-w-7xl mx-auto items-center justify-between px-6">
        <a href="#hero" className="flex items-center gap-2">
          <WordmarkIcon className="h-7 text-white" />
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              onClick={(e) => {
                const target = document.querySelector(link.href) as HTMLElement | null;
                if (target) {
                  e.preventDefault();
                  const container = document.querySelector(".snap-container") as HTMLElement | null;
                  if (container) container.scrollTop = target.offsetTop;
                  else target.scrollIntoView({ behavior: "instant" });
                }
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm">Sign In</Button>
          <Button size="sm" className="glass-gold border-[--gold]/30 text-[--gold] hover:bg-[--gold]/10">
            Get Started
          </Button>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => setOpen(!open)}
          className="md:hidden"
        >
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </Button>
      </nav>

      {open && (
        <div className="glass border-t border-white/10 fixed top-14 right-0 bottom-0 left-0 z-50 flex flex-col p-6 md:hidden">
          <div className="grid gap-2 mb-8">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={buttonVariants({ variant: "ghost", className: "justify-start text-lg" })}
                onClick={(e) => {
                  setOpen(false);
                  const target = document.querySelector(link.href) as HTMLElement | null;
                  if (target) {
                    e.preventDefault();
                    const container = document.querySelector(".snap-container") as HTMLElement | null;
                    if (container) container.scrollTop = target.offsetTop;
                  }
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3 mt-auto">
            <Button variant="outline" className="w-full">Sign In</Button>
            <Button className="w-full">Get Started</Button>
          </div>
        </div>
      )}
    </header>
  );
}
