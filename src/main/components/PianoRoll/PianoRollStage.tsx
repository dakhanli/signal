import { Container, Stage } from "@inlet/react-pixi"
import { useObserver } from "mobx-react-lite"
import { Point, Rectangle, settings } from "pixi.js"
import React, { FC, useCallback, useState } from "react"
import { IPoint } from "../../../common/geometry"
import { createBeatsInRange } from "../../../common/helpers/mapBeats"
import { getSelectionBounds } from "../../../common/selection/Selection"
import { NoteCoordTransform } from "../../../common/transform"
import { removeEvent } from "../../actions"
import { useContextMenu } from "../../hooks/useContextMenu"
import { useNoteTransform } from "../../hooks/useNoteTransform"
import { StoreContext, useStores } from "../../hooks/useStores"
import { useTheme } from "../../hooks/useTheme"
import { LeftTopSpace } from "./LeftTopSpace"
import { observeDoubleClick } from "./MouseHandler/observeDoubleClick"
import PencilMouseHandler from "./MouseHandler/PencilMouseHandler"
import SelectionMouseHandler from "./MouseHandler/SelectionMouseHandler"
import PianoCursor from "./PianoCursor"
import PianoGrid from "./PianoGrid"
import PianoKeys from "./PianoKeys"
import PianoLines from "./PianoLines"
import { isPianoNote } from "./PianoNotes/PianoNote"
import PianoNotes from "./PianoNotes/PianoNotes"
import PianoRuler from "./PianoRuler"
import PianoSelection from "./PianoSelection"
import { PianoSelectionContextMenu } from "./PianoSelectionContextMenu"

export interface PianoRollStageProps {
  width: number
}

export interface PianoNotesMouseEvent {
  pixiEvent: PIXI.InteractionEvent
  nativeEvent: MouseEvent
  tick: number
  noteNumber: number
  local: IPoint
  transform: NoteCoordTransform
}

