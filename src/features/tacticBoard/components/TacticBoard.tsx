import { useMemo, useRef, useState, type Dispatch, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { defenceView, fitViewToAspect, FULL_VIEW, type Point, type Rect } from '../engine/court'
import { analyseDefence } from '../engine/defence'
import { appendPenPoint, isMeaningfulStroke } from '../engine/drawing'
import { useAnimatedViewBox } from '../hooks/useAnimatedViewBox'
import { useElementAspect } from '../hooks/useElementAspect'
import {
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
}

export function TacticBoard({ state, dispatch }: TacticBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  // Keyed by pointerId so several fingers can drag different icons at once.
  const drags = useRef(new Map<number, Drag>())
  const [draggingIds, setDraggingIds] = useState<string[]>([])
  // One stroke at a time; extra fingers are ignored while drawing.
  const [draft, setDraft] = useState<Drawing | null>(null)
  const draftPointer = useRef<number | null>(null)
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

  const blockerXs = useMemo(() => state.icons.filter(isBlocker).map(icon => icon.x), [state.icons])
  const analysis = useMemo(
    () => (hitter && state.showShadow ? analyseDefence({ hitter, blockerXs }) : null),
    [hitter, blockerXs, state.showShadow],
  )

  const manualDefenders = state.autoDefence
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
    }
    const p = toBoardPoint(e)
    if (!p) return
    dispatch({ type: 'move', id: drag.id, to: { x: p.x + drag.offset.x, y: p.y + drag.offset.y } })
  }

  function handlePointerUp(e: PointerEvent<SVGSVGElement>) {
    if (finishDraft(e, true)) return
    const drag = drags.current.get(e.pointerId)
    if (!drag) return
    // Tapping an opponent makes them the hitter; the reducer ignores taps on anyone else.
    dispatch(drag.moved ? { type: 'drop', id: drag.id } : { type: 'setHitter', id: drag.id })
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
      {analysis && <DefenceOverlay analysis={analysis} hitView={state.hitView} />}
      <BlockerHands blockerXs={blockerXs} />
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
            onPointerDown={handleIconPointerDown}
          />
        ))}
      </g>
    </svg>
  )
}

function paintRank(icon: BoardIcon, draggingIds: string[]) {
  if (draggingIds.includes(icon.id)) return 2
  return icon.kind === 'ball' ? 1 : 0
}
