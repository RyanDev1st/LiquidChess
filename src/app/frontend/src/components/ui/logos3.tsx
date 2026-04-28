"use client";

import AutoScroll from "embla-carousel-auto-scroll";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

interface Logo {
  id: string;
  description: string;
  image: string;
  className?: string;
}

interface Logos3Props {
  heading?: string;
  logos?: Logo[];
  className?: string;
}

const Logos3 = ({
  heading = "Trusted by leagues, casters, creators",
  logos = [
    { id: "logo-1", description: "Chess.com", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Chess.com_Logo.svg/320px-Chess.com_Logo.svg.png", className: "h-7 w-auto opacity-60 hover:opacity-100 transition-opacity filter invert" },
    { id: "logo-2", description: "Lichess", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Lichess_Logo_2019.svg/240px-Lichess_Logo_2019.svg.png", className: "h-7 w-auto opacity-60 hover:opacity-100 transition-opacity filter invert" },
    { id: "logo-3", description: "Twitch", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Twitch_logo.svg/240px-Twitch_logo.svg.png", className: "h-6 w-auto opacity-60 hover:opacity-100 transition-opacity filter invert" },
    { id: "logo-4", description: "YouTube", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/240px-YouTube_full-color_icon_%282017%29.svg.png", className: "h-7 w-auto opacity-60 hover:opacity-100 transition-opacity" },
    { id: "logo-5", description: "FIDE", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/FIDE_logo.svg/240px-FIDE_logo.svg.png", className: "h-7 w-auto opacity-60 hover:opacity-100 transition-opacity filter invert" },
    { id: "logo-6", description: "Discord", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Discord_logo.svg/240px-Discord_logo.svg.png", className: "h-6 w-auto opacity-60 hover:opacity-100 transition-opacity filter invert" },
    { id: "logo-7", description: "Kick", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Kick_streamer_icon.svg/240px-Kick_streamer_icon.svg.png", className: "h-7 w-auto opacity-60 hover:opacity-100 transition-opacity filter invert" },
    { id: "logo-8", description: "Reddit", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Reddit_logo.svg/240px-Reddit_logo.svg.png", className: "h-7 w-auto opacity-60 hover:opacity-100 transition-opacity" },
  ],
}: Logos3Props) => {
  return (
    <div className="w-full">
      <p className="text-center text-xs font-medium uppercase tracking-widest text-white/40 mb-8">
        {heading}
      </p>
      <div className="relative">
        <Carousel opts={{ loop: true }} plugins={[AutoScroll({ playOnInit: true, speed: 1 })]}>
          <CarouselContent className="ml-0">
            {logos.map((logo) => (
              <CarouselItem key={logo.id} className="flex basis-1/4 justify-center pl-0 sm:basis-1/5 md:basis-1/6 lg:basis-1/8">
                <div className="mx-8 flex shrink-0 items-center justify-center">
                  <img src={logo.image} alt={logo.description} className={logo.className} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0a0a0a]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0a0a0a]" />
      </div>
    </div>
  );
};

export { Logos3 };
