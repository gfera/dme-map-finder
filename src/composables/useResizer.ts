import { Ref, computed, reactive, ref } from "vue";
import {
  MaybeElementRef,
  MaybeRefOrGetter,
  PointerType,
  Position,
  defaultWindow,
  isClient,
  toRef,
  toValue,
  useElementSize,
  useEventListener,
  useMouseInElement,
} from "@vueuse/core";

type Size = {
  width: number;
  height: number;
};

type UseResizerOptions = {
  /**
   * Side to resize on.
   *
   * @default 'both'
   */
  side?: ("top" | "right" | "bottom" | "left")[];

  /**
   * Prevent events defaults
   *
   * @default false
   */
  preventDefault?: MaybeRefOrGetter<boolean>;

  /**
   * Prevent events propagation
   *
   * @default false
   */
  stopPropagation?: MaybeRefOrGetter<boolean>;

  /**
   * Whether dispatch events in capturing phase
   *
   * @default true
   */
  capture?: boolean;

  /**
   * If no handle is specified, calculate edge drag area.
   *
   * @default {x:"0.5rem", y:"0.5rem"}
   */
  margin?: { x?: number; y?: number };

  /**
   * Handle that triggers the drag event
   *
   * @default target
   */
  handle?: {
    top?: MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>;
    right?: MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>;
    bottom?: MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>;
    left?: MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>;
  };

  /**
   * Pointer types that listen to.
   *
   * @default ['mouse', 'touch', 'pen']
   */
  pointerTypes?: PointerType[];

  /**
   * Callback when the dragging starts. Return `false` to prevent dragging.
   */
  onStart?: (position: Size, event: PointerEvent) => void | false;

  /**
   * Callback during dragging.
   */
  onMove?: (position: Size, event: PointerEvent) => void;

  /**
   * Callback when dragging end.
   */
  onEnd?: (position: Size, event: PointerEvent) => void;
};
export const useResizer = (
  target: Ref<HTMLElement>,
  {
    capture,
    handle,
    onEnd,
    onMove,
    onStart,
    pointerTypes,
    preventDefault,
    side,
    margin,
    stopPropagation,
  }: UseResizerOptions
) => {
  const mouse = reactive(useMouseInElement(target));
  const size = reactive(useElementSize(target));
  const initialSize = reactive({ width: 0, height: 0 });
  const resizing = ref(false);
  const started = ref(false);
  const dragStart = reactive<Position>({ x: 0, y: 0 });

  const filterEvent = (e: PointerEvent) => {
    if (pointerTypes)
      return pointerTypes.includes(e.pointerType as PointerType);
    return true;
  };

  const handleEvent = (e: PointerEvent) => {
    if (toValue(preventDefault)) e.preventDefault();
    if (toValue(stopPropagation)) e.stopPropagation();
  };

  const getSide = (e: PointerEvent) => {
    let axis: "horizontal" | "vertical" | "both" = "both";
    if (handle) {
      axis &&=
        e.target === handle.right || e.target === handle.left
          ? "horizontal"
          : null;
      axis &&=
        e.target === handle.top || e.target === handle.bottom
          ? "vertical"
          : null;
    } else {
    }
  };
  const isDraggingHandle = (target: any) => {
    return target === toValue(handle.right);
  };

  const start = (e: PointerEvent) => {
    if (!filterEvent(e)) return;
    if (e.target !== toValue(target) && !isDraggingHandle(e.target)) return;
    started.value = true;
    dragStart.x = mouse.x;
    dragStart.y = mouse.y;
    initialSize.width = size.width;
    initialSize.height = size.height;

    if (onStart?.(size, e) === false) return;
    handleEvent(e);
  };
  const move = (e: PointerEvent) => {
    if (!started.value) return;
    if (!filterEvent(e)) return;
    if (!dragStart.x || !dragStart.y) return;
    resizing.value = true;

    // resize according to the sides
    const dx = mouse.x - dragStart.x;
    target.value.style.width = `${initialSize.width + dx}px`;

    onMove?.(size, e);
    handleEvent(e);
  };
  const end = (e: PointerEvent) => {
    if (!filterEvent(e)) return;
    if (!dragStart.x || !dragStart.y) return;
    resizing.value = false;
    started.value = false;

    onEnd?.(size, e);
    handleEvent(e);
  };

  if (isClient) {
    const config = { capture: capture ?? true };
    useEventListener(defaultWindow, "pointerdown", start, config);
    useEventListener(defaultWindow, "pointermove", move, config);
    useEventListener(defaultWindow, "pointerup", end, config);
  }

  return {
    ...toRef(size),
    size,
    isResizing: computed(() => resizing.value),
  };
};
