"use client";

import { useState } from "react";

interface VoiceCard {
  id: string | number;
  image: string;
  name: string;
  role: string;
}

interface ExpandOnHoverProps {
  voices?: VoiceCard[];
}

const defaultVoices: VoiceCard[] = [
  { id: 1, image: "https://pbs.twimg.com/media/G6dpB9JaAAA2wDS?format=png&name=360x360", name: "Magnus", role: "Grandmaster" },
  { id: 2, image: "https://pbs.twimg.com/media/G6dpEiebIAEHrOS?format=jpg&name=360x360", name: "Hikaru", role: "Speedster" },
  { id: 3, image: "https://pbs.twimg.com/media/G6dpGJZbsAEg1tp?format=png&name=360x360", name: "Levy", role: "GothamChess" },
  { id: 4, image: "https://pbs.twimg.com/media/G6dpHzVbkAERJI3?format=png&name=360x360", name: "Anish", role: "Sharpshooter" },
  { id: 5, image: "https://pbs.twimg.com/media/G6dpKpcbgAAj7ce?format=png&name=360x360", name: "Judit", role: "Legend" },
  { id: 6, image: "https://pbs.twimg.com/media/G6dpNYzawAAniIt?format=png&name=360x360", name: "Danya", role: "Analyst" },
  { id: 7, image: "https://pbs.twimg.com/media/G6dpPilbcAAH3jU?format=jpg&name=360x360", name: "Vidit", role: "Tactician" },
  { id: 8, image: "https://pbs.twimg.com/media/G6dpRFBbsAEvquO?format=jpg&name=360x360", name: "Alireza", role: "Prodigy" },
  { id: 9, image: "https://pbs.twimg.com/media/G6dpUL-aUAAUqGZ?format=png&name=small", name: "Wesley", role: "Iron Man" },
];

const ExpandOnHover = ({ voices = defaultVoices }: ExpandOnHoverProps) => {
  const [expandedId, setExpandedId] = useState<number | string>(voices[Math.floor(voices.length / 2)]?.id || 1);

  return (
    <div className="relative w-full max-w-6xl px-5 mx-auto">
      <div className="flex w-full items-center justify-center gap-1">
        {voices.map((card) => {
          const isExpanded = card.id === expandedId;
          return (
            <div
              key={card.id}
              className="relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-500 ease-in-out"
              style={{
                width: isExpanded ? "22rem" : "4.5rem",
                height: "22rem",
                flexShrink: 0,
              }}
              onMouseEnter={() => setExpandedId(card.id)}
            >
              <img
                className="w-full h-full object-cover"
                src={card.image}
                alt={card.name}
                style={{
                  filter: isExpanded
                    ? "brightness(1.1) saturate(1.2)"
                    : "brightness(0.6) saturate(0.7) blur(2px)",
                  transition: "filter 0.5s ease, width 0.5s ease",
                }}
              />
              {isExpanded && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              )}
              {!isExpanded && (
                <div className="absolute inset-0 flex items-end justify-center pb-4">
                  <span
                    className="text-white/40 text-[10px] font-mono uppercase tracking-widest"
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                    }}
                  >
                    {card.name}
                  </span>
                </div>
              )}
              {isExpanded && (
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[--gold] text-xs font-mono uppercase tracking-widest mb-1">{card.role}</p>
                  <h3 className="text-white text-xl font-semibold">{card.name}</h3>
                </div>
              )}
              {isExpanded && (
                <div className="absolute inset-0 border border-[--gold]/20 rounded-2xl pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpandOnHover;
