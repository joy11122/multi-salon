const galleryItems = [
  {
    title: 'Precision in every detail',
    category: 'THE CRAFT',
    image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1500&q=88',
    layout: 'lg:col-span-7 lg:row-span-2 min-h-[420px] lg:min-h-[650px]',
    position: 'center',
  },
  {
    title: 'The modern gentleman',
    category: 'THE EXPERIENCE',
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=88',
    layout: 'lg:col-span-5 min-h-[300px]',
    position: 'center',
  },
  {
    title: 'A ritual, refined',
    category: 'THE DETAILS',
    image: 'https://images.unsplash.com/photo-1507257578-f6e7b9a7f3d6?auto=format&fit=crop&w=1200&q=88',
    layout: 'lg:col-span-5 min-h-[300px]',
    position: 'center',
  },
  {
    title: 'Tools of the trade',
    category: 'THE CRAFT',
    image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=88',
    layout: 'lg:col-span-4 min-h-[320px]',
    position: 'center',
  },
  {
    title: 'The art of the cut',
    category: 'THE CRAFT',
    image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=1200&q=88',
    layout: 'lg:col-span-4 min-h-[320px]',
    position: 'center',
  },
  {
    title: 'Crafted with character',
    category: 'THE EXPERIENCE',
    image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=88',
    layout: 'lg:col-span-4 min-h-[320px]',
    position: 'center',
  },
  {
    title: 'The finishing touch',
    category: 'THE DETAILS',
    image: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1200&q=88',
    layout: 'lg:col-span-6 min-h-[360px]',
    position: 'center',
  },
  {
    title: 'Made for the occasion',
    category: 'THE EXPERIENCE',
    image: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=88',
    layout: 'lg:col-span-6 min-h-[360px]',
    position: 'center',
  },
];

export const metadata = {
  title: "Gallery | The Gentlemen's Club",
  description: "Explore the craft, details and atmosphere behind The Gentlemen's Club grooming experience.",
};

export default function GalleryPage() {
  return (
    <main className="overflow-hidden px-5 pb-24 pt-16 sm:px-8 md:pt-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-12 flex flex-col justify-between gap-7 border-b border-[#c6a15b]/20 pb-10 md:mb-16 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">THE DETAILS · THE CRAFT · THE EXPERIENCE</p>
            <h1 className="serif mt-5 text-4xl leading-[1.08] text-[#f5f1e8] sm:text-5xl md:text-6xl">
              A closer look at
              <span className="gold block italic">the craft.</span>
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-7 text-[#99938a] md:pb-1">
            More than a haircut. Discover the considered details, skilled hands and timeless atmosphere behind every visit.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          {galleryItems.map((item, index) => (
            <article
              key={item.title}
              className={`group relative isolate overflow-hidden border border-white/[0.07] bg-[#171717] ${item.layout}`}
              aria-label={item.title}
            >
              <div
                role="img"
                aria-label={item.title}
                className="absolute inset-0 bg-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
                style={{
                  backgroundImage: `url("${item.image}")`,
                  backgroundPosition: item.position,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/5 transition-opacity duration-500 group-hover:from-black/95" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6 lg:p-7">
                <div>
                  <p className="mb-2 text-[9px] font-medium uppercase tracking-[.24em] text-[#c6a15b]">{item.category}</p>
                  <h2 className="serif text-xl text-[#f5f1e8] sm:text-2xl">{item.title}</h2>
                </div>
                <span className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 text-xs text-[#f5f1e8] transition-all duration-300 group-hover:border-[#c6a15b] group-hover:bg-[#c6a15b] group-hover:text-[#0b0b0b]">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-[#c6a15b]/20 pt-9 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">YOUR NEXT CHAPTER</p>
            <p className="serif mt-2 text-2xl text-[#f5f1e8]">Make time for the finer details.</p>
          </div>
          <a href="/booking" className="gold-button inline-flex items-center justify-center px-7 py-4 text-[10px] font-semibold tracking-[.18em] transition-transform duration-300 hover:-translate-y-0.5">
            BOOK AN APPOINTMENT
          </a>
        </div>
      </div>
    </main>
  );
}
