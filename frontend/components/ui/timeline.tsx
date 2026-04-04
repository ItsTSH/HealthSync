"use client";
import React, { useEffect, useRef, useState } from "react";

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  return (
    <div className="bg-card font-sans scale-90 md:px-10 h-full" ref={containerRef}>
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {data.map((item, index) => (
          <div key={index} className="flex justify-start pt-10 md:pt-40 md:gap-10">
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm">
              <div className="h-8 absolute w-8 rounded-full bg-white dark:bg-black flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-2" />
              </div>
              <h3 className="hidden md:block text-xl md:pl-18 md:text-4xl font-bold text-muted-foreground ">
                {item.title}
              </h3>
            </div>

            <div className="relative w-full size-20">
              <h3 className="md:hidden block text-4xl mb-4 text-left font-bold text-muted-foreground">
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}

        {/* STATIC FULL-HEIGHT GRADIENT LINE */}
        <div
          style={{ height: height + "px" }}
          className="
            absolute md:left-4 left-4 top-0 scale-90
            w-[2px] 
            bg-gradient-to-b 
            from-transparent 
            via-neutral-300 dark:via-neutral-700 
             to-transparent
            [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]
          "
        >
          {/* FULL COLORED GRADIENT LINE (NO ANIMATION) */}
          <div
            className="
              absolute inset-x-0 top-0 
              w-[2px] h-full 
              bg-gradient-to-b 
              from-purple-500 
              via-blue-500 
              to-transparent
              rounded-full
            "
          />
        </div>
      </div>
    </div>
  );
};
