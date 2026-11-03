import { useMemo, useRef, useState, type Dispatch, type PointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { defenceView, fitViewToAspect, FULL_VIEW, type Point, type Rect } from '../engine/court'
import { analyseDefence, BLOCK_SIZES, DEFAULT_BLOCK_SIZE, type BlockSize } from '../engine/defence'
import { appendPenPoint, isMeaningfulStroke } from '../engine/drawing'
import { useAnimatedViewBox } from '../hooks/useAnimatedViewBox'
import { useElementAspect } from '../hooks/useElementAspect'
import {
  blockersOf,
  isBlocker,
  suggestedDefence,
  type BoardAction,
  type BoardIcon,
  type BoardState,
  type Drawing,
} from '../state/boardState'
import { BoardIconView } from './BoardIconView'
import { Court } from './Court'
import { BlockerHands, DefenceOverlay } from './DefenceOverlay'
import { DefenderGhosts } from './DefenderGhosts'
import { DrawLayer } from './DrawLayer'

/** Zone labels in present mode, relative to normal. */
const PRESENT_LABEL_SCALE = 1.4

const SIZE_OPTIONS: { size: BlockSize; letter: string }[] = [
  { size: 'large', letter: 'L' },
  { size: 'medium', letter: 'M' },
  { size: 'small', letter: 'S' },
]

/** Pointer travel (CSS px) below which a press counts as a tap rather than a drag. */
const TAP_SLOP_PX = 6

interface Drag {
  id: string
  /** Offset from the pointer to the icon centre, so icons don't jump under the finger. */
  offset: Point
  startClient: Point
  moved: boolean
}

interface TacticBoardProps {
  state: BoardState
  dispatch: Dispatch<BoardAction>
  /** Shown to a player at arm's length: zone labels are drawn larger. */
  presenting?: boolean
  /** Open the 3D view from one of our defenders. */
  onViewFrom?: (id: string) => void
}

export function TacticBoard({ state, dispatch, presenting = false, onViewFrom }: TacticBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  // Keyed by pointerId so several fingers can drag different icons at once.
  const drags = useRef(new Map<number, Drag>())
  const [draggingIds, setDraggingIds] = useState<string[]>([])
  // One stroke at a time; extra fingers are ignored while drawing.
  const [draft, setDraft] = useState<Drawing | null>(null)
  const draftPointer = useRef<number | null>(null)
  // Our player whose tap menu is open: block size for blockers, 3D view for defenders.
  const [pickerId, setPickerId] = useState<string | null>(null)
  const isDrawing = state.tool !== 'move'

  const aspect = useElementAspect(svgRef)
  const hitter = state.icons.find(icon => icon.id === state.hitterId)
  const target =
    state.zoom === 'defence' && hitter
      ? fitViewToAspect(defenceView(hitter), aspect, 'bottom')
      : fitViewToAspect(FULL_VIEW, aspect, 'center')
  // Hold the view still while dragging; a moving view under the pointer would feed back into the drag.
  const settledTarget = useRef<Rect>(target)
  if (draggingIds.length === 0) settledTarget.current = target
  const view = useAnimatedViewBox(settledTarget.current)

  const blockers = useMemo(() => blockersOf(state.icons), [state.icons])
  const analysis = useMemo(
    () => (hitter && state.showShadow ? analyseDefence({ hitter, blockers }) : null),
    [hitter, blockers, state.showShadow],
  )
  const pickerIcon = state.icons.find(icon => icon.id === pickerId && isBlocker(icon))
  const viewIcon = onViewFrom ? state.icons.find(icon => icon.id === pickerId && icon.kind === 'home' && !isBlocker(icon)) : undefined

  const manualDefenders = state.autoDefence !== 'off'
    ? state.icons.filter(icon => state.manual.includes(icon.id) && icon.kind === 'home' && !isBlocker(icon))
    : []
  const hasGhosts = manualDefenders.length > 0
  const suggestions = useMemo(() => (hasGhosts ? suggestedDefence(state) : new Map()), [state, hasGhosts])

  function toBoardPoint(e: PointerEvent): Point | null {
    const ctm = svgRef.current?.getScreenCTM()
    if (!ctm) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }

  function syncDragging() {
    setDraggingIds([...drags.current.values()].map(d => d.id))
  }

  function handleIconPointerDown(e: PointerEvent<SVGGElement>, icon: BoardIcon) {
    const p = toBoardPoint(e)
    if (!p || [...drags.current.values()].some(d => d.id === icon.id)) return
    e.preventDefault()
    svgRef.current?.setPointerCapture(e.pointerId)
    drags.current.set(e.pointerId, {
      id: icon.id,
      offset: { x: icon.x - p.x, y: icon.y - p.y },
      startClient: { x: e.clientX, y: e.clientY },
      moved: false,
    })
    syncDragging()
  }

  function handleBoardPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (state.tool === 'move' || draftPointer.current !== null) return
    const p = toBoardPoint(e)
    if (!p) return
    e.preventDefault()
    svgRef.current?.setPointerCapture(e.pointerId)
    draftPointer.current = e.pointerId
    setDraft({ id: `d${Date.now()}-${e.pointerId}`, kind: state.tool, points: [p] })
  }

  function updateDraft(e: PointerEvent<SVGSVGElement>) {
    const p = toBoardPoint(e)
    if (!p) return
    // Arrow: keep the tail, move the head. Pen: add a sample.
    setDraft(d => d && { ...d, points: d.kind === 'arrow' ? [d.points[0], p] : appendPenPoint(d.points, p) })
  }

  function finishDraft(e: PointerEvent<SVGSVGElement>, keep: boolean) {
    if (draftPointer.current !== e.pointerId) return false
    draftPointer.current = null
    if (keep && draft && isMeaningfulStroke(draft.points)) dispatch({ type: 'addDrawing', drawing: draft })
    setDraft(null)
    return true
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (draftPointer.current === e.pointerId) return updateDraft(e)
    const drag = drags.current.get(e.pointerId)
    if (!drag) return
    if (!drag.moved) {
      const travel = Math.hypot(e.clientX - drag.startClient.x, e.clientY - drag.startClient.y)
      if (travel < TAP_SLOP_PX) return
      drag.moved = true
      setPickerId(null)
    }
    const p = toBoardPoint(e)
    if (!p) return
    dispatch({ type: 'move', id: drag.id, to: { x: p.x + drag.offset.x, y: p.y + drag.offset.y } })
  }

  function handlePointerUp(e: PointerEvent<SVGSVGElement>) {
    if (finishDraft(e, true)) return
    const drag = drags.current.get(e.pointerId)
    if (!drag) return
    const icon = state.icons.find(i => i.id === drag.id)
    if (drag.moved) dispatch({ type: 'drop', id: drag.id })
    // Tapping one of our players opens their menu; tapping an opponent makes them the hitter.
    else if (icon?.kind === 'home') setPickerId(id => (id === icon.id ? null : icon.id))
    else dispatch({ type: 'setHitter', id: drag.id })
    drags.current.delete(e.pointerId)
    syncDragging()
  }

  function handlePointerCancel(e: PointerEvent<SVGSVGElement>) {
    if (finishDraft(e, false)) return
    const drag = drags.current.get(e.pointerId)
    if (!drag) return
    if (drag.moved) dispatch({ type: 'drop', id: drag.id })
    drags.current.delete(e.pointerId)
    syncDragging()
  }

  // Paint order: players, then the ball, with anything being dragged on top.
  const ordered = [...state.icons].sort(
    (a, b) => paintRank(a, draggingIds) - paintRank(b, draggingIds),
  )

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        preserveAspectRatio="xMidYMid meet"
        className={cn('h-full w-full touch-none select-none', isDrawing && 'cursor-crosshair')}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        role="img"
        aria-label="Volleyball tactic board"
      >
        <Court />
        {analysis && <DefenceOverlay analysis={analysis} hitView={state.hitView} labelScale={presenting ? PRESENT_LABEL_SCALE : 1} />}
        <BlockerHands blockers={blockers} />
        <DefenderGhosts defenders={manualDefenders} suggestions={suggestions} />
        <DrawLayer drawings={state.drawings} draft={draft} />
        {/* While drawing, strokes can start on top of players without grabbing them. */}
        <g pointerEvents={isDrawing ? 'none' : undefined}>
          {ordered.map(icon => (
            <BoardIconView
              key={icon.id}
              icon={icon}
              isHitter={icon.id === state.hitterId}
              isDragging={draggingIds.includes(icon.id)}
              blockSize={isBlocker(icon) ? (icon.blockSize ?? DEFAULT_BLOCK_SIZE) : undefined}
              onPointerDown={handleIconPointerDown}
            />
          ))}
        </g>
      </svg>
      {viewIcon && onViewFrom && (
        <Popover at={toClient(svgRef.current, viewIcon)} onClose={() => setPickerId(null)}>
          <button
            type="button"
            onClick={() => {
              setPickerId(null)
              onViewFrom(viewIcon.id)
            }}
            className="flex h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <EyeIcon />
            View from {viewIcon.label}
          </button>
        </Popover>
      )}
      {pickerIcon && (
        <BlockSizePicker
          at={toClient(svgRef.current, pickerIcon)}
          value={pickerIcon.blockSize ?? DEFAULT_BLOCK_SIZE}
          label={pickerIcon.label}
          onPick={size => {
            dispatch({ type: 'setBlockSize', id: pickerIcon.id, size })
            setPickerId(null)
          }}
          onClose={() => setPickerId(null)}
        />
      )}
    </div>
  )
}

