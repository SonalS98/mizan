/**
 * The guided walk-through.
 *
 * Someone seeing this for the first time does not know what a kilowatt-peak is
 * or why a utility would cap the size of a solar system. So the page explains
 * itself: each step scrolls to one part of the screen, says in plain words what
 * they are looking at, and where it helps, changes an input so they watch the
 * answer move rather than being told it would.
 */

export type TourStep = {
  /** Element id to bring into view and outline. */
  target: string;
  title: string;
  body: string;
  /** Runs before the step is shown, to set the app up for it. */
  enter?: () => void;
};

let steps: TourStep[] = [];
let index = -1;
let lastFocus: HTMLElement | null = null;

const bar = () => document.getElementById("tour") as HTMLElement;

const clearFocus = () => {
  if (lastFocus) lastFocus.classList.remove("tour-focus");
  lastFocus = null;
};

const show = (next: number) => {
  if (next < 0 || next >= steps.length) return end();
  index = next;
  const step = steps[index];
  step.enter?.();

  clearFocus();
  const target = document.getElementById(step.target);
  if (target) {
    target.classList.add("tour-focus");
    lastFocus = target;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const host = bar();
  host.hidden = false;
  (host.querySelector("[data-tour-step]") as HTMLElement).textContent = `${index + 1} of ${steps.length}`;
  (host.querySelector("[data-tour-title]") as HTMLElement).textContent = step.title;
  (host.querySelector("[data-tour-body]") as HTMLElement).textContent = step.body;
  (host.querySelector("[data-tour-back]") as HTMLButtonElement).disabled = index === 0;
  (host.querySelector("[data-tour-next]") as HTMLButtonElement).textContent =
    index === steps.length - 1 ? "Done" : "Next";
};

export const end = () => {
  clearFocus();
  index = -1;
  bar().hidden = true;
};

export const startTour = (tourSteps: TourStep[]) => {
  steps = tourSteps;
  show(0);
};

export const initTour = (getSteps: () => TourStep[]) => {
  const host = bar();
  host.querySelector("[data-tour-next]")!.addEventListener("click", () => show(index + 1));
  host.querySelector("[data-tour-back]")!.addEventListener("click", () => show(index - 1));
  host.querySelector("[data-tour-close]")!.addEventListener("click", end);
  document.getElementById("tour-start")!.addEventListener("click", () => startTour(getSteps()));
  document.addEventListener("keydown", (event) => {
    if (host.hidden) return;
    if (event.key === "Escape") end();
    if (event.key === "ArrowRight") show(index + 1);
    if (event.key === "ArrowLeft") show(index - 1);
  });
};