export const PianoRollStage: FC<PianoRollStageProps> = ({ width }) => {
  const rootStore = useStores()
  const {
    trackId,
    ghostTrackIds,
    measures,
    playerPosition,
    timebase,
    mouseMode,
    scrollLeft,
    scrollTop,
    notesCursor,
    selection,
  } = useObserver(() => {
    const ghostTrackIds =
      rootStore.pianoRollStore.ghostTracks[rootStore.song.selectedTrackId] ?? []

    return {
      trackId: rootStore.song.selectedTrackId,
      ghostTrackIds,
      measures: rootStore.song.measures,
      playerPosition: rootStore.services.player.position,
      timebase: rootStore.services.player.timebase,
      mouseMode: rootStore.pianoRollStore.mouseMode,
      scrollLeft: rootStore.pianoRollStore.scrollLeft,
      scrollTop: rootStore.pianoRollStore.scrollTop,
      notesCursor: rootStore.pianoRollStore.notesCursor,
      selection: rootStore.pianoRollStore.selection,
    }
  })
  const transform = useNoteTransform()
  const theme = useTheme()

  const [pencilMouseHandler] = useState(new PencilMouseHandler(rootStore))
  const [selectionMouseHandler] = useState(new SelectionMouseHandler(rootStore))

  const stageHeight = transform.pixelsPerKey * transform.numberOfKeys
  const startTick = scrollLeft / transform.pixelsPerTick

  const mouseHandler =
    mouseMode === "pencil" ? pencilMouseHandler : selectionMouseHandler

  // MouseHandler で利用する追加情報をイベントに付加する
  const extendEvent = (e: PIXI.InteractionEvent): PianoNotesMouseEvent => {
    const local = {
      x: e.data.global.x - theme.keyWidth + scrollLeft,
      y: e.data.global.y - theme.rulerHeight + scrollTop,
    }
    return {
      pixiEvent: e,
      nativeEvent: e.data.originalEvent as MouseEvent,
      local,
      tick: transform.getTicks(local.x),
      noteNumber: Math.ceil(transform.getNoteNumber(local.y)),
      transform,
    }
  }

  const handleMouseDown = (e: PIXI.InteractionEvent) => {
    if (isPianoNote(e.target)) {
      const { item } = e.target
      observeDoubleClick(() => {
        removeEvent(rootStore)(item.id)
      })
    }

    mouseHandler.onMouseDown(extendEvent(e))
  }

  const handleMouseMove = (e: PIXI.InteractionEvent) => {
    if (
      mouseMode === "pencil" &&
      e.data.buttons === 2 &&
      isPianoNote(e.target)
    ) {
      removeEvent(rootStore)(e.target.item.id)
    }
    mouseHandler.onMouseMove(extendEvent(e))
  }

  const handleMouseUp = (e: PIXI.InteractionEvent) =>
    mouseHandler.onMouseUp(extendEvent(e))

  const mappedBeats = createBeatsInRange(
    measures,
    transform.pixelsPerTick,
    timebase,
    startTick,
    width
  )

  const cursorPositionX = transform.getX(playerPosition)
  const contentHeight = transform.getMaxY()

  const { onContextMenu, menuProps } = useContextMenu()

  const onRightClickSelection = useCallback(
    (ev: PIXI.InteractionEvent) => {
      ev.stopPropagation()
      const e = ev.data.originalEvent as MouseEvent
      onContextMenu(e)
    },
    [onContextMenu]
  )

  const handleRightClick = useCallback(
    (ev: PIXI.InteractionEvent) => {
      if (
        isPianoNote(ev.target) &&
        rootStore.pianoRollStore.mouseMode == "pencil"
      ) {
        removeEvent(rootStore)(ev.target.item.id)
      }
      if (rootStore.pianoRollStore.mouseMode === "selection") {
        const e = ev.data.originalEvent as MouseEvent
        ev.stopPropagation()
        onContextMenu(e)
      }
    },
    [rootStore, onContextMenu]
  )

  settings.ROUND_PIXELS = true

  return (
    <>
      <Stage
        className="alphaContent"
        width={width}
        height={stageHeight}
        options={{ transparent: true, autoDensity: true, antialias: true }}
        onContextMenu={useCallback((e) => e.preventDefault(), [])}
      >
        <StoreContext.Provider value={rootStore}>
          <Container position={new Point(-0.5, -0.5) /* prevent line blur */}>
            <Container position={new Point(theme.keyWidth, 0)}>
              <Container
                position={new Point(0, -scrollTop + theme.rulerHeight)}
              >
                <PianoLines
                  width={width}
                  pixelsPerKey={transform.pixelsPerKey}
                  numberOfKeys={transform.numberOfKeys}
                />
                <Container position={new Point(-scrollLeft, 0)}>
                  <Container interactive={false} hitArea={Rectangle.EMPTY}>
                    <PianoGrid height={contentHeight} beats={mappedBeats} />
                    {ghostTrackIds.map((id) => (
                      <PianoNotes
                        key={id}
                        trackId={id}
                        width={width}
                        isGhost={true}
                      />
                    ))}
                  </Container>
                  <Container
                    interactive={true}
                    hitArea={new Rectangle(0, 0, 100000, 100000)} // catch all hits
                    mousedown={handleMouseDown}
                    mousemove={handleMouseMove}
                    mouseup={handleMouseUp}
                    mouseupoutside={handleMouseUp}
                    rightclick={handleRightClick}
                    cursor={notesCursor}
                  >
                    <PianoNotes
                      trackId={trackId}
                      width={width}
                      isGhost={false}
                    />
                    {selection.enabled && (
                      <PianoSelection
                        bounds={getSelectionBounds(selection, transform)}
                        onRightClick={onRightClickSelection}
                      />
                    )}
                    <Container x={cursorPositionX}>
                      <PianoCursor height={contentHeight} />
                    </Container>
                  </Container>
                </Container>
              </Container>
              <PianoRuler
                width={width}
                beats={mappedBeats}
                scrollLeft={scrollLeft}
                pixelsPerTick={transform.pixelsPerTick}
              />
            </Container>
            <Container position={new Point(0, -scrollTop + theme.rulerHeight)}>
              <PianoKeys
                keyHeight={transform.pixelsPerKey}
                numberOfKeys={transform.numberOfKeys}
              />
            </Container>
            <LeftTopSpace width={width} />
          </Container>
        </StoreContext.Provider>
      </Stage>
      <PianoSelectionContextMenu {...menuProps} />
    </>
  )
}