/** Floating menu just above one of our players; tap anywhere else to close. */
function Popover({ at, onClose, children }: { at: { x: number; y: number }; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-xl border border-border bg-surface-elevated p-1 shadow-lg"
        // Kept on screen when the player is near a sideline.
        style={{ left: `clamp(5.5rem, ${at.x}px, calc(100% - 5.5rem))`, top: at.y - 28 }}
      >
        {children}
      </div>
    </>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** A board point in CSS px relative to the board's top-left corner. */
function toClient(svg: SVGSVGElement | null, p: { x: number; y: number }) {
  const ctm = svg?.getScreenCTM()
  const box = svg?.getBoundingClientRect()
  if (!ctm || !box) return { x: 0, y: 0 }
  const q = new DOMPoint(p.x, p.y).matrixTransform(ctm)
  return { x: q.x - box.left, y: q.y - box.top }
}

/** Large / medium / small, floating just above the tapped blocker (over the opponent's side). */
function BlockSizePicker({
  at,
  value,
  label,
  onPick,
  onClose,
}: {
  at: { x: number; y: number }
  value: BlockSize
  label: string
  onPick: (size: BlockSize) => void
  onClose: () => void
}) {
  return (
    <Popover at={at} onClose={onClose}>
      <div role="radiogroup" aria-label={`Block size for player ${label}`} className="flex items-center gap-1">
        {SIZE_OPTIONS.map(({ size, letter }) => (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={value === size}
            aria-label={`${size} block`}
            title={`${size[0].toUpperCase()}${size.slice(1)}: ${BLOCK_SIZES[size].width} m hands, ${
              BLOCK_SIZES[size].reach === Infinity ? 'shadow to the end line' : `shadow ${BLOCK_SIZES[size].reach} m deep`
            }`}
            onClick={() => onPick(size)}
            className={cn(
              'flex h-11 w-12 flex-col items-center justify-center rounded-lg text-base font-bold leading-none',
              value === size ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
            )}
          >
            {letter}
            <span className="mt-0.5 text-[10px] font-medium opacity-80">
              {BLOCK_SIZES[size].reach === Infinity ? 'full' : `${BLOCK_SIZES[size].reach}m`}
            </span>
          </button>
        ))}
      </div>
    </Popover>
  )
}

function paintRank(icon: BoardIcon, draggingIds: string[]) {
  if (draggingIds.includes(icon.id)) return 2
  return icon.kind === 'ball' ? 1 : 0
}
