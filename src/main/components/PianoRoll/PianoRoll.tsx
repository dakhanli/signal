import useComponentSize from "@rehooks/component-size"
import { useObserver } from "mobx-react-lite"
import React, { FC, useCallback, useEffect, useRef } from "react"
import SplitPane from "react-split-pane"
import styled from "styled-components"
import { NoteCoordTransform } from "../../../common/transform"
import { isTouchPadEvent } from "../../helpers/touchpad"
import { useStores } from "../../hooks/useStores"
import { useTheme } from "../../hooks/useTheme"
import ControlPane from "../ControlPane/ControlPane"
import { HorizontalScaleScrollBar } from "../inputs/ScaleScrollBar"
import { VerticalScrollBar } from "../inputs/ScrollBar"
import { PianoRollStage } from "./PianoRollStage"

const WHEEL_SCROLL_RATE = 1 / 120

const Parent = styled.div`
  flex-grow: 1;
  background: var(--background-color);
  position: relative;

  .ScrollBar {
    z-index: 10;
  }
`

const Alpha = styled.div`
  flex-grow: 1;
  position: relative;
  overflow: hidden;

  .alphaContent {
    position: absolute;
    top: 0;
    left: 0;
  }
`

const Beta = styled.div`
  border-top: 1px solid var(--divider-color);
  height: calc(100% - 17px);
`

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const StyledSplitPane = styled(SplitPane)`
  .Resizer {
    background: #000;
    opacity: 0.2;
    z-index: 1;
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    -moz-background-clip: padding;
    -webkit-background-clip: padding;
    background-clip: padding-box;
  }

  .Resizer:hover {
    transition: all 0.2s ease;
  }

  .Resizer.horizontal {
    height: 11px;
    margin: -5px 0;
    border-top: 5px solid rgba(255, 255, 255, 0);
    border-bottom: 5px solid rgba(255, 255, 255, 0);
    cursor: row-resize;
    width: 100%;
  }

  .Resizer.horizontal:hover {
    border-top: 5px solid rgba(255, 255, 255, 0.5);
    border-bottom: 5px solid rgba(255, 255, 255, 0.5);
  }

  .Resizer.vertical {
    width: 11px;
    margin: 0 -5px;
    border-left: 5px solid rgba(255, 255, 255, 0);
    border-right: 5px solid rgba(255, 255, 255, 0);
    cursor: col-resize;
  }

  .Resizer.vertical:hover {
    border-left: 5px solid rgba(255, 255, 255, 0.5);
    border-right: 5px solid rgba(255, 255, 255, 0.5);
  }

  .Resizer.disabled {
    cursor: not-allowed;
  }

  .Resizer.disabled:hover {
    border-color: transparent;
  }
`

const PianoRollWrapper: FC = () => {
  const rootStore = useStores()
  const {
    trackEndTick,
    isPlaying,
    playerPosition,
    scaleX,
    scrollLeft,
    scrollTop,
    autoScroll,
    s,
  } = useObserver(() => ({
    trackEndTick: rootStore.song.endOfSong,
    isPlaying: rootStore.services.player.isPlaying,
    playerPosition: rootStore.services.player.position,
    s: rootStore.pianoRollStore,
    scaleX: rootStore.pianoRollStore.scaleX,
    scrollLeft: rootStore.pianoRollStore.scrollLeft,
    scrollTop: rootStore.pianoRollStore.scrollTop,
    autoScroll: rootStore.pianoRollStore.autoScroll,
  }))

  const ref = useRef(null)
  const size = useComponentSize(ref)

  const theme = useTheme()
  const transform = new NoteCoordTransform(0.1 * scaleX, theme.keyHeight, 127)

  useEffect(() => {
    // keep scroll position to cursor
    if (autoScroll && isPlaying) {
      const x = transform.getX(playerPosition)
      const screenX = x - scrollLeft
      if (screenX > size.width * 0.7 || screenX < 0) {
        s.scrollLeft = x
      }
    }
  }, [
    autoScroll,
    isPlaying,
    scaleX,
    scrollLeft,
    playerPosition,
    size,
    transform,
    s,
  ])

  const setScrollLeft = useCallback((v) => (s.scrollLeft = v), [s])
  const setScrollTop = useCallback((v) => (s.scrollTop = v), [s])
  const onClickScaleUp = useCallback(() => (s.scaleX = scaleX + 0.1), [
    scaleX,
    s,
  ])
  const onClickScaleDown = useCallback(
    () => (s.scaleX = Math.max(0.05, scaleX - 0.1)),
    [scaleX, s]
  )
  const onClickScaleReset = useCallback(() => (s.scaleX = 1), [s])

  const startTick = scrollLeft / transform.pixelsPerTick
  const widthTick = transform.getTicks(size.width)
  const endTick = startTick + widthTick

  const contentWidth = Math.max(trackEndTick, endTick) * transform.pixelsPerTick
  const contentHeight = transform.getMaxY()

  const alphaRef = useRef(null)
  const { height: alphaHeight = 0 } = useComponentSize(alphaRef)

  const clampScrollLeft = (scroll: number) =>
    Math.floor(clamp(scroll, 0, contentWidth - size.width))

  const clampScrollTop = (scroll: number) =>
    Math.floor(clamp(scroll, 0, contentHeight - alphaHeight))

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      let deltaY = e.deltaY
      if (!isTouchPadEvent(e.nativeEvent)) {
        deltaY = e.deltaY * transform.pixelsPerKey * WHEEL_SCROLL_RATE
      }
      const scrollY = scrollTop + deltaY
      setScrollTop(clampScrollTop(scrollY))

      const deltaX = e.deltaX
      const scrollX = scrollLeft + deltaX
      setScrollLeft(clampScrollLeft(scrollX))
    },
    [scrollTop, setScrollTop, transform]
  )

  const _scrollLeft = clampScrollLeft(scrollLeft)
  const _scrollTop = clampScrollTop(scrollTop)

  return (
    <Parent ref={ref}>
      <StyledSplitPane split="horizontal" minSize={50} defaultSize={"60%"}>
        <Alpha onWheel={onWheel} ref={alphaRef}>
          <PianoRollStage width={size.width} />
          <VerticalScrollBar
            scrollOffset={_scrollTop}
            contentLength={contentHeight}
            onScroll={setScrollTop}
          />
        </Alpha>
        <Beta>
          <ControlPane />
        </Beta>
      </StyledSplitPane>
      <HorizontalScaleScrollBar
        scrollOffset={_scrollLeft}
        contentLength={contentWidth}
        onScroll={setScrollLeft}
        onClickScaleUp={onClickScaleUp}
        onClickScaleDown={onClickScaleDown}
        onClickScaleReset={onClickScaleReset}
      />
    </Parent>
  )
}

export default PianoRollWrapper
