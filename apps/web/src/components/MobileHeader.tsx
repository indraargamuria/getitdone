import { MenuIcon, SearchIcon, StampIcon } from "./icons";

export function MobileHeader({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-rule bg-paper/85 px-3 py-2.5 backdrop-blur-md md:hidden">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="grid size-9 cursor-pointer place-items-center rounded-xl text-inkdim transition-colors hover:bg-card hover:text-ink"
      >
        <MenuIcon className="size-5" />
      </button>
      <div className="flex items-center gap-1.5">
        <span className="grid size-7 place-items-center rounded-lg bg-accent text-card3">
          <StampIcon className="size-4" strokeWidth={2} />
        </span>
        <span className="font-display text-base italic font-semibold text-ink">
          Get It <span className="text-accent">Done</span>
        </span>
      </div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onSearch}
        aria-label="Search"
        className="grid size-9 cursor-pointer place-items-center rounded-xl text-inkdim transition-colors hover:bg-card hover:text-ink"
      >
        <SearchIcon className="size-5" />
      </button>
    </header>
  );
}
